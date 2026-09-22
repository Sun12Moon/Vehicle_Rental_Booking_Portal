const db = require('../config/db');
const store = require('./store');

const vehicleModel = {
  findVehicles: async (filters = {}) => {
    const {
      categoryId,
      branchId,
      fuelType,
      transmission,
      maxPrice,
      status,
      search
    } = filters;

    if (db.getStatus().isConnected) {
      let sql = `
        SELECT v.*, vc.category_name, b.branch_name, b.city as branch_city
        FROM vehicles v
        JOIN vehicle_categories vc ON v.category_id = vc.category_id
        JOIN branches b ON v.branch_id = b.branch_id
        WHERE v.deleted_at IS NULL
      `;
      const params = [];

      if (categoryId) {
        sql += ` AND v.category_id = ?`;
        params.push(Number(categoryId));
      }
      if (branchId) {
        sql += ` AND v.branch_id = ?`;
        params.push(Number(branchId));
      }
      if (fuelType) {
        sql += ` AND UPPER(v.fuel_type) = UPPER(?)`;
        params.push(fuelType);
      }
      if (transmission) {
        sql += ` AND UPPER(v.transmission) = UPPER(?)`;
        params.push(transmission);
      }
      if (maxPrice) {
        sql += ` AND v.daily_rent <= ?`;
        params.push(Number(maxPrice));
      }
      if (status) {
        sql += ` AND UPPER(v.status) = UPPER(?)`;
        params.push(status);
      }
      if (search) {
        sql += ` AND (LOWER(v.brand) LIKE ? OR LOWER(v.model) LIKE ? OR LOWER(v.registration_number) LIKE ?)`;
        const q = `%${search.toLowerCase()}%`;
        params.push(q, q, q);
      }

      sql += ` ORDER BY v.daily_rent ASC`;
      return await db.query(sql, params);
    }

    // Memory Store Fallback
    return store.vehicles
      .filter(v => {
        if (categoryId && v.category_id !== Number(categoryId)) return false;
        if (branchId && v.branch_id !== Number(branchId)) return false;
        if (fuelType && v.fuel_type.toUpperCase() !== fuelType.toUpperCase()) return false;
        if (transmission && v.transmission.toUpperCase() !== transmission.toUpperCase()) return false;
        if (maxPrice && Number(v.daily_rent) > Number(maxPrice)) return false;
        if (status && v.status.toUpperCase() !== status.toUpperCase()) return false;
        if (search) {
          const s = search.toLowerCase();
          const match = v.brand.toLowerCase().includes(s) ||
                        v.model.toLowerCase().includes(s) ||
                        (v.registration_number && v.registration_number.toLowerCase().includes(s));
          if (!match) return false;
        }
        return true;
      })
      .map(v => {
        const cat = store.vehicle_categories.find(c => c.category_id === v.category_id);
        const br = store.branches.find(b => b.branch_id === v.branch_id);
        return {
          ...v,
          category_name: cat ? cat.category_name : 'Standard',
          branch_name: br ? br.branch_name : 'Main Branch',
          branch_city: br ? br.city : 'Bengaluru'
        };
      });
  },

  findById: async (vehicleId) => {
    const id = Number(vehicleId);
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT v.*, vc.category_name, b.branch_name, b.address as branch_address, b.city as branch_city, b.phone as branch_phone
        FROM vehicles v
        JOIN vehicle_categories vc ON v.category_id = vc.category_id
        JOIN branches b ON v.branch_id = b.branch_id
        WHERE v.vehicle_id = ? AND v.deleted_at IS NULL
        LIMIT 1
      `;
      const rows = await db.query(sql, [id]);
      return rows[0] || null;
    }

    const v = store.vehicles.find(item => item.vehicle_id === id);
    if (!v) return null;
    const cat = store.vehicle_categories.find(c => c.category_id === v.category_id);
    const br = store.branches.find(b => b.branch_id === v.branch_id);
    return {
      ...v,
      category_name: cat ? cat.category_name : 'Standard',
      branch_name: br ? br.branch_name : 'Main Branch',
      branch_address: br ? br.address : '',
      branch_city: br ? br.city : '',
      branch_phone: br ? br.phone : ''
    };
  },

  createVehicle: async (data) => {
    const {
      categoryId = 1,
      branchId = 1,
      registrationNumber,
      brand,
      model,
      variant = '',
      manufactureYear = new Date().getFullYear(),
      color = 'White',
      fuelType = 'PETROL',
      transmission = 'AUTOMATIC',
      engineCapacity = '1.5L',
      seatingCapacity = 5,
      mileage = 15,
      dailyRent,
      securityDeposit = 7500,
      status = 'AVAILABLE',
      imageUrl = '',
      description = ''
    } = data;

    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO vehicles (
          category_id, branch_id, registration_number, brand, model, variant,
          manufacture_year, color, fuel_type, transmission, engine_capacity,
          seating_capacity, mileage, daily_rent, security_deposit, status,
          image_url, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      const res = await db.query(sql, [
        categoryId, branchId, registrationNumber, brand, model, variant,
        manufactureYear, color, fuelType, transmission, engineCapacity,
        seatingCapacity, mileage, dailyRent, securityDeposit, status,
        imageUrl, description
      ]);
      return res.insertId;
    }

    const newId = store.vehicles.length ? Math.max(...store.vehicles.map(v => v.vehicle_id)) + 1 : 1;
    const newVehicle = {
      vehicle_id: newId,
      category_id: Number(categoryId),
      branch_id: Number(branchId),
      registration_number: registrationNumber,
      brand,
      model,
      variant,
      manufacture_year: manufactureYear,
      color,
      fuel_type: fuelType,
      transmission,
      engine_capacity: engineCapacity,
      seating_capacity: seatingCapacity,
      mileage,
      daily_rent: Number(dailyRent),
      security_deposit: Number(securityDeposit),
      status,
      image_url: imageUrl,
      description
    };
    store.vehicles.push(newVehicle);
    return newId;
  },

  updateVehicle: async (vehicleId, data) => {
    const id = Number(vehicleId);
    if (db.getStatus().isConnected) {
      const sql = `
        UPDATE vehicles
        SET category_id = COALESCE(?, category_id),
            branch_id = COALESCE(?, branch_id),
            brand = COALESCE(?, brand),
            model = COALESCE(?, model),
            daily_rent = COALESCE(?, daily_rent),
            security_deposit = COALESCE(?, security_deposit),
            status = COALESCE(?, status),
            image_url = COALESCE(?, image_url),
            description = COALESCE(?, description),
            updated_at = NOW()
        WHERE vehicle_id = ?
      `;
      await db.query(sql, [
        data.categoryId || null,
        data.branchId || null,
        data.brand || null,
        data.model || null,
        data.dailyRent || null,
        data.securityDeposit || null,
        data.status || null,
        data.imageUrl || null,
        data.description || null,
        id
      ]);
      return vehicleModel.findById(id);
    }

    const v = store.vehicles.find(item => item.vehicle_id === id);
    if (v) {
      if (data.categoryId !== undefined) v.category_id = Number(data.categoryId);
      if (data.branchId !== undefined) v.branch_id = Number(data.branchId);
      if (data.brand !== undefined) v.brand = data.brand;
      if (data.model !== undefined) v.model = data.model;
      if (data.dailyRent !== undefined) v.daily_rent = Number(data.dailyRent);
      if (data.securityDeposit !== undefined) v.security_deposit = Number(data.securityDeposit);
      if (data.status !== undefined) v.status = data.status;
      if (data.imageUrl !== undefined) v.image_url = data.imageUrl;
      if (data.description !== undefined) v.description = data.description;
    }
    return vehicleModel.findById(id);
  },

  deleteVehicle: async (vehicleId) => {
    const id = Number(vehicleId);
    if (db.getStatus().isConnected) {
      const sql = `UPDATE vehicles SET deleted_at = NOW(), status = 'INACTIVE' WHERE vehicle_id = ?`;
      await db.query(sql, [id]);
      return true;
    }

    const index = store.vehicles.findIndex(item => item.vehicle_id === id);
    if (index !== -1) {
      store.vehicles.splice(index, 1);
      return true;
    }
    return false;
  },

  getAllCategories: async () => {
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT vc.*, COUNT(v.vehicle_id) as vehicle_count
        FROM vehicle_categories vc
        LEFT JOIN vehicles v ON vc.category_id = v.category_id AND v.deleted_at IS NULL
        GROUP BY vc.category_id
      `;
      return await db.query(sql);
    }

    return store.vehicle_categories.map(c => ({
      ...c,
      vehicle_count: store.vehicles.filter(v => v.category_id === c.category_id).length
    }));
  },

  createCategory: async ({ categoryName, description = '', seatingCapacity = 5 }) => {
    if (db.getStatus().isConnected) {
      const sql = `INSERT INTO vehicle_categories (category_name, description, seating_capacity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`;
      const res = await db.query(sql, [categoryName, description, seatingCapacity]);
      return res.insertId;
    }

    const newId = store.vehicle_categories.length ? Math.max(...store.vehicle_categories.map(c => c.category_id)) + 1 : 1;
    const newCat = {
      category_id: newId,
      category_name: categoryName,
      description,
      seating_capacity: seatingCapacity
    };
    store.vehicle_categories.push(newCat);
    return newId;
  }
};

module.exports = vehicleModel;
