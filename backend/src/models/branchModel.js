const db = require('../config/db');
const store = require('./store');

const branchModel = {
  getAllBranches: async () => {
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT b.*, COUNT(v.vehicle_id) as vehicle_count
        FROM branches b
        LEFT JOIN vehicles v ON b.branch_id = v.branch_id AND v.deleted_at IS NULL
        GROUP BY b.branch_id
        ORDER BY b.branch_name ASC
      `;
      return await db.query(sql);
    }

    return store.branches.map(b => ({
      ...b,
      vehicle_count: store.vehicles.filter(v => v.branch_id === b.branch_id).length
    }));
  },

  getBranchById: async (branchId) => {
    const id = Number(branchId);
    if (db.getStatus().isConnected) {
      const sql = `SELECT * FROM branches WHERE branch_id = ? LIMIT 1`;
      const rows = await db.query(sql, [id]);
      return rows[0] || null;
    }
    return store.branches.find(b => b.branch_id === id) || null;
  },

  createBranch: async ({ branchName, address, city, state = 'Karnataka', postalCode, phone }) => {
    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO branches (branch_name, address, city, state, postal_code, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      const res = await db.query(sql, [branchName, address, city, state, postalCode, phone]);
      return res.insertId;
    }

    const newId = store.branches.length ? Math.max(...store.branches.map(b => b.branch_id)) + 1 : 1;
    const newBranch = {
      branch_id: newId,
      branch_name: branchName,
      address,
      city,
      state,
      postal_code: postalCode,
      phone
    };
    store.branches.push(newBranch);
    return newId;
  },

  updateBranch: async (branchId, data) => {
    const id = Number(branchId);
    if (db.getStatus().isConnected) {
      const sql = `
        UPDATE branches
        SET branch_name = COALESCE(?, branch_name),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            postal_code = COALESCE(?, postal_code),
            phone = COALESCE(?, phone),
            updated_at = NOW()
        WHERE branch_id = ?
      `;
      await db.query(sql, [
        data.branchName || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.postalCode || null,
        data.phone || null,
        id
      ]);
      return branchModel.getBranchById(id);
    }

    const b = store.branches.find(item => item.branch_id === id);
    if (b) {
      if (data.branchName !== undefined) b.branch_name = data.branchName;
      if (data.address !== undefined) b.address = data.address;
      if (data.city !== undefined) b.city = data.city;
      if (data.state !== undefined) b.state = data.state;
      if (data.postalCode !== undefined) b.postal_code = data.postalCode;
      if (data.phone !== undefined) b.phone = data.phone;
    }
    return branchModel.getBranchById(id);
  }
};

module.exports = branchModel;
