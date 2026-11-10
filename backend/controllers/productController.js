const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const model = require("../models/productModel");
const categoryModel = require("../models/categoryModel");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "products");
const PRODUCT_TYPES = new Set(["DO_UONG", "DONG_GOI"]);

function intId(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function own(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function plainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}

// Validates JSON bodies based on a fixed schema. No user-supplied SQL columns.
function clean(body, schema, required = []) {
  if (!plainObject(body)) return { error: "Body phai la JSON object." };
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !own(schema, key)))
    return { error: "Co truong khong hop le hoac body rong." };
  if (required.some((key) => !own(body, key)))
    return {
      error: `Thieu truong bat buoc: ${required.find((key) => !own(body, key))}.`,
    };
  const data = {};
  for (const key of keys) {
    const [type, max, nullable] = schema[key];
    const value = body[key];
    if (nullable && (value === null || value === "")) {
      data[key] = null;
      continue;
    }
    if (type === "str") {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.trim().length > max
      ) {
        return { error: `${key} phai la chuoi tu 1 den ${max} ky tu.` };
      }
      data[key] = value.trim();
    } else if (type === "description") {
      if (value !== null && (typeof value !== "string" || value.length > max)) {
        return { error: `${key} phai la chuoi toi da ${max} ky tu hoac null.` };
      }
      data[key] = value?.trim() || null;
    } else if (type === "bool") {
      if (typeof value !== "boolean")
        return { error: `${key} phai la true hoac false.` };
      data[key] = value ? 1 : 0;
    } else if (type === "id" || type === "integer") {
      if (
        !Number.isSafeInteger(value) ||
        value < (type === "id" ? 1 : 0) ||
        value > 2147483647
      ) {
        return { error: `${key} phai la so nguyen hop le.` };
      }
      data[key] = value;
    } else if (type === "money") {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 9999999999.99 ||
        Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
      ) {
        return {
          error: `${key} phai la so khong am, toi da 2 chu so thap phan.`,
        };
      }
      data[key] = value.toFixed(2);
    }
  }
  return { data };
}

const productSchema = {
  ma_danh_muc: ["id"],
  ten_san_pham: ["str", 200],
  loai_san_pham: ["str", 50],
  mo_ta: ["description", 10000, true],
  dang_ban: ["bool"],
};
const variantSchema = {
  ma_sku: ["str", 50],
  ten_bien_the: ["str", 150],
  kich_co: ["str", 50, true],
  khoi_luong_gram: ["integer", null, true],
  loai_hat: ["str", 100, true],
  do_xay: ["str", 100, true],
  gia_ban: ["money"],
  dang_ban: ["bool"],
};
const groupSchema = {
  ten_nhom: ["str", 150],
  bat_buoc_chon: ["bool"],
  cho_chon_nhieu: ["bool"],
};
const optionSchema = {
  ten_tuy_chon: ["str", 150],
  gia_them: ["money"],
  dang_ban: ["bool"],
};
function duplicate(res, error) {
  if (error.code === "ER_DUP_ENTRY") {
    res.status(409).json({
      message: "Gia tri trung lap (vi du: ma_sku). Vui long doi gia tri.",
    });
    return true;
  }
  return false;
}

