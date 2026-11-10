const userModel = require("../models/userModel");

const profileKeys = ["ho_ten", "so_dien_thoai"];
const addressKeys = [
  "ten_nguoi_nhan",
  "sdt_nguoi_nhan",
  "tinh_thanh",
  "quan_huyen",
  "phuong_xa",
  "dia_chi_chi_tiet",
];
const addressCreateKeys = [...addressKeys, "la_mac_dinh"];
const roleCodes = ["CUSTOMER", "STAFF", "ADMIN"];
const accountStatuses = ["HOAT_DONG", "BI_KHOA"];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateKeys(body, allowed, requireAtLeastOne = true) {
  if (!isObject(body)) return "Du lieu JSON phai la mot object.";
  const keys = Object.keys(body);
  if (requireAtLeastOne && !keys.length) return "Khong co truong can cap nhat.";
  if (keys.some((k) => !allowed.includes(k))) {
    return "Co truong khong hop le. Chi duoc gui cac truong cho phep.";
  }
  return null;
}

function validateText(value, label, maxLength, minLength = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < minLength ||
    value.trim().length > maxLength
  ) {
    return `${label} phai co tu ${minLength} den ${maxLength} ky tu.`;
  }
  return null;
}

function validatePhone(value) {
  return (
    typeof value === "string" && /^\+?[0-9 .()-]{9,20}$/.test(value.trim())
  );
}

function cleanProfile(body) {
  const err = validateKeys(body, profileKeys);
  if (err) return { error: err };
  const fields = {};
  if (Object.hasOwn(body, "ho_ten")) {
    const error = validateText(body.ho_ten, "Ho ten", 150, 2);
    if (error) return { error };
    fields.ho_ten = body.ho_ten.trim();
  }
  if (Object.hasOwn(body, "so_dien_thoai")) {
    const value = body.so_dien_thoai;
    if (value !== null && value !== "" && !validatePhone(value)) {
      return { error: "So dien thoai khong hop le." };
    }
    fields.so_dien_thoai = value ? value.trim() : null;
  }
  return { fields };
}

function cleanAddress(body, isCreate) {
  const allowed = isCreate ? addressCreateKeys : addressKeys;
  const err = validateKeys(body, allowed);
  if (err) return { error: err };
  const fields = {};
  const labels = {
    ten_nguoi_nhan: ["Ten nguoi nhan", 150, 2],
    tinh_thanh: ["Tinh thanh", 100, 2],
    phuong_xa: ["Phuong xa", 100, 2],
    dia_chi_chi_tiet: ["Dia chi chi tiet", 255, 5],
  };
  for (const [key, [label, max, min]] of Object.entries(labels)) {
    if (isCreate || Object.hasOwn(body, key)) {
      const error = validateText(body[key], label, max, min);
      if (error) return { error };
      fields[key] = body[key].trim();
    }
  }
  if (isCreate || Object.hasOwn(body, "sdt_nguoi_nhan")) {
    if (!validatePhone(body.sdt_nguoi_nhan)) {
      return { error: "So dien thoai nguoi nhan khong hop le." };
    }
    fields.sdt_nguoi_nhan = body.sdt_nguoi_nhan.trim();
  }
  if (isCreate || Object.hasOwn(body, "quan_huyen")) {
    const district = body.quan_huyen;
    if (district !== null && district !== undefined && district !== "") {
      const error = validateText(district, "Quan huyen", 100);
      if (error) return { error };
    }
    fields.quan_huyen = district ? district.trim() : null;
  }
  if (isCreate) {
    if (
      Object.hasOwn(body, "la_mac_dinh") &&
      typeof body.la_mac_dinh !== "boolean"
    ) {
      return { error: "la_mac_dinh phai la true hoac false." };
    }
    fields.la_mac_dinh = body.la_mac_dinh === true;
  }
  return { fields };
}

function positiveId(raw) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function getMe(req, res) {
  return res.json({ user: req.user });
}

async function patchMe(req, res) {
  const { fields, error } = cleanProfile(req.body);
  if (error) return res.status(400).json({ message: error });
  const user = await userModel.updateProfile(req.user.ma_nguoi_dung, fields);
  return res.json({ message: "Cap nhat ho so thanh cong.", user });
}

async function listAddresses(req, res) {
  const addresses = await userModel.listAddresses(req.user.ma_nguoi_dung);
  return res.json({ addresses });
}

async function addAddress(req, res) {
  const { fields, error } = cleanAddress(req.body, true);
  if (error) return res.status(400).json({ message: error });
  try {
    const address = await userModel.createAddress(
      req.user.ma_nguoi_dung,
      fields,
    );
    return res.status(201).json({ message: "Da them dia chi.", address });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Xung dot dia chi mac dinh. Vui long thu lai." });
    }
    throw err;
  }
}

async function patchAddress(req, res) {
  const id = positiveId(req.params.addressId);
  if (!id) return res.status(400).json({ message: "Ma dia chi khong hop le." });
  const { fields, error } = cleanAddress(req.body, false);
  if (error) return res.status(400).json({ message: error });
  const address = await userModel.updateAddress(
    req.user.ma_nguoi_dung,
    id,
    fields,
  );
  if (!address)
    return res.status(404).json({ message: "Khong tim thay dia chi cua ban." });
  return res.json({ message: "Da cap nhat dia chi.", address });
}

