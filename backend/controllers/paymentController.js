"use strict";
const model = require("../models/paymentModel");
const vnpay = require("../services/vnpayService");
function sendError(e, res, next) {
  return e.statusCode
    ? res.status(e.statusCode).json({ message: e.message })
    : next(e);
}
function getIdentity(req) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw vnpay.invalid("Body JSON khong hop le.");
  if (req.user) {
    const id = Number(body.ma_don_hang);
    if (!Number.isSafeInteger(id) || id < 1)
      throw vnpay.invalid("Can ma_don_hang hop le.");
    return { userId: req.user.ma_nguoi_dung, ma_don_hang: id };
  }
  return {
    userId: null,
    ma_don: body.ma_don,
    sdt_nguoi_nhan: body.sdt_nguoi_nhan,
  };
}
async function create(req, res, next) {
  try {
    const data = await model.startPayment(
      getIdentity(req),
      vnpay.clientIp(req),
    );
    res.set("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (e) {
    return sendError(e, res, next);
  }
}
async function ipn(req, res) {
  res.set("Cache-Control", "no-store");
  try {
    const parsed = vnpay.parseSignedQuery(req.originalUrl);
    if (!parsed.ok)
      return res
        .status(200)
        .json({ RspCode: "97", Message: "Invalid Checksum" });
    const result = await model.applyIpn(parsed.params);
    return res.status(200).json(result);
  } catch (e) {
    console.error("VNPay IPN error:", e.message);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
}
function returnPage(req, res) {
  res.set("Cache-Control", "no-store");
  try {
    const check = vnpay.parseSignedQuery(req.originalUrl);
    if (!check.ok)
      return res
        .status(400)
        .json({ hop_le: false, message: "Chu ky VNPay khong hop le." });
    return res.json({
      hop_le: true,
      ma_tham_chieu: check.params.vnp_TxnRef,
      ma_phan_hoi: check.params.vnp_ResponseCode,
      trang_thai_vnpay: check.params.vnp_TransactionStatus,
      message:
        "Day la ket qua hien thi tu VNPay. Trang thai trong CSDL CHI duoc cap nhat qua IPN da xac minh; hay kiem tra API trang thai.",
    });
  } catch (e) {
    return res
      .status(503)
      .json({ hop_le: false, message: "Khong doc duoc ket qua thanh toan." });
  }
}
async function status(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      throw vnpay.invalid("ID don khong hop le.");
    res.set("Cache-Control", "no-store");
    return res.json(await model.findStatus(req.user.ma_nguoi_dung, id));
  } catch (e) {
    return sendError(e, res, next);
  }
}
module.exports = { create, ipn, returnPage, status };