async function listPublic(req, res) {
  return list(req, res, false);
}
async function listAdmin(req, res) {
  return list(req, res, true);
}
async function list(req, res, isAdmin) {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 12 : Number(req.query.limit);
  const search = req.query.search ?? "";
  const type = req.query.type ?? "";
  const categoryId = req.query.categoryId ? intId(req.query.categoryId) : null;
  const sort = req.query.sort ?? "moi_nhat";
  const minPrice =
    req.query.minPrice === undefined || req.query.minPrice === ""
      ? null
      : Number(req.query.minPrice);
  const maxPrice =
    req.query.maxPrice === undefined || req.query.maxPrice === ""
      ? null
      : Number(req.query.maxPrice);
  const priceValid = (value) =>
    value === null ||
    (Number.isFinite(value) && value >= 0 && value <= 9999999999.99);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    typeof search !== "string" ||
    search.length > 100 ||
    typeof type !== "string" ||
    (type && !PRODUCT_TYPES.has(type)) ||
    (req.query.categoryId && !categoryId) ||
    !priceValid(minPrice) ||
    !priceValid(maxPrice) ||
    (minPrice !== null && maxPrice !== null && minPrice > maxPrice) ||
    !["moi_nhat", "gia_tang", "gia_giam"].includes(sort)
  ) {
    return res
      .status(400)
      .json({ message: "Tham so loc hoac phan trang khong hop le." });
  }
  return res.json(
    await model.listProducts({
      page,
      limit,
      search: search.trim(),
      type,
      categoryId,
      minPrice,
      maxPrice,
      sort,
      isAdmin,
    }),
  );
}
async function getPublic(req, res) {
  return get(req, res, false);
}
async function getAdmin(req, res) {
  return get(req, res, true);
}
async function get(req, res, isAdmin) {
  const productId = intId(req.params.productId);
  if (!productId)
    return res.status(400).json({ message: "Ma san pham khong hop le." });
  const product = await model.getProductDetail(productId, isAdmin);
  if (!product)
    return res.status(404).json({ message: "Khong tim thay san pham." });
  return res.json({ product });
}
async function createProduct(req, res) {
  const { data, error } = clean(req.body, productSchema, [
    "ma_danh_muc",
    "ten_san_pham",
    "loai_san_pham",
  ]);
  if (error) return res.status(400).json({ message: error });
  if (!PRODUCT_TYPES.has(data.loai_san_pham))
    return res
      .status(400)
      .json({ message: "loai_san_pham chi la DO_UONG hoac DONG_GOI." });
  const category = await categoryModel.getCategory(data.ma_danh_muc);
  if (!category || !category.dang_hoat_dong)
    return res
      .status(400)
      .json({ message: "Danh muc khong ton tai hoac da an." });
  data.dang_ban ??= 1;
  const product = await model.createProduct(data);
  return res.status(201).json({
    message: "Da tao san pham. Hay tao bien the de hien thi ngoai cua hang.",
    product,
  });
}
async function patchProduct(req, res) {
  const productId = intId(req.params.productId);
  if (!productId)
    return res.status(400).json({ message: "Ma san pham khong hop le." });
  const existing = await model.getProductBase(productId);
  if (!existing)
    return res.status(404).json({ message: "Khong tim thay san pham." });
  const { data, error } = clean(req.body, productSchema);
  if (error) return res.status(400).json({ message: error });
  if (own(data, "loai_san_pham") && !PRODUCT_TYPES.has(data.loai_san_pham))
    return res.status(400).json({ message: "Loai san pham khong hop le." });
  if (
    own(data, "loai_san_pham") &&
    data.loai_san_pham !== existing.loai_san_pham &&
    (await model.hasVariants(productId))
  ) {
    return res
      .status(409)
      .json({ message: "Khong doi loai san pham khi da co bien the." });
  }
  if (own(data, "ma_danh_muc")) {
    const category = await categoryModel.getCategory(data.ma_danh_muc);
    if (!category || !category.dang_hoat_dong)
      return res.status(400).json({ message: "Danh muc khong hop le." });
  }
  const product = await model.updateProduct(productId, data);
  return res.json({ message: "Da cap nhat san pham.", product });
}
async function deleteProduct(req, res) {
  const productId = intId(req.params.productId);
  if (!productId)
    return res.status(400).json({ message: "Ma san pham khong hop le." });
  const ok = await model.disableProduct(productId);
  if (!ok) return res.status(404).json({ message: "Khong tim thay san pham." });
  return res.json({
    message: "Da ngung ban san pham; lich su don hang duoc giu nguyen.",
  });
}

