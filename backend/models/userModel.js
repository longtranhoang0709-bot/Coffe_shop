const pool = require("../config/db");

const PUBLIC_FIELDS = `
  n.ma_nguoi_dung, n.ho_ten, n.email,
  n.so_dien_tho AS so_dien_thoai,
  n.trang_thai, n.ngay_tao,
  v.ky_hieu_vai_tro AS vai_tro`;

async function getProfile(userId) {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_FIELDS}
     FROM NGUOI_DUNG n
     JOIN VAI_TRO v ON n.ma_vai_tro = v.ma_vai_tro
     WHERE n.ma_nguoi_dung = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function updateProfile(userId, fields) {
  const mapping = {
    ho_ten: "ho_ten",
    so_dien_thoai: "so_dien_tho",
  };
  const entries = Object.entries(fields);
  // Field names only come from the fixed whitelist above, never from SQL input.
  const assignments = entries.map(([key]) => `${mapping[key]} = ?`).join(", ");
  await pool.execute(
    `UPDATE NGUOI_DUNG SET ${assignments} WHERE ma_nguoi_dung = ?`,
    [...entries.map(([, value]) => value), userId],
  );
  return getProfile(userId);
}

async function listAddresses(userId) {
  const [rows] = await pool.execute(
    `SELECT ma_dia_chi, ten_nguoi_nhan, sdt_nguoi_nhan,
            tinh_thanh, quan_huyen, phuong_xa, dia_chi_chi_tiet, la_mac_dinh
     FROM DIA_CHI_NGUOI_DUNG
     WHERE ma_nguoi_dung = ?
     ORDER BY la_mac_dinh DESC, ma_dia_chi ASC`,
    [userId],
  );
  return rows;
}

async function getAddress(userId, addressId) {
  const [rows] = await pool.execute(
    `SELECT ma_dia_chi, ten_nguoi_nhan, sdt_nguoi_nhan,
            tinh_thanh, quan_huyen, phuong_xa, dia_chi_chi_tiet, la_mac_dinh
     FROM DIA_CHI_NGUOI_DUNG
     WHERE ma_nguoi_dung = ? AND ma_dia_chi = ? LIMIT 1`,
    [userId, addressId],
  );
  return rows[0] || null;
}

