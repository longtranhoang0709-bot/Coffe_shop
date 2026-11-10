const pool = require('../config/db');

async function findRoleByCode(roleCode) {
  const [rows] = await pool.execute(
    'SELECT ma_vai_tro, ky_hieu_vai_tro FROM VAI_TRO WHERE ky_hieu_vai_tro = ? LIMIT 1',
    [roleCode]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT n.ma_nguoi_dung, n.ma_vai_tro, n.ho_ten, n.email,
            n.so_dien_tho AS so_dien_thoai, n.mat_khau_ma_hoa, n.trang_thai, n.ngay_tao,
            v.ky_hieu_vai_tro AS vai_tro
     FROM NGUOI_DUNG AS n
     JOIN VAI_TRO AS v ON v.ma_vai_tro = n.ma_vai_tro
     WHERE n.email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findPublicById(userId) {
  const [rows] = await pool.execute(
    `SELECT n.ma_nguoi_dung, n.ho_ten, n.email, n.so_dien_tho AS so_dien_thoai,
            n.trang_thai, n.ngay_tao, v.ky_hieu_vai_tro AS vai_tro
     FROM NGUOI_DUNG AS n
     JOIN VAI_TRO AS v ON v.ma_vai_tro = n.ma_vai_tro
     WHERE n.ma_nguoi_dung = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function createCustomer({ roleId, ho_ten, email, so_dien_thoai, passwordHash }) {
  const [result] = await pool.execute(
    `INSERT INTO NGUOI_DUNG
       (ma_vai_tro, ho_ten, email, so_dien_tho, mat_khau_ma_hoa,
        trang_thai)
     VALUES (?, ?, ?, ?, ?, 'HOAT_DONG')`,
    [roleId, ho_ten, email, so_dien_thoai, passwordHash]
  );
  return result.insertId;
}

module.exports = { findRoleByCode, findByEmail, findPublicById, createCustomer };
