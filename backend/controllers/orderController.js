"use strict";
const { createHash } = require("node:crypto");
const model = require("../models/orderModel");
const { fail, positiveInt, SHIPPING, PICKUP, METHODS, S } = model;

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const phone = (v) =>
  typeof v === "string" && /^\+?[0-9 .()-]{9,20}$/.test(v.trim());
const validText = (v, min, max) =>
  typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
const orderStatus = new Set(Object.values(S));
function parseId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw fail(400, "ID khong hop le.");
  const num = Number(value);
  if (!positiveInt(num)) throw fail(400, "ID khong hop le.");
  return num;
}
function send(err, res, next) {
  if (err.statusCode)
    return res.status(err.statusCode).json({ message: err.message });
  if (err.code === "ER_LOCK_DEADLOCK" || err.code === "ER_LOCK_WAIT_TIMEOUT")
    return res
      .status(409)
      .json({ message: "Du lieu dang duoc cap nhat, vui long thu lai." });
  return next(err);
}
function owner(req) {
  if (req.user) return { userId: req.user.ma_nguoi_dung, guestHash: null };
  const token = req.get("X-Guest-Token") || "";
  if (!/^[a-f0-9]{64}$/i.test(token))
    throw fail(401, "Can Bearer Token hoac X-Guest-Token hop le.");
  return {
    userId: null,
    guestHash: createHash("sha256").update(token.toLowerCase()).digest("hex"),
  };
}
function cleanQuote(body, requireContact = false) {
  if (!isObject(body)) throw fail(400, "Body phai la JSON object.");
  const allowed = [
    "hinh_thuc_nhan",
    "ma_khu_vuc",
    "ma_dia_chi",
    "ma_code",
    "tinh_thanh",
    "phuong_xa",
    "dia_chi_giao_hang",
    "ten_nguoi_nhan",
    "sdt_nguoi_nhan",
    "phuong_thuc",
    "thoi_gian_nhan",
    "ghi_chu",
  ];
  if (Object.keys(body).some((k) => !allowed.includes(k)))
    throw fail(400, "Body co truong khong duoc phep.");
  if (body.hinh_thuc_nhan !== SHIPPING && !PICKUP.has(body.hinh_thuc_nhan))
    throw fail(
      400,
      "hinh_thuc_nhan phai la GIAO_TAN_NOI, MANG_DI hoac TAI_QUAN.",
    );
  const isShipping = body.hinh_thuc_nhan === SHIPPING;
  if (isShipping && !positiveInt(body.ma_khu_vuc))
    throw fail(400, "Can ma_khu_vuc hop le.");
  if (!isShipping && body.ma_khu_vuc != null)
    throw fail(400, "Don tai quan/mang di khong can ma_khu_vuc.");
  if (body.ma_dia_chi != null && !positiveInt(body.ma_dia_chi))
    throw fail(400, "ma_dia_chi khong hop le.");
  if (!isShipping && body.ma_dia_chi != null)
    throw fail(400, "Dia chi chi danh cho don giao tan noi.");
  if (
    body.ma_dia_chi != null &&
    ["tinh_thanh", "phuong_xa", "dia_chi_giao_hang"].some(
      (k) => body[k] != null,
    )
  ) {
    throw fail(400, "Chi dung ma_dia_chi HOAC nhap dia chi truc tiep.");
  }
  const data = {
    hinh_thuc_nhan: body.hinh_thuc_nhan,
    ma_khu_vuc: body.ma_khu_vuc || null,
    ma_dia_chi: body.ma_dia_chi || null,
  };
  for (const [key, min, max] of [
    ["tinh_thanh", 2, 100],
    ["phuong_xa", 2, 100],
    ["dia_chi_giao_hang", 5, 255],
    ["ten_nguoi_nhan", 2, 150],
    ["ghi_chu", 0, 1000],
    ["ma_code", 1, 50],
  ]) {
    if (body[key] != null) {
      if (!validText(body[key], min, max))
        throw fail(400, `${key} khong hop le.`);
      data[key] = body[key].trim();
    }
  }
  if (body.sdt_nguoi_nhan != null) {
    if (!phone(body.sdt_nguoi_nhan))
      throw fail(400, "sdt_nguoi_nhan khong hop le.");
    data.sdt_nguoi_nhan = body.sdt_nguoi_nhan.trim();
  }
  if (body.thoi_gian_nhan != null) {
    if (
      typeof body.thoi_gian_nhan !== "string" ||
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(body.thoi_gian_nhan)
    ) {
      throw fail(400, "thoi_gian_nhan can dinh dang YYYY-MM-DD HH:mm:ss.");
    }
    data.thoi_gian_nhan = body.thoi_gian_nhan;
  }
  if (
    isShipping &&
    !data.ma_dia_chi &&
    (!data.tinh_thanh || !data.phuong_xa || !data.dia_chi_giao_hang)
  ) {
    throw fail(
      400,
      "Don giao hang can ma_dia_chi hoac dia chi nhap truc tiep.",
    );
  }
  if (requireContact) {
    if (!data.ma_dia_chi && (!data.ten_nguoi_nhan || !data.sdt_nguoi_nhan)) {
      throw fail(400, "Can ten_nguoi_nhan va sdt_nguoi_nhan.");
    }
    if (!isShipping && (!data.ten_nguoi_nhan || !data.sdt_nguoi_nhan))
      throw fail(400, "Can thong tin nguoi nhan.");
    if (!METHODS.has(body.phuong_thuc))
      throw fail(400, "phuong_thuc chi duoc COD, TIEN_MAT hoac VNPAY.");
    if (isShipping && body.phuong_thuc === "TIEN_MAT")
      throw fail(400, "Don giao hang chi ho tro COD hoac VNPAY.");
    if (!isShipping && body.phuong_thuc === "COD")
      throw fail(400, "Don tai quan/mang di chi ho tro TIEN_MAT hoac VNPAY.");
    data.phuong_thuc = body.phuong_thuc;
  }
  return data;
}
function pageInfo(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!positiveInt(page) || !positiveInt(limit) || limit > 50)
    throw fail(400, "page/limit khong hop le (limit toi da 50).");
  return { page, limit };
}
async function preview(req, res, next) {
  try {
    res.set("Cache-Control", "no-store");
    return res.json(await model.preview(owner(req), cleanQuote(req.body)));
  } catch (e) {
    return send(e, res, next);
  }
}
async function create(req, res, next) {
  try {
    const result = await model.create(owner(req), cleanQuote(req.body, true));
    res.set("Cache-Control", "no-store");
    return res.status(201).json({ message: "Da tao don hang.", ...result });
  } catch (e) {
    return send(e, res, next);
  }
}
async function listMine(req, res, next) {
  try {
    const p = pageInfo(req.query);
    return res.json(
      await model.customerOrders(req.user.ma_nguoi_dung, p.page, p.limit),
    );
  } catch (e) {
    return send(e, res, next);
  }
}
async function getMine(req, res, next) {
  try {
    const result = await model.getDetail(parseId(req.params.id));
    if (result.ma_nguoi_dung !== req.user.ma_nguoi_dung)
      throw fail(404, "Khong tim thay don hang cua ban.");
    return res.json(result);
  } catch (e) {
    return send(e, res, next);
  }
}
function guestInfo(body) {
  if (
    !isObject(body) ||
    !validText(body.ma_don, 10, 50) ||
    !phone(body.sdt_nguoi_nhan)
  ) {
    throw fail(400, "Can ma_don va sdt_nguoi_nhan hop le.");
  }
  return { code: body.ma_don.trim(), phone: body.sdt_nguoi_nhan.trim() };
}
async function guestLookup(req, res, next) {
  try {
    const d = guestInfo(req.body);
    res.set("Cache-Control", "no-store");
    return res.json(await model.guestLookup(d.code, d.phone));
  } catch (e) {
    return send(e, res, next);
  }
}
async function guestCancel(req, res, next) {
  try {
    const d = guestInfo(req.body);
    const order = await model.guestLookup(d.code, d.phone);
    return res.json(
      await model.cancelOrder(order.ma_don_hang, { kind: "guest", ...d }),
    );
  } catch (e) {
    return send(e, res, next);
  }
}
async function cancelMine(req, res, next) {
  try {
    return res.json(
      await model.cancelOrder(parseId(req.params.id), {
        kind: "customer",
        userId: req.user.ma_nguoi_dung,
      }),
    );
  } catch (e) {
    return send(e, res, next);
  }
}
async function listAdmin(req, res, next) {
  try {
    const p = pageInfo(req.query),
      status = req.query.status || null;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (status && !orderStatus.has(status))
      throw fail(400, "status khong hop le.");
    if (search.length > 100) throw fail(400, "Tu khoa qua dai.");
    return res.json(await model.adminOrders({ ...p, status, search }));
  } catch (e) {
    return send(e, res, next);
  }
}
async function getAdmin(req, res, next) {
  try {
    return res.json(await model.getDetail(parseId(req.params.id)));
  } catch (e) {
    return send(e, res, next);
  }
}
async function cancelAdmin(req, res, next) {
  try {
    return res.json(
      await model.cancelOrder(parseId(req.params.id), {
        kind: "staff",
        userId: req.user.ma_nguoi_dung,
      }),
    );
  } catch (e) {
    return send(e, res, next);
  }
}
async function statusAdmin(req, res, next) {
  try {
    if (
      !isObject(req.body) ||
      Object.keys(req.body).some(
        (k) => !["trang_thai_don", "da_thu_tien"].includes(k),
      )
    )
      throw fail(400, "Body khong hop le.");
    const status = req.body.trang_thai_don;
    if (!orderStatus.has(status))
      throw fail(400, "trang_thai_don khong hop le.");
    const received = req.body.da_thu_tien === true;
    if (
      req.body.da_thu_tien !== undefined &&
      typeof req.body.da_thu_tien !== "boolean"
    )
      throw fail(400, "da_thu_tien phai la boolean.");
    return res.json(
      await model.changeStatus(
        parseId(req.params.id),
        status,
        req.user.ma_nguoi_dung,
        received,
      ),
    );
  } catch (e) {
    return send(e, res, next);
  }
}
async function patchShipment(req, res, next) {
  try {
    if (!isObject(req.body)) throw fail(400, "Body khong hop le.");
    const allowed = ["don_vi_van_chuyen", "ma_van_don"];
    const keys = Object.keys(req.body);
    if (!keys.length || keys.some((k) => !allowed.includes(k)))
      throw fail(400, "Chi cho phep sua don_vi_van_chuyen va ma_van_don.");
    const data = {};
    for (const k of keys) {
      if (
        req.body[k] !== null &&
        !validText(req.body[k], 1, k === "don_vi_van_chuyen" ? 150 : 100)
      )
        throw fail(400, `${k} khong hop le.`);
      data[k] = req.body[k] === null ? null : req.body[k].trim();
    }
    return res.json(await model.updateShipment(parseId(req.params.id), data));
  } catch (e) {
    return send(e, res, next);
  }
}
module.exports = {
  preview,
  create,
  listMine,
  getMine,
  guestLookup,
  guestCancel,
  cancelMine,
  listAdmin,
  getAdmin,
  cancelAdmin,
  statusAdmin,
  patchShipment,
};
