const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authModel = require('../models/authModel');
// Kiem tra du lieu cua API dang ky va dang nhap.
function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateRegister(body = {}) {
  const hoTen = typeof body.ho_ten === 'string' ? body.ho_ten.trim() : '';
  const email = normalizeEmail(body.email);
  const soDienThoai = typeof body.so_dien_thoai === 'string'
    ? body.so_dien_thoai.trim()
    : '';
  const matKhau = body.mat_khau;

  if (hoTen.length < 2 || hoTen.length > 150) {
    return { error: 'Ho ten phai co tu 2 den 150 ky tu.' };
  }
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email khong hop le.' };
  }
  if (soDienThoai && !/^\+?[0-9 .()-]{9,20}$/.test(soDienThoai)) {
    return { error: 'So dien thoai khong hop le.' };
  }
  if (typeof matKhau !== 'string' || matKhau.length < 8) {
    return { error: 'Mat khau phai co it nhat 8 ky tu.' };
  }
  // bcrypt gioi han 72 byte; tu choi dau vao dai de tranh cat ngan am tham.
  if (Buffer.byteLength(matKhau, 'utf8') > 72) {
    return { error: 'Mat khau qua dai (toi da 72 byte UTF-8).' };
  }

  return { value: { ho_ten: hoTen, email, so_dien_thoai: soDienThoai || null, mat_khau: matKhau } };
}

function validateLogin(body = {}) {
  const email = normalizeEmail(body.email);
  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email khong hop le.' };
  }
  if (typeof body.mat_khau !== 'string' || !body.mat_khau) {
    return { error: 'Vui long nhap mat khau.' };
  }
  return { value: { email, mat_khau: body.mat_khau } };
}




const JWT_ISSUER = 'coffeShop';
const JWT_AUDIENCE = 'coffeShop-web';

function signAccessToken(user) {
  // Chi luu ID vao token. Vai tro duoc doc lai tu DB tai moi request bao ve.
  return jwt.sign({}, process.env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: String(user.ma_nguoi_dung),
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: '15m',
  });
}

function publicUser(user) {
  const {
    ma_nguoi_dung, ho_ten, email, so_dien_thoai,
    trang_thai, ngay_tao, vai_tro,
  } = user;
  return { ma_nguoi_dung, ho_ten, email, so_dien_thoai, trang_thai, ngay_tao, vai_tro };
}

async function register(req, res) {
  const { value, error } = validateRegister(req.body);
  if (error) return res.status(400).json({ message: error });

  // Khong doc "role" hay "ma_vai_tro" tu request: nguoi dung tu dang ky chi la CUSTOMER.
  const customerRole = await authModel.findRoleByCode('CUSTOMER');
  if (!customerRole) {
    return res.status(503).json({ message: 'Chua cau hinh vai tro CUSTOMER. Hay chay seed_roles.sql.' });
  }

  const existingUser = await authModel.findByEmail(value.email);
  if (existingUser) {
    return res.status(409).json({ message: 'Email da duoc su dung.' });
  }

  const passwordHash = await bcrypt.hash(value.mat_khau, 12);

  let userId;
  try {
    userId = await authModel.createCustomer({
      roleId: customerRole.ma_vai_tro,
      ho_ten: value.ho_ten,
      email: value.email,
      so_dien_thoai: value.so_dien_thoai,
      passwordHash,
    });
  } catch (err) {
    // Hai yeu cau dang ky dong thoi cung email: DB UNIQUE la chan cuoi cung.
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email da duoc su dung.' });
    }
    throw err;
  }

  const created = await authModel.findPublicById(userId);
  return res.status(201).json({ message: 'Dang ky thanh cong.', user: created });
}

async function login(req, res) {
  const { value, error } = validateLogin(req.body);
  if (error) return res.status(400).json({ message: error });

  const user = await authModel.findByEmail(value.email);
  const validPassword = user
    ? await bcrypt.compare(value.mat_khau, user.mat_khau_ma_hoa)
    : false;

  // Khong phan biet email khong ton tai hay sai mat khau.
  if (!user || !validPassword || user.trang_thai !== 'HOAT_DONG') {
    return res.status(401).json({ message: 'Email hoac mat khau khong dung, hoac tai khoan da bi khoa.' });
  }

  return res.json({
    message: 'Dang nhap thanh cong.',
    accessToken: signAccessToken(user),
    tokenType: 'Bearer',
    expiresIn: 900,
    user: publicUser(user),
  });
}

function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, me };
