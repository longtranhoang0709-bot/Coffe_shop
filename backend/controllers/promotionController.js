"use strict";
const m = require("../models/promotionModel");
function fail(s, msg) {
  return Object.assign(new Error(msg), { statusCode: s });
}
function send(e, res, next) {
  if (e.statusCode)
    return res.status(e.statusCode).json({ message: e.message });
  if (e.code === "ER_DUP_ENTRY")
    return res.status(409).json({ message: "Ma code da ton tai." });
  return next(e);
}
const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function dateVal(v) {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) &&
    !Number.isNaN(new Date(v.replace(" ", "T")).getTime())
  );
}
function clean(body, create) {
  if (!obj(body)) throw fail(400, "Body phai la JSON object.");
  const allowed = [
    "ma_code",
    "loai_giam",
    "gia_tri_giam",
    "don_toi_thieu",
    "giam_toi_da",
    "gioi_han_su_dung",
    "ngay_bat_dau",
    "ngay_ket_thuc",
    "dang_ap_dung",
  ];
  const keys = Object.keys(body);
  if (!keys.length || keys.some((k) => !allowed.includes(k)))
    throw fail(400, "Body co truong khong duoc phep.");
  const result = {};
  for (const k of keys) {
    const v = body[k];
    if (k === "ma_code") {
      if (
        typeof v !== "string" ||
        !/^[A-Z0-9_-]{3,50}$/.test(v.trim().toUpperCase())
      )
        throw fail(400, "ma_code tu 3-50 ky tu A-Z, 0-9, _, -.");
      result[k] = v.trim().toUpperCase();
    } else if (k === "loai_giam") {
      if (!["PHAN_TRAM", "SO_TIEN"].includes(v))
        throw fail(400, "loai_giam phai PHAN_TRAM hoac SO_TIEN.");
      result[k] = v;
    } else if (["gia_tri_giam", "don_toi_thieu", "giam_toi_da"].includes(k)) {
      if (v === null && k !== "gia_tri_giam") {
        result[k] = null;
        continue;
      }
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        v < 0 ||
        v > 9999999999 ||
        (k === "gia_tri_giam" && v === 0)
      )
        throw fail(400, `${k} khong hop le.`);
      result[k] = Number(v.toFixed(2));
    } else if (k === "gioi_han_su_dung") {
      if (v !== null && (!Number.isSafeInteger(v) || v < 0))
        throw fail(
          400,
          "gioi_han_su_dung phai la so nguyen khong am hoac null.",
        );
      result[k] = v;
    } else if (["ngay_bat_dau", "ngay_ket_thuc"].includes(k)) {
      if (!dateVal(v)) throw fail(400, `${k} phai la YYYY-MM-DD HH:mm:ss.`);
      result[k] = v;
    } else if (k === "dang_ap_dung") {
      if (typeof v !== "boolean") throw fail(400, "dang_ap_dung phai boolean.");
      result[k] = v ? 1 : 0;
    }
  }
  if (create) {
    for (const k of [
      "ma_code",
      "loai_giam",
      "gia_tri_giam",
      "ngay_bat_dau",
      "ngay_ket_thuc",
    ]) {
      if (!Object.hasOwn(result, k)) throw fail(400, `Can truong ${k}.`);
    }
    if (result.loai_giam === "PHAN_TRAM" && result.gia_tri_giam > 100)
      throw fail(400, "Phan tram toi da 100.");
    if (
      new Date(result.ngay_ket_thuc).getTime() <=
      new Date(result.ngay_bat_dau).getTime()
    )
      throw fail(400, "Ngay ket thuc phai sau ngay bat dau.");
  }
  return result;
}
async function list(req, res, next) {
  try {
    return res.json(await m.list());
  } catch (e) {
    return send(e, res, next);
  }
}
async function create(req, res, next) {
  try {
    return res.status(201).json(await m.insert(clean(req.body, true)));
  } catch (e) {
    return send(e, res, next);
  }
}
async function patch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      throw fail(400, "ID khong hop le.");
    return res.json(await m.update(id, clean(req.body, false)));
  } catch (e) {
    return send(e, res, next);
  }
}
module.exports = { list, create, patch };