function validateVariantBusiness(data, type) {
  if (
    type === "DONG_GOI" &&
    (!Number.isSafeInteger(data.khoi_luong_gram) || data.khoi_luong_gram <= 0)
  ) {
    return "Ca phe dong goi can khoi_luong_gram la so nguyen duong.";
  }
  if (
    type === "DO_UONG" &&
    data.khoi_luong_gram !== undefined &&
    data.khoi_luong_gram !== null
  ) {
    return "Do uong khong dung khoi_luong_gram; hay dung kich_co.";
  }
  return null;
}
async function addVariant(req, res) {
  const productId = intId(req.params.productId);
  if (!productId)
    return res.status(400).json({ message: "Ma san pham khong hop le." });
  const product = await model.getProductBase(productId);
  if (!product)
    return res.status(404).json({ message: "Khong tim thay san pham." });
  const { data, error } = clean(req.body, variantSchema, [
    "ma_sku",
    "ten_bien_the",
    "gia_ban",
  ]);
  if (error) return res.status(400).json({ message: error });
  const businessError = validateVariantBusiness(data, product.loai_san_pham);
  if (businessError) return res.status(400).json({ message: businessError });
  data.dang_ban ??= 1;
  try {
    const variant = await model.createVariant(
      productId,
      data,
      product.loai_san_pham,
    );
    return res.status(201).json({ message: "Da tao bien the.", variant });
  } catch (error) {
    if (duplicate(res, error)) return;
    throw error;
  }
}
async function patchVariant(req, res) {
  const variantId = intId(req.params.variantId);
  if (!variantId)
    return res.status(400).json({ message: "Ma bien the khong hop le." });
  const current = await model.getVariant(variantId);
  if (!current)
    return res.status(404).json({ message: "Khong tim thay bien the." });
  const { data, error } = clean(req.body, variantSchema);
  if (error) return res.status(400).json({ message: error });
  const businessError = validateVariantBusiness(
    { ...current, ...data },
    current.loai_san_pham,
  );
  if (businessError) return res.status(400).json({ message: businessError });
  try {
    const variant = await model.updateVariant(variantId, data);
    return res.json({ message: "Da cap nhat bien the.", variant });
  } catch (error) {
    if (duplicate(res, error)) return;
    throw error;
  }
}
async function deleteVariant(req, res) {
  const variantId = intId(req.params.variantId);
  if (!variantId)
    return res.status(400).json({ message: "Ma bien the khong hop le." });
  if (!(await model.disableVariant(variantId)))
    return res.status(404).json({ message: "Khong tim thay bien the." });
  return res.json({
    message: "Da ngung ban bien the; khong xoa lich su don hang.",
  });
}

async function addGroup(req, res) {
  const productId = intId(req.params.productId);
  if (!productId)
    return res.status(400).json({ message: "Ma san pham khong hop le." });
  if (!(await model.getProductBase(productId)))
    return res.status(404).json({ message: "Khong tim thay san pham." });
  const { data, error } = clean(req.body, groupSchema, ["ten_nhom"]);
  if (error) return res.status(400).json({ message: error });
  data.bat_buoc_chon ??= 0;
  data.cho_chon_nhieu ??= 0;
  const group = await model.createGroup(productId, data);
  return res.status(201).json({ message: "Da tao nhom tuy chon.", group });
}
async function patchGroup(req, res) {
  const groupId = intId(req.params.groupId);
  if (!groupId)
    return res.status(400).json({ message: "Ma nhom tuy chon khong hop le." });
  if (!(await model.getGroup(groupId)))
    return res.status(404).json({ message: "Khong tim thay nhom." });
  const { data, error } = clean(req.body, groupSchema);
  if (error) return res.status(400).json({ message: error });
  const group = await model.updateGroup(groupId, data);
  return res.json({ message: "Da cap nhat nhom tuy chon.", group });
}
async function deleteGroup(req, res) {
  const groupId = intId(req.params.groupId);
  if (!groupId)
    return res.status(400).json({ message: "Ma nhom tuy chon khong hop le." });
  if (!(await model.getGroup(groupId)))
    return res.status(404).json({ message: "Khong tim thay nhom." });
  const ok = await model.deleteEmptyGroup(groupId);
  if (!ok)
    return res.status(409).json({
      message:
        "Nhom con gia tri tuy chon. Hay ngung su dung cac gia tri thay vi xoa.",
    });
  return res.json({ message: "Da xoa nhom tuy chon rong." });
}
async function addOption(req, res) {
  const groupId = intId(req.params.groupId);
  if (!groupId)
    return res.status(400).json({ message: "Ma nhom tuy chon khong hop le." });
  if (!(await model.getGroup(groupId)))
    return res.status(404).json({ message: "Khong tim thay nhom." });
  const { data, error } = clean(req.body, optionSchema, ["ten_tuy_chon"]);
  if (error) return res.status(400).json({ message: error });
  data.dang_ban ??= 1;
  const option = await model.createOption(groupId, data);
  return res.status(201).json({ message: "Da them gia tri tuy chon.", option });
}
async function patchOption(req, res) {
  const optionId = intId(req.params.optionId);
  if (!optionId)
    return res.status(400).json({ message: "Ma tuy chon khong hop le." });
  if (!(await model.getOption(optionId)))
    return res.status(404).json({ message: "Khong tim thay tuy chon." });
  const { data, error } = clean(req.body, optionSchema);
  if (error) return res.status(400).json({ message: error });
  const option = await model.updateOption(optionId, data);
  return res.json({ message: "Da cap nhat tuy chon.", option });
}
async function deleteOption(req, res) {
  const optionId = intId(req.params.optionId);
  if (!optionId)
    return res.status(400).json({ message: "Ma tuy chon khong hop le." });
  if (!(await model.disableOption(optionId)))
    return res.status(404).json({ message: "Khong tim thay tuy chon." });
  return res.json({ message: "Da an gia tri tuy chon." });
}

