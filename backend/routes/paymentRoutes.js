"use strict";
const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/paymentController");
const router = express.Router();

// VNPay server-to-server: KHONG yeu cau JWT, bat buoc xac minh HMAC.
router.get("/vnpay/ipn", controller.ipn);
// Trang quay ve: chi hien thi ket qua, khong cap nhat trang thai thanh toan.
router.get("/vnpay/return", controller.returnPage);
// Nguoi dung da dang nhap hoac khach vang lai co ma don + so dien thoai.
router.post(
  "/vnpay/create",
  (req, res, next) =>
    req.get("authorization") ? authMiddleware(req, res, next) : next(),
  controller.create,
);
router.get("/vnpay/orders/:id", authMiddleware, controller.status);
module.exports = router;
