"use strict";
const m = require("../models/inventoryModel");
function fail(s, msg) {
  return Object.assign(new Error(msg), { statusCode: s });
}
function send(e, res, next) {
  if (e.statusCode)
    return res.status(e.statusCode).json({ message: e.message });
  return next(e);
}
async function list(req, res, next) {
  try {
    return res.json(await m.list({ onlyLow: req.query.low === "true" }));
  } catch (e) {
    return send(e, res, next);
  }
}
async function patch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      throw fail(400, "ID khong hop le.");
    const v = req.body;
    if (!v || typeof v !== "object" || Array.isArray(v))
      throw fail(400, "Body khong hop le.");
    const keys = Object.keys(v);
    if (
      !keys.length ||
      keys.some((k) => !["so_luong_ton", "muc_ton_toi_thieu"].includes(k))
    )
      throw fail(400, "Chi duoc sua so_luong_ton va muc_ton_toi_thieu.");
    for (const k of keys)
      if (!Number.isSafeInteger(v[k]) || v[k] < 0 || v[k] > 100000000)
        throw fail(400, `${k} phai la so nguyen khong am.`);
    return res.json(await m.patch(id, v));
  } catch (e) {
    return send(e, res, next);
  }
}
module.exports = { list, patch };
