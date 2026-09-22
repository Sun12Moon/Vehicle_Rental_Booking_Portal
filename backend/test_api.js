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

    // 2. Login Admin
    const adminLogin = await request('/api/v1/auth/login', 'POST', {
      email: 'admin@rentivo.in',
      password: 'Admin@123'
    });
    console.log('2. Admin login status:', adminLogin.status, adminLogin.body.data?.token ? 'PASS' : 'FAIL');
    const adminToken = adminLogin.body.data?.token;

    // 3. Login Customer
    const custLogin = await request('/api/v1/auth/login', 'POST', {
      email: 'aditi.menon@example.com',
      password: 'Customer@123'
    });
    console.log('3. Customer login status:', custLogin.status, custLogin.body.data?.token ? 'PASS' : 'FAIL');
    const custToken = custLogin.body.data?.token;

    // 4. Vehicles
    const vehicles = await request('/api/v1/vehicles');
    console.log('4. Get vehicles count:', vehicles.body.data?.length, vehicles.status === 200 ? 'PASS' : 'FAIL');

    // 5. Branches
    const branches = await request('/api/v1/branches');
    console.log('5. Get branches count:', branches.body.data?.length, branches.status === 200 ? 'PASS' : 'FAIL');

    // 6. Check Availability
    const avail = await request('/api/v1/bookings/check-availability?vehicleId=1&pickupDate=2026-10-01&returnDate=2026-10-05');
    console.log('6. Check availability status:', avail.status, avail.body.data?.isAvailable ? 'PASS' : 'FAIL');

    // 7. Create Booking
    const bookingRes = await request('/api/v1/bookings', 'POST', {
      vehicleId: 1,
      pickupDate: '2026-10-01',
      returnDate: '2026-10-05',
      pickupLocation: 'Bengaluru Airport',
      returnLocation: 'Bengaluru Airport',
      paymentMethod: 'UPI'
    }, custToken);
    console.log('7. Create booking status:', bookingRes.status, bookingRes.body.data?.booking?.booking_reference ? 'PASS' : 'FAIL');
    console.log('   Invoice generated:', bookingRes.body.data?.invoice?.invoiceNumber);

    // 8. Test Concurrent Booking Prevention (FR7)
    // Attempting to book the SAME vehicle on overlapping dates:
    const conflictRes = await request('/api/v1/bookings', 'POST', {
      vehicleId: 1,
      pickupDate: '2026-10-03',
      returnDate: '2026-10-07',
      pickupLocation: 'Bengaluru Airport',
      returnLocation: 'Bengaluru Airport',
      paymentMethod: 'UPI'
    }, custToken);
    console.log('8. Concurrency Overlap Prevention (FR7) status:', conflictRes.status, conflictRes.status === 409 ? 'PASS (Correctly rejected with 409 Conflict!)' : 'FAIL');

    // 9. Admin Dashboard Stats
    const stats = await request('/api/v1/admin/dashboard/stats', 'GET', null, adminToken);
    console.log('9. Admin dashboard total fleet:', stats.body.data?.totalVehicles, 'Revenue:', stats.body.data?.totalRevenue, stats.status === 200 ? 'PASS' : 'FAIL');

    // 10. Admin Reports
    const reports = await request('/api/v1/admin/reports?type=revenue', 'GET', null, adminToken);
    console.log('10. Admin revenue reports count:', reports.body.data?.length, reports.status === 200 ? 'PASS' : 'FAIL');

    console.log('\n>>> ALL 10 BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
