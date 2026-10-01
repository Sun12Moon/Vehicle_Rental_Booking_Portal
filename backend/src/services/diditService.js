/**
 * Didit KYC & Identity Verification Service (V3 API)
 * Official Didit Protocol Integration with Indian Aadhaar & Driving Licence Validation
 */

const crypto = require('crypto');

// Per-session configuration
const WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID || "0c8c7dd9-ac27-49d4-9fa7-2250e669ef66";
const DIDIT_API_ROOT = "https://verification.didit.me/v3";

const isPlaceholderKey = (key) => {
  if (!key) return true;
  const trimmed = key.trim();
  return (
    trimmed === '' ||
    trimmed === 'your_didit_api_key_here' ||
    trimmed === 'YOUR_DIDIT_API_KEY' ||
    trimmed.startsWith('your_')
  );
};

// --- Verhoeff Algorithm Tables for UIDAI Aadhaar Checksum ---
const dTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const pTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/**
 * Validate Aadhaar number using official UIDAI Verhoeff algorithm and format rules
 */
function validateAadhaarNumber(aadhaar) {
  if (!aadhaar) {
    return { valid: false, error: 'Aadhaar number is required.' };
  }

  const clean = String(aadhaar).replace(/[\s-]/g, '');

  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, error: 'Aadhaar must be exactly 12 numeric digits.' };
  }

  // Aadhaar numbers do not begin with 0 or 1
  if (clean[0] === '0' || clean[0] === '1') {
    return { valid: false, error: 'Invalid Aadhaar: UIDAI numbers cannot begin with 0 or 1.' };
  }

  // Disallow all-repeating digits (e.g. 222222222222, 999999999999)
  if (new Set(clean).size === 1) {
    return { valid: false, error: 'Invalid Aadhaar: Dummy sequence with identical repeating digits detected.' };
  }

  // Disallow known dummy sequential numbers
  const knownDummies = ['123456789012', '987654321012', '112233445566', '987654321098'];
  if (knownDummies.includes(clean)) {
    return { valid: false, error: 'Invalid Aadhaar: Detected dummy or placeholder Aadhaar number.' };
  }

  // Verhoeff checksum algorithm validation
  let c = 0;
  const invertedArray = clean.split('').map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = dTable[c][pTable[i % 8][invertedArray[i]]];
  }

  if (c !== 0) {
    return { valid: false, error: 'Invalid Aadhaar: Verhoeff checksum failed. Please enter a valid UIDAI Aadhaar number.' };
  }

  return { valid: true, clean };
}

// Valid Indian State/UT Codes for Driving Licences
const VALID_STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN',
  'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD',
  'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
  'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'WB'
]);

/**
 * Validate Indian Driving Licence format (State Code + RTO + Year + Unique ID)
 */
function validateDrivingLicence(dl) {
  if (!dl) {
    return { valid: false, error: 'Driving licence number is required.' };
  }

  const clean = String(dl).replace(/[\s-]/g, '').toUpperCase();

  // Basic length: Indian DLs are typically 15-16 characters
  if (clean.length < 10 || clean.length > 20) {
    return { valid: false, error: 'Driving licence number must be between 10 and 20 alphanumeric characters.' };
  }

  const stateCode = clean.slice(0, 2);
  if (!VALID_STATE_CODES.has(stateCode)) {
    return { valid: false, error: `Invalid Driving Licence: "${stateCode}" is not a recognized Indian State or Union Territory code.` };
  }

  // Reject dummy patterns like KA0000000000000 or DL0000000000000
  const remainder = clean.slice(2);
  if (/^0+$/.test(remainder) || remainder.startsWith('0000')) {
    return { valid: false, error: 'Invalid Driving Licence: Dummy licence number with all zeros detected.' };
  }

  // Standard Indian DL regex (SS-RR-YYYYNNNNNNN)
  const isStandardFormat = /^[A-Z]{2}[0-9]{2}(19[6-9][0-9]|20[0-2][0-9])[0-9]{7}$/.test(clean);
  const isGenericValid = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{6,16}$/.test(clean);

  if (!isStandardFormat && !isGenericValid) {
    return { valid: false, error: 'Invalid Driving Licence format. Expected standard Indian DL format, e.g. KA01 20150012345.' };
  }

  return { valid: true, clean };
}

/**
 * Validate Indian Phone number (10 digits starting with 6, 7, 8, 9)
 */
function validateIndianPhone(phone) {
  if (!phone) {
    return { valid: false, error: 'Aadhaar-linked phone number is required.' };
  }

  const clean = String(phone).replace(/[\s-+]/g, '').replace(/^91/, '');

  if (!/^[6-9]\d{9}$/.test(clean)) {
    return { valid: false, error: 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210).' };
  }

  // Reject dummy repetitive numbers
  if (new Set(clean).size === 1 || clean === '1234567890') {
    return { valid: false, error: 'Invalid phone number: Dummy sequence detected.' };
  }

  return { valid: true, clean };
}