async function createAddress(userId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // A user owns at most one default address (DB also has a unique index).
    const [existing] = await conn.execute(
      `SELECT ma_dia_chi FROM DIA_CHI_NGUOI_DUNG
       WHERE ma_nguoi_dung = ? FOR UPDATE`,
      [userId],
    );
    const makeDefault = Boolean(data.la_mac_dinh) || existing.length === 0;
    if (makeDefault && existing.length > 0) {
      await conn.execute(
        `UPDATE DIA_CHI_NGUOI_DUNG SET la_mac_dinh = 0
         WHERE ma_nguoi_dung = ?`,
        [userId],
      );
    }
    const [result] = await conn.execute(
      `INSERT INTO DIA_CHI_NGUOI_DUNG
       (ma_nguoi_dung, ten_nguoi_nhan, sdt_nguoi_nhan, tinh_thanh,
        quan_huyen, phuong_xa, dia_chi_chi_tiet, la_mac_dinh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.ten_nguoi_nhan,
        data.sdt_nguoi_nhan,
        data.tinh_thanh,
        data.quan_huyen ?? null,
        data.phuong_xa,
        data.dia_chi_chi_tiet,
        makeDefault ? 1 : 0,
      ],
    );
    await conn.commit();
    return getAddress(userId, result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateAddress(userId, addressId, fields) {
  const mapping = {
    ten_nguoi_nhan: "ten_nguoi_nhan",
    sdt_nguoi_nhan: "sdt_nguoi_nhan",
    tinh_thanh: "tinh_thanh",
    quan_huyen: "quan_huyen",
    phuong_xa: "phuong_xa",
    dia_chi_chi_tiet: "dia_chi_chi_tiet",
  };
  const entries = Object.entries(fields);
  const assignments = entries.map(([key]) => `${mapping[key]} = ?`).join(", ");
  const [result] = await pool.execute(
    `UPDATE DIA_CHI_NGUOI_DUNG SET ${assignments}
     WHERE ma_dia_chi = ? AND ma_nguoi_dung = ?`,
    [...entries.map(([, value]) => value), addressId, userId],
  );
  if (!result.affectedRows) return null;
  return getAddress(userId, addressId);
}

async function setDefaultAddress(userId, addressId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT ma_dia_chi FROM DIA_CHI_NGUOI_DUNG
       WHERE ma_nguoi_dung = ? FOR UPDATE`,
      [userId],
    );
    if (!rows.some((row) => row.ma_dia_chi === addressId)) {
      await conn.rollback();
      return null;
    }
    await conn.execute(
      `UPDATE DIA_CHI_NGUOI_DUNG SET la_mac_dinh = 0
       WHERE ma_nguoi_dung = ?`,
      [userId],
    );
    await conn.execute(
      `UPDATE DIA_CHI_NGUOI_DUNG SET la_mac_dinh = 1
       WHERE ma_dia_chi = ? AND ma_nguoi_dung = ?`,
      [addressId, userId],
    );
    await conn.commit();
    return getAddress(userId, addressId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteAddress(userId, addressId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT ma_dia_chi, la_mac_dinh FROM DIA_CHI_NGUOI_DUNG
       WHERE ma_nguoi_dung = ? FOR UPDATE`,
      [userId],
    );
    const target = rows.find((row) => row.ma_dia_chi === addressId);
    if (!target) {
      await conn.rollback();
      return false;
    }
    await conn.execute(
      `DELETE FROM DIA_CHI_NGUOI_DUNG
       WHERE ma_dia_chi = ? AND ma_nguoi_dung = ?`,
      [addressId, userId],
    );
    if (target.la_mac_dinh === 1) {
      const replacement = rows
        .filter((row) => row.ma_dia_chi !== addressId)
        .sort((a, b) => a.ma_dia_chi - b.ma_dia_chi)[0];
      if (replacement) {
        await conn.execute(
          `UPDATE DIA_CHI_NGUOI_DUNG SET la_mac_dinh = 1
           WHERE ma_dia_chi = ? AND ma_nguoi_dung = ?`,
          [replacement.ma_dia_chi, userId],
        );
      }
    }
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function adminFilters(filters) {
  const where = [];
  const values = [];
  if (filters.search) {
    where.push("(n.ho_ten LIKE ? OR n.email LIKE ?)");
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.role) {
    where.push("v.ky_hieu_vai_tro = ?");
    values.push(filters.role);
  }
  if (filters.status) {
    where.push("n.trang_thai = ?");
    values.push(filters.status);
  }
  return { where: where.length ? "WHERE " + where.join(" AND ") : "", values };
}

async function adminListUsers(filters) {
  const { where, values } = adminFilters(filters);
  const [totals] = await pool.execute(
    `SELECT COUNT(*) AS total FROM NGUOI_DUNG n
     JOIN VAI_TRO v ON n.ma_vai_tro = v.ma_vai_tro ${where}`,
    values,
  );
  const offset = (filters.page - 1) * filters.limit;
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_FIELDS} FROM NGUOI_DUNG n
     JOIN VAI_TRO v ON n.ma_vai_tro = v.ma_vai_tro ${where}
     ORDER BY n.ma_nguoi_dung DESC LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset],
  );
  return {
    items: rows,
    total: totals[0].total,
    page: filters.page,
    limit: filters.limit,
  };
}

async function adminGetUser(userId) {
  return getProfile(userId);
}

async function adminChangeStatus(userId, status) {
  const [result] = await pool.execute(
    `UPDATE NGUOI_DUNG n
     JOIN VAI_TRO v ON v.ma_vai_tro = n.ma_vai_tro
     SET n.trang_thai = ?
     WHERE n.ma_nguoi_dung = ? AND v.ky_hieu_vai_tro <> 'ADMIN'`,
    [status, userId],
  );
  return result.affectedRows > 0;
}

async function adminChangeRole(userId, roleCode) {
  const [result] = await pool.execute(
    `UPDATE NGUOI_DUNG n
     JOIN VAI_TRO v_old ON v_old.ma_vai_tro = n.ma_vai_tro
     JOIN VAI_TRO v_new ON v_new.ky_hieu_vai_tro = ?
     SET n.ma_vai_tro = v_new.ma_vai_tro
     WHERE n.ma_nguoi_dung = ? AND v_old.ky_hieu_vai_tro <> 'ADMIN'`,
    [roleCode, userId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  adminListUsers,
  adminGetUser,
  adminChangeStatus,
  adminChangeRole,
};