function detectImage(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return ".png";
  if (
    buffer.length >= 3 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  )
    return ".jpg";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return ".webp";
  return null;
}
async function uploadImage(req, res) {
  const productId = intId(req.params.productId);
  if (!productId)
    return res.status(400).json({ message: "Ma san pham khong hop le." });
  if (!(await model.getProductBase(productId)))
    return res.status(404).json({ message: "Khong tim thay san pham." });
  if (!req.file)
    return res
      .status(400)
      .json({ message: "Can chon file image (multipart/form-data)." });
  if (Object.keys(req.body).some((key) => key !== "la_anh_chinh"))
    return res
      .status(400)
      .json({ message: "Form chi duoc gui image va la_anh_chinh." });
  const primary = req.body.la_anh_chinh;
  if (primary !== undefined && !["true", "false", "1", "0"].includes(primary))
    return res
      .status(400)
      .json({ message: "la_anh_chinh phai la true/false." });
  const extension = detectImage(req.file.buffer);
  if (!extension)
    return res
      .status(400)
      .json({ message: "File khong phai JPEG, PNG hoac WEBP hop le." });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(absolutePath, req.file.buffer, { flag: "wx" });
  try {
    const image = await model.addImage(
      productId,
      `/uploads/products/${filename}`,
      ["true", "1"].includes(primary),
    );
    if (!image) {
      await fs.unlink(absolutePath).catch(() => {});
      return res.status(404).json({ message: "San pham khong con ton tai." });
    }
    return res.status(201).json({ message: "Da tai anh san pham.", image });
  } catch (error) {
    await fs.unlink(absolutePath).catch(() => {});
    throw error;
  }
}
async function setPrimaryImage(req, res) {
  const imageId = intId(req.params.imageId);
  if (!imageId)
    return res.status(400).json({ message: "Ma anh khong hop le." });
  const image = await model.setPrimaryImage(imageId);
  if (!image) return res.status(404).json({ message: "Khong tim thay anh." });
  return res.json({ message: "Da dat anh chinh.", image });
}
async function deleteImage(req, res) {
  const imageId = intId(req.params.imageId);
  if (!imageId)
    return res.status(400).json({ message: "Ma anh khong hop le." });
  const image = await model.deleteImage(imageId);
  if (!image) return res.status(404).json({ message: "Khong tim thay anh." });
  // Chi xoa file nam trong thu muc uploads/products, khong chap nhan path traversal.
  const matched =
    /^\/uploads\/products\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp))$/.exec(
      image.duong_dan_anh,
    );
  if (matched)
    await fs.unlink(path.join(UPLOAD_DIR, matched[1])).catch(() => {});
  return res.json({ message: "Da xoa anh; tu chon anh chinh moi neu can." });
}

module.exports = {
  listPublic,
  listAdmin,
  getPublic,
  getAdmin,
  createProduct,
  patchProduct,
  deleteProduct,
  addVariant,
  patchVariant,
  deleteVariant,
  addGroup,
  patchGroup,
  deleteGroup,
  addOption,
  patchOption,
  deleteOption,
  uploadImage,
  setPrimaryImage,
  deleteImage,
};