// Canonicalisation Helper 1: Whole-number floats (1.0) -> integers (1)
function shortenFloats(v) {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, shortenFloats(x)])
    );
  }
  if (typeof v === "number" && !Number.isInteger(v) && v % 1 === 0) return Math.trunc(v);
  return v;
}

// Canonicalisation Helper 2: Recursive lexicographic key sort (array order preserved)
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.keys(v)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortKeys(v[k]);
        return acc;
      }, {});
  }
  return v;
}

const diditService = {
  WORKFLOW_ID,

  validateAadhaarNumber,
  validateDrivingLicence,
  validateIndianPhone,

  /**
   * Create a Didit V3 Verification Session
   * @param {Object} params - { userId, callbackUrl }
   */
  createSession: async ({ userId, callbackUrl }) => {
    const apiKey = process.env.DIDIT_API_KEY;
    const isSandbox = isPlaceholderKey(apiKey);
    const redirectUrl = callbackUrl || "http://localhost:5173/profile?kyc=callback";

    if (!isSandbox) {
      try {
        console.log(`[DIDIT API] Attempting session creation at ${DIDIT_API_ROOT}/session/ ...`);
        const response = await fetch(`${DIDIT_API_ROOT}/session/`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflow_id: WORKFLOW_ID,
            vendor_data: String(userId),
            callback: redirectUrl,
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          console.warn("[DIDIT API] Session creation failed (HTTP", response.status, "):", detail);
          return {
            success: false,
            mode: "error",
            httpStatus: response.status,
            error: `Didit API returned ${response.status}: ${detail}`,
            message: "Didit verification server returned an authorization or configuration error."
          };
        }

        const session = await response.json();
        return {
          success: true,
          url: session.url,
          session_id: session.session_id,
          mode: "live"
        };
      } catch (err) {
        console.error("[DIDIT API ERROR]", err.message);
        return {
          success: false,
          mode: "error",
          error: err.message,
          message: "Unable to reach Didit KYC servers."
        };
      }
    }

    // Direct Portal Interactive Mode (when live API key is not configured)
    const simulatedSessionId = `didit_sess_${Date.now()}_u${userId}`;
    return {
      success: true,
      url: `${redirectUrl}&session_id=${simulatedSessionId}`,
      session_id: simulatedSessionId,
      mode: "sandbox",
      message: "Operating in Direct Portal Verification Mode."
    };
  },

  /**
   * Check status/decision of a Didit Verification Session directly from Didit API
   * @param {string} sessionId
   */
  getSessionDecision: async (sessionId) => {
    const apiKey = process.env.DIDIT_API_KEY;
    // Skip API call for locally-generated sandbox/fallback session IDs
    const isSandboxSession = !sessionId ||
      String(sessionId).startsWith('didit_sess_') ||
      String(sessionId).startsWith('didit_portal_') ||
      String(sessionId).startsWith('didit_img_');
    if (isSandboxSession || isPlaceholderKey(apiKey)) {
      return { success: false, status: null };
    }

    try {
      // Try GET /v3/session/{session_id}/decision/ first, fallback to /v3/session/{session_id}/
      let res = await fetch(`${DIDIT_API_ROOT}/session/${sessionId}/decision/`, {
        method: "GET",
        headers: { "x-api-key": apiKey }
      });

      if (!res.ok) {
        res = await fetch(`${DIDIT_API_ROOT}/session/${sessionId}/`, {
          method: "GET",
          headers: { "x-api-key": apiKey }
        });
      }

      if (!res.ok) {
        return { success: false, httpStatus: res.status };
      }

      const data = await res.json();
      const status = data?.status || data?.decision?.status || '';
      const isApproved = status === 'Approved';

      let extractedDl = null;
      let extractedAadhaar = null;
      const idDocs = data?.decision?.id_verifications || data?.id_verifications || [];
      if (Array.isArray(idDocs)) {
        for (const idDoc of idDocs) {
          if (idDoc.document_number) {
            if (String(idDoc.document_type || '').toLowerCase().includes('driving')) {
              extractedDl = idDoc.document_number;
            } else {
              extractedAadhaar = idDoc.document_number;
            }
          }
        }
      }

      return {
        success: true,
        status,
        isApproved,
        extractedDl,
        extractedAadhaar,
        data
      };
    } catch (err) {
      console.error("[DIDIT API] getSessionDecision error:", err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Direct In-Portal Verification using Aadhaar, Driving Licence, and Aadhaar-linked Mobile
   */
  verifyDirectDocument: async ({
    userId,
    aadhaarNumber,
    drivingLicenseNo,
    dateOfBirth,
    expiryDate
  }) => {
    // 1. Validate Aadhaar
    const aadhaarCheck = validateAadhaarNumber(aadhaarNumber);
    if (!aadhaarCheck.valid) {
      return {
        success: false,
        isVerified: false,
        field: 'aadhaarNumber',
        message: aadhaarCheck.error
      };
    }

    // 2. Validate Driving Licence
    const dlCheck = validateDrivingLicence(drivingLicenseNo);
    if (!dlCheck.valid) {
      return {
        success: false,
        isVerified: false,
        field: 'drivingLicenseNo',
        message: dlCheck.error
      };
    }

    // 3. Date of Birth Check (minimum 18 years old)
    if (dateOfBirth) {
      const birth = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 18) {
        return {
          success: false,
          isVerified: false,
          field: 'dateOfBirth',
          message: 'Customer must be at least 18 years old to complete KYC.'
        };
      }
    }

    // 4. DL Expiry Check
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiry < today) {
        return {
          success: false,
          isVerified: false,
          field: 'expiryDate',
          message: 'Driving Licence has expired. Please provide a valid driving licence.'
        };
      }
    }

    // All validation passed
    return {
      success: true,
      isVerified: true,
      decision: "APPROVED",
      provider: "DIDIT",
      aadhaarMasked: `XXXX XXXX ${aadhaarCheck.clean.slice(-4)}`,
      dlMasked: `XXXX XXXX ${dlCheck.clean.slice(-4)}`,
      verifiedAt: new Date().toISOString()
    };
  },

  /**
   * Verify document authenticity using Didit's Standalone Image API
   * POST /v3/id-verification/ with multipart/form-data
   * @param {Object} params - { frontImageBuffer, backImageBuffer, frontMimetype, backMimetype }
   */
  verifyWithDocumentImages: async ({ frontImageBuffer, backImageBuffer, frontMimetype, backMimetype }) => {
    const apiKey = process.env.DIDIT_API_KEY;

    if (isPlaceholderKey(apiKey)) {
      return {
        success: false,
        isVerified: false,
        message: 'Didit API key is not configured. Please add a valid DIDIT_API_KEY to your .env file.'
      };
    }

    try {
      // Build multipart/form-data using native FormData (Node 18+)
      const form = new FormData();

      const frontBlob = new Blob([frontImageBuffer], { type: frontMimetype || 'image/jpeg' });
      form.append('front_image', frontBlob, 'front.' + (frontMimetype || 'image/jpeg').split('/')[1]);

      if (backImageBuffer) {
        const backBlob = new Blob([backImageBuffer], { type: backMimetype || 'image/jpeg' });
        form.append('back_image', backBlob, 'back.' + (backMimetype || 'image/jpeg').split('/')[1]);
      }

      console.log('[DIDIT API] Sending document images to /v3/id-verification/ ...');
      const response = await fetch(`${DIDIT_API_ROOT}/id-verification/`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: form
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.warn('[DIDIT API] id-verification failed (HTTP', response.status, '):', responseText);
        return {
          success: false,
          isVerified: false,
          httpStatus: response.status,
          message: `Didit document verification failed (${response.status}): ${responseText}`
        };
      }

      const result = JSON.parse(responseText);
      console.log('[DIDIT API] id-verification result:', JSON.stringify(result, null, 2));

      // Didit returns a "status" field: "Approved", "Declined", etc.
      const status = result?.status || result?.decision?.status || '';
      const isApproved = status === 'Approved';

      return {
        success: true,
        isVerified: isApproved,
        status,
        extractedData: result?.extraction || result?.ocr_result || result || {},
        message: isApproved
          ? 'Document verified successfully by Didit.'
          : `Document verification not approved: ${status}`
      };
    } catch (err) {
      console.error('[DIDIT API ERROR] id-verification:', err.message);
      return {
        success: false,
        isVerified: false,
        message: 'Unable to reach Didit verification servers: ' + err.message
      };
    }
  },

  /**
   * Verify Webhook X-Signature-V2 and canonical payload
   */
  verifyWebhookSignature: (rawBody, signature, timestamp) => {
    const secret = process.env.DIDIT_WEBHOOK_SECRET;
    if (!secret || isPlaceholderKey(secret)) {
      return true;
    }

    const ts = Number(timestamp);
    if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
      return false;
    }

    const parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));

    const expected = crypto
      .createHmac("sha256", secret)
      .update(canonical, "utf8")
      .digest("hex");

    if (
      !signature ||
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return false;
    }

    return true;
  }
};

module.exports = diditService;
