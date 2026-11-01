const crypto = require('crypto');

const API_ROOT = 'https://api.razorpay.com/v1';

const getTestCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId.startsWith('rzp_test_') || !keySecret || keySecret.startsWith('your_')) {
    return null;
  }
  return { keyId, keySecret };
};

const razorpayRequest = async (path, { method = 'GET', body, credentials }) => {
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }
  if (!response.ok) {
    const error = new Error(payload?.error?.description || `Razorpay request failed (${response.status}).`);
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return payload;
};

const verifyCheckoutSignature = ({ orderId, paymentId, signature, secret }) => {
  if (!/^[a-f0-9]{64}$/i.test(String(signature || ''))) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};

module.exports = {
  getTestCredentials,
  verifyCheckoutSignature,
  createOrder: (order, credentials) => razorpayRequest('/orders', {
    method: 'POST', body: order, credentials
  }),
  fetchPayment: (paymentId, credentials) => razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, {
    credentials
  }),
  capturePayment: (paymentId, amount, currency, credentials) => razorpayRequest(
    `/payments/${encodeURIComponent(paymentId)}/capture`,
    { method: 'POST', body: { amount, currency }, credentials }
  )
};
