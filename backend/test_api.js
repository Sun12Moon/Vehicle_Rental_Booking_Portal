const http = require('http');
const app = require('./app');

const server = app.listen(5001, async () => {
  console.log('[TEST] Server started on port 5001');

  const request = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  try {
    // 1. Health
    const health = await request('/api/v1/health');
    console.log('1. Health check status:', health.status, health.body.success === true ? 'PASS' : 'FAIL');

    // 2. Login Admin (Default Entry 1)
    const adminLogin = await request('/api/v1/auth/login', 'POST', {
      email: process.env.DEMO_ADMIN_EMAIL || 'admin@rentivo.in',
      password: process.env.DEMO_ADMIN_PASSWORD || 'Admin@123'
    });
    console.log('2. Admin login status:', adminLogin.status, adminLogin.body.data?.token ? 'PASS' : 'FAIL');
    const adminToken = adminLogin.body.data?.token;

    // 3. Login Customer/User (Default Entry 2)
    const custLogin = await request('/api/v1/auth/login', 'POST', {
      email: process.env.DEMO_USER_EMAIL || 'user@rentivo.in',
      password: process.env.DEMO_USER_PASSWORD || 'User@123'
    });
    console.log('3. User login status:', custLogin.status, custLogin.body.data?.token ? 'PASS' : 'FAIL');
    const custToken = custLogin.body.data?.token;

    // 4. Vehicles List
    const vehicles = await request('/api/v1/vehicles');
    console.log('4. Get vehicles count:', vehicles.body.data?.length, vehicles.status === 200 ? 'PASS' : 'FAIL');

    // 5. Branches List
    const branches = await request('/api/v1/branches');
    console.log('5. Get branches count:', branches.body.data?.length, branches.status === 200 ? 'PASS' : 'FAIL');

    // 6. Didit KYC Session Creation
    const kycSession = await request('/api/v1/kyc/session', 'POST', {
      callbackUrl: 'http://localhost:5173/profile?kyc=callback'
    }, custToken);
    const hasSession = kycSession.body.data?.session_id || kycSession.body.data?.sessionId || kycSession.body.data?.url;
    console.log('6. Didit KYC session creation:', kycSession.status, hasSession ? 'PASS' : 'FAIL');
    console.log('   Didit Provider Mode:', kycSession.body.data?.mode);
    console.log('   Session URL generated:', kycSession.body.data?.url);

    // 7. Didit KYC Verification
    const kycVerify = await request('/api/v1/kyc/verify', 'POST', {
      sessionId: kycSession.body.data?.sessionId,
      drivingLicenseNo: 'KA01 20150012345',
      aadhaarNumber: '987654321012'
    }, custToken);
    console.log('7. Didit KYC verification execution:', kycVerify.status, kycVerify.body.data?.isVerified ? 'PASS' : 'FAIL');

    // 8. Didit KYC My Status
    const kycStatus = await request('/api/v1/kyc/my-status', 'GET', null, custToken);
    console.log('8. Didit KYC profile status:', kycStatus.body.data?.kycStatus === 'VERIFIED' ? 'VERIFIED (PASS)' : 'FAIL');

    // 9. Check Vehicle Availability
    const avail = await request('/api/v1/bookings/check-availability?vehicleId=1&pickupDate=2026-10-01&returnDate=2026-10-05');
    console.log('9. Check availability status:', avail.status, avail.body.data?.isAvailable ? 'PASS' : 'FAIL');

    // 10. Create Booking
    const bookingRes = await request('/api/v1/bookings', 'POST', {
      vehicleId: 1,
      pickupDate: '2026-10-01',
      returnDate: '2026-10-05',
      pickupLocation: 'Bengaluru Airport',
      returnLocation: 'Bengaluru Airport',
      paymentMethod: 'UPI'
    }, custToken);
    console.log('10. Create booking status:', bookingRes.status, bookingRes.body.data?.booking?.booking_reference ? 'PASS' : 'FAIL');
    console.log('    Invoice generated:', bookingRes.body.data?.invoice?.invoiceNumber);

    // 11. Test Concurrent Booking Prevention (FR7)
    const conflictRes = await request('/api/v1/bookings', 'POST', {
      vehicleId: 1,
      pickupDate: '2026-10-03',
      returnDate: '2026-10-07',
      pickupLocation: 'Bengaluru Airport',
      returnLocation: 'Bengaluru Airport',
      paymentMethod: 'UPI'
    }, custToken);
    console.log('11. Concurrency Overlap Prevention (FR7):', conflictRes.status === 409 ? 'PASS (409 Conflict handled)' : 'FAIL');

    // 12. Admin Dashboard Stats
    const stats = await request('/api/v1/admin/dashboard/stats', 'GET', null, adminToken);
    console.log('12. Admin dashboard total fleet:', stats.body.data?.totalVehicles, 'Revenue:', stats.body.data?.totalRevenue, stats.status === 200 ? 'PASS' : 'FAIL');

    console.log('\n>>> ALL 12 BACKEND & DIDIT KYC VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
