"use strict";
const model = require("../models/shippingModel");
function fail(s, m) {
  return Object.assign(new Error(m), { statusCode: s });
}
function handle(err, res, next) {
  if (err.statusCode)
    return res.status(err.statusCode).json({ message: err.message });
  return next(err);
}
function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}
function parseId(s) {
  if (!/^[1-9]\d*$/.test(String(s)) || !Number.isSafeInteger(Number(s)))
    throw fail(400, "ID khong hop le.");
  return Number(s);
}
function clean(body, required) {
  if (!isObj(body)) throw fail(400, "Body khong hop le.");
  const allowed = [
    "ten_khu_vuc",
    "tinh_thanh",
    "phuong_xa",
    "cho_giao_do_uong",
    "cho_giao_dong_goi",
    "phi_giao_hang",
    "dang_ap_dung",
  ];
  const keys = Object.keys(body);
  if (!keys.length || keys.some((k) => !allowed.includes(k)))
    throw fail(400, "Body co truong khong hop le.");
  const d = {};
  for (const key of allowed) {
    if (!Object.hasOwn(body, key)) continue;
    const v = body[key];
    if (["ten_khu_vuc", "tinh_thanh", "phuong_xa"].includes(key)) {
      if (typeof v !== "string" || v.trim().length < 2 || v.trim().length > 150)
        throw fail(400, `${key} khong hop le.`);
      d[key] = v.trim();
    } else if (
      ["cho_giao_do_uong", "cho_giao_dong_goi", "dang_ap_dung"].includes(key)
    ) {
      if (typeof v !== "boolean") throw fail(400, `${key} phai boolean.`);
      d[key] = v ? 1 : 0;
    } else {
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        v < 0 ||
        v > 9999999999
      )
        throw fail(400, "phi_giao_hang khong hop le.");
      d[key] = Number(v.toFixed(2));
    }
  }
  if (required) {
    for (const k of [
      "ten_khu_vuc",
      "tinh_thanh",
      "phuong_xa",
      "cho_giao_do_uong",
      "cho_giao_dong_goi",
      "phi_giao_hang",
    ]) {
      if (!Object.hasOwn(d, k)) throw fail(400, `Can ${k}.`);
    }
  }
  return d;
}
async function publicList(req, res, next) {
  try {
    return res.json(await model.list());
  } catch (e) {
    return handle(e, res, next);
  }
}
async function adminList(req, res, next) {
  try {
    return res.json(await model.list(false));
  } catch (e) {
    return handle(e, res, next);
  }
}
async function create(req, res, next) {
  try {
    return res.status(201).json(await model.create(clean(req.body, true)));
  } catch (e) {
    return handle(e, res, next);
  }
}
async function update(req, res, next) {
  try {
    const row = await model.update(
      parseId(req.params.id),
      clean(req.body, false),
    );
    if (!row) throw fail(404, "Khong tim thay khu vuc.");
    return res.json(row);
  } catch (e) {
    return handle(e, res, next);
  }
}
module.exports = { publicList, adminList, create, update };
