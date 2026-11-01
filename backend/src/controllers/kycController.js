const diditService = require('../services/diditService');
const userModel = require('../models/userModel');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// In-memory set for event_id deduplication (idempotency)
const processedEvents = new Set();

const kycController = {
  /**
   * Start a Didit KYC Session for authenticated user (returns { url, session_id })
   */
  createSession: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const user = await userModel.findById(userId);

      if (!user) {
        return errorResponse(res, 404, 'User not found.');
      }

      const session = await diditService.createSession({
        userId,
        callbackUrl: req.body.callbackUrl
      });

      if (session.mode === 'error') {
        return errorResponse(res, 502, session.message, {
          detail: session.error,
          httpStatus: session.httpStatus
        });
      }

      // Update customer profile with pending session
      await userModel.updateCustomerProfile(userId, {
        kycStatus: 'PENDING',
        kycSessionId: session.session_id
      });

      return successResponse(res, 200, 'Didit KYC session initialized successfully', {
        url: session.url,
        session_id: session.session_id,
        mode: session.mode
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get KYC verification status for the current user
   */
  getMyStatus: async (req, res, next) => {
    try {
      let user = await userModel.findById(req.user.userId);
      if (!user) {
        return errorResponse(res, 404, 'User not found.');
      }

      // If user is not yet verified but has a Didit session_id, check Didit API directly
      if (user.kyc_status !== 'VERIFIED' && user.kyc_session_id) {
        const diditCheck = await diditService.getSessionDecision(user.kyc_session_id);
        if (diditCheck?.isApproved || diditCheck?.status === 'Approved') {
          await userModel.updateCustomerProfile(req.user.userId, {
            kycStatus: 'VERIFIED',
            kycVerifiedAt: new Date(),
            drivingLicenseNo: diditCheck.extractedDl || undefined,
            aadhaarNumber: diditCheck.extractedAadhaar || undefined
          });
          user = await userModel.findById(req.user.userId);
        }
      }

      const kycStatus = user.kyc_status || 'NOT_STARTED';
      return successResponse(res, 200, 'KYC status retrieved', {
        kycStatus,
        isVerified: kycStatus === 'VERIFIED',
        provider: user.kyc_provider || 'DIDIT',
        sessionId: user.kyc_session_id || null,
        verifiedAt: user.kyc_verified_at || null,
        aadhaarMasked: user.aadhaar_number ? `XXXX XXXX ${String(user.aadhaar_number).slice(-4)}` : null,
        drivingLicenseNo: user.driving_license_no || null,
        phone: user.phone || null
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Direct In-Portal KYC Verification using submitted document details
   * Enforces genuine Aadhaar (Verhoeff) and Driving Licence format validation
   */
  completeVerification: async (_req, res) => {
    return errorResponse(res, 503, 'This direct form cannot verify identity. Complete a hosted Didit session or provider verified document check.');
  },

  /**
   * Verify KYC via uploaded document images (Aadhaar + Driving Licence photos)
   * Uses Didit's standalone /v3/id-verification/ endpoint
   */
  verifyWithImages: async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const frontFile = req.files?.['front_image']?.[0];
      const backFile  = req.files?.['back_image']?.[0];

      if (!frontFile) {
        return errorResponse(res, 400, 'Front image of your document is required.');
      }

      const result = await diditService.verifyWithDocumentImages({
        frontImageBuffer: frontFile.buffer,
        frontMimetype:   frontFile.mimetype,
        backImageBuffer:  backFile?.buffer  || null,
        backMimetype:     backFile?.mimetype || null
      });

      if (!result.isVerified) {
        return errorResponse(res, 400, result.message, { status: result.status });
      }

      // Extract OCR data if available
      const extracted = result.extractedData || {};
      const extractedDl     = extracted.document_number || extracted.licence_number || null;
      const extractedAadhaar = extracted.aadhaar_number || extracted.national_id    || null;

      await userModel.updateCustomerProfile(userId, {
        kycStatus:       'VERIFIED',
        kycSessionId:    `didit_img_${Date.now()}`,
        kycVerifiedAt:   new Date(),
        drivingLicenseNo: extractedDl     || undefined,
        aadhaarNumber:   extractedAadhaar || undefined
      });

      return successResponse(res, 200, '✓ Document images verified successfully by Didit.', {
        kycStatus:   'VERIFIED',
        isVerified:  true,
        diditStatus: result.status,
        extractedData: {
          documentNumber: extractedDl,
          aadhaarNumber:  extractedAadhaar
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reset and Clear KYC Details for the authenticated user
   */
  resetKyc: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const updatedUser = await userModel.resetKycProfile(userId);

      return successResponse(res, 200, 'KYC details successfully reset. All saved identity records and verification status have been cleared.', {
        kycStatus: 'NOT_STARTED',
        isVerified: false,
        user: {
          id: updatedUser.user_id,
          email: updatedUser.email,
          kycStatus: 'NOT_STARTED',
          drivingLicenseNo: null,
          aadhaarNumber: null
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Didit V3 Webhook Endpoint
   * Verifies X-Signature-V2 HMAC, handles deduplication, applies case-sensitive decision
   */
  handleWebhook: async (req, res, next) => {
    try {
      const signature = req.headers['x-signature-v2'] || '';
      const timestamp = req.headers['x-timestamp'];

      // 1. Signature & freshness check
      const isValid = diditService.verifyWebhookSignature(req.body, signature, timestamp);
      if (!isValid) {
        console.warn('[DIDIT WEBHOOK] Invalid signature or timestamp expired');
        return res.status(401).send('Invalid signature or expired timestamp');
      }

      const event = req.body || {};
      const { event_id, status, vendor_data, decision } = event;

      // 2. Idempotency deduplication on event_id
      if (event_id && processedEvents.has(event_id)) {
        return res.status(200).send('ok');
      }
      if (event_id) {
        processedEvents.add(event_id);
        if (processedEvents.size > 1000) {
          const firstKey = processedEvents.values().next().value;
          processedEvents.delete(firstKey);
        }
      }

      const userId = Number(vendor_data);
      if (userId) {
        let extractedDl = null;
        let extractedAadhaar = null;

        if (decision?.id_verifications && Array.isArray(decision.id_verifications)) {
          for (const idDoc of decision.id_verifications) {
            if (idDoc.document_number) {
              if (String(idDoc.document_type || '').toLowerCase().includes('driving')) {
                extractedDl = idDoc.document_number;
              } else {
                extractedAadhaar = idDoc.document_number;
              }
            }
          }
        }

        // Status State Machine
        switch (status) {
          case 'Approved':
            await userModel.updateCustomerProfile(userId, {
              kycStatus: 'VERIFIED',
              kycVerifiedAt: new Date(),
              drivingLicenseNo: extractedDl || undefined,
              aadhaarNumber: extractedAadhaar || undefined
            });
            break;

          case 'Declined':
            await userModel.updateCustomerProfile(userId, {
              kycStatus: 'REJECTED'
            });
            break;

          case 'In Review':
            await userModel.updateCustomerProfile(userId, {
              kycStatus: 'IN_REVIEW'
            });
            break;

          case 'Resubmitted':
            await userModel.updateCustomerProfile(userId, {
              kycStatus: 'PENDING'
            });
            break;

          case 'Kyc Expired':
            await userModel.updateCustomerProfile(userId, {
              kycStatus: 'NOT_STARTED',
              kycVerifiedAt: null
            });
            break;

          default:
            break;
        }
      }

      return res.status(200).send('ok');
    } catch (err) {
      console.error('[DIDIT WEBHOOK ERROR]', err);
      return res.status(500).json({ error: 'Webhook processing error' });
    }
  }
};

module.exports = kycController;