async function setDefaultAddress(req, res) {
  const id = positiveId(req.params.addressId);
  if (!id) return res.status(400).json({ message: "Ma dia chi khong hop le." });
  try {
    const address = await userModel.setDefaultAddress(
      req.user.ma_nguoi_dung,
      id,
    );
    if (!address)
      return res
        .status(404)
        .json({ message: "Khong tim thay dia chi cua ban." });
    return res.json({ message: "Da dat dia chi mac dinh.", address });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Xung dot dia chi mac dinh." });
    throw err;
  }
}

async function removeAddress(req, res) {
  const id = positiveId(req.params.addressId);
  if (!id) return res.status(400).json({ message: "Ma dia chi khong hop le." });
  const deleted = await userModel.deleteAddress(req.user.ma_nguoi_dung, id);
  if (!deleted)
    return res.status(404).json({ message: "Khong tim thay dia chi cua ban." });
  return res.json({ message: "Da xoa dia chi." });
}

async function adminList(req, res) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const search = req.query.search ?? "";
  const role = req.query.role ?? "";
  const status = req.query.status ?? "";
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    typeof search !== "string" ||
    search.length > 100 ||
    typeof role !== "string" ||
    (role && !roleCodes.includes(role)) ||
    typeof status !== "string" ||
    (status && !accountStatuses.includes(status))
  ) {
    return res
      .status(400)
      .json({ message: "Tham so loc hoac phan trang khong hop le." });
  }
  const result = await userModel.adminListUsers({
    page,
    limit,
    search: search.trim(),
    role,
    status,
  });
  return res.json(result);
}

async function adminGet(req, res) {
  const userId = positiveId(req.params.userId);
  if (!userId)
    return res.status(400).json({ message: "Ma nguoi dung khong hop le." });
  const user = await userModel.adminGetUser(userId);
  if (!user)
    return res.status(404).json({ message: "Khong tim thay tai khoan." });
  return res.json({ user });
}

async function adminStatus(req, res) {
  const userId = positiveId(req.params.userId);
  if (!userId)
    return res.status(400).json({ message: "Ma nguoi dung khong hop le." });
  const error = validateKeys(req.body, ["trang_thai"]);
  if (
    error ||
    !Object.hasOwn(req.body, "trang_thai") ||
    !accountStatuses.includes(req.body.trang_thai)
  ) {
    return res
      .status(400)
      .json({ message: "trang_thai phai la HOAT_DONG hoac BI_KHOA." });
  }
  if (userId === req.user.ma_nguoi_dung) {
    return res
      .status(403)
      .json({ message: "Khong duoc khoa tai khoan cua chinh minh." });
  }
  const before = await userModel.adminGetUser(userId);
  if (!before)
    return res.status(404).json({ message: "Khong tim thay tai khoan." });
  if (before.vai_tro === "ADMIN") {
    return res
      .status(403)
      .json({
        message: "Khong thay doi trang thai tai khoan Admin qua API nay.",
      });
  }
  const updated = await userModel.adminChangeStatus(
    userId,
    req.body.trang_thai,
  );
  if (!updated && before.trang_thai !== req.body.trang_thai) {
    return res
      .status(409)
      .json({ message: "Khong the cap nhat. Vui long thu lai." });
  }
  const user = await userModel.adminGetUser(userId);
  return res.json({ message: "Da cap nhat trang thai tai khoan.", user });
}

async function adminRole(req, res) {
  const userId = positiveId(req.params.userId);
  if (!userId)
    return res.status(400).json({ message: "Ma nguoi dung khong hop le." });
  const error = validateKeys(req.body, ["vai_tro"]);
  if (error || !["CUSTOMER", "STAFF"].includes(req.body.vai_tro)) {
    return res
      .status(400)
      .json({ message: "Chi cho phep chuyen vai tro CUSTOMER hoac STAFF." });
  }
  if (userId === req.user.ma_nguoi_dung) {
    return res
      .status(403)
      .json({ message: "Khong duoc tu doi quyen cua minh." });
  }
  const before = await userModel.adminGetUser(userId);
  if (!before)
    return res.status(404).json({ message: "Khong tim thay tai khoan." });
  if (before.vai_tro === "ADMIN") {
    return res
      .status(403)
      .json({ message: "Khong thay doi quyen Admin qua API nay." });
  }
  const updated = await userModel.adminChangeRole(userId, req.body.vai_tro);
  if (!updated && before.vai_tro !== req.body.vai_tro) {
    return res
      .status(409)
      .json({ message: "Khong the thay doi vai tro. Vui long thu lai." });
  }
  const user = await userModel.adminGetUser(userId);
  return res.json({ message: "Da cap nhat vai tro.", user });
}

module.exports = {
  getMe,
  patchMe,
  listAddresses,
  addAddress,
  patchAddress,
  setDefaultAddress,
  removeAddress,
  adminList,
  adminGet,
  adminStatus,
  adminRole,
};
