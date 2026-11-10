const model = require("../models/categoryModel");

function idFrom(raw) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function bodyObject(body) {
  return body && typeof body === "object" && !Array.isArray(body);
}
function validate(body, create) {
  if (!bodyObject(body)) return { error: "Body phai la JSON object." };
  const allowed = ["ten_danh_muc", "mo_ta", "dang_hoat_dong"];
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !allowed.includes(key))) {
    return { error: "Truong du lieu danh muc khong hop le." };
  }
  if (create && !Object.hasOwn(body, "ten_danh_muc"))
    return { error: "Thieu ten_danh_muc." };
  const result = {};
  if (Object.hasOwn(body, "ten_danh_muc")) {
    if (
      typeof body.ten_danh_muc !== "string" ||
      body.ten_danh_muc.trim().length < 2 ||
      body.ten_danh_muc.trim().length > 150
    ) {
      return { error: "ten_danh_muc phai co 2-150 ky tu." };
    }
    result.ten_danh_muc = body.ten_danh_muc.trim();
  }
  if (Object.hasOwn(body, "mo_ta")) {
    if (
      body.mo_ta !== null &&
      (typeof body.mo_ta !== "string" || body.mo_ta.length > 255)
    ) {
      return { error: "mo_ta phai la chuoi toi da 255 ky tu hoac null." };
    }
    result.mo_ta = body.mo_ta?.trim() || null;
  }
  if (Object.hasOwn(body, "dang_hoat_dong")) {
    if (typeof body.dang_hoat_dong !== "boolean")
      return { error: "dang_hoat_dong phai la true/false." };
    result.dang_hoat_dong = body.dang_hoat_dong;
  } else if (create) result.dang_hoat_dong = true;
  return { data: result };
}

async function listPublic(req, res) {
  return res.json({ categories: await model.listCategories(false) });
}
async function listAdmin(req, res) {
  return res.json({ categories: await model.listCategories(true) });
}
async function create(req, res) {
  const { data, error } = validate(req.body, true);
  if (error) return res.status(400).json({ message: error });
  return res
    .status(201)
    .json({
      message: "Da them danh muc.",
      category: await model.createCategory(data),
    });
}
async function update(req, res) {
  const categoryId = idFrom(req.params.categoryId);
  if (!categoryId)
    return res.status(400).json({ message: "Ma danh muc khong hop le." });
  if (!(await model.getCategory(categoryId)))
    return res.status(404).json({ message: "Khong tim thay danh muc." });
  const { data, error } = validate(req.body, false);
  if (error) return res.status(400).json({ message: error });
  return res.json({
    message: "Da cap nhat danh muc.",
    category: await model.updateCategory(categoryId, data),
  });
}
async function disable(req, res) {
  const categoryId = idFrom(req.params.categoryId);
  if (!categoryId)
    return res.status(400).json({ message: "Ma danh muc khong hop le." });
  if (!(await model.disableCategory(categoryId)))
    return res.status(404).json({ message: "Khong tim thay danh muc." });
  return res.json({
    message: "Da an danh muc, du lieu san pham van duoc giu.",
  });
}
module.exports = { listPublic, listAdmin, create, update, disable };
