"use strict";

const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const reportController = require("../controllers/reportController");
const router = express.Router();

// Tat ca API thong ke chi ADMIN duoc truy cap.
router.use(authMiddleware, allowRoles("ADMIN"));
router.get("/dashboard", reportController.dashboard);
router.get("/overview", reportController.overview);
router.get("/revenue", reportController.revenue);
router.get("/top-products", reportController.topProducts);
router.get("/categories", reportController.categories);
router.get("/payment-methods", reportController.paymentMethods);
router.get("/order-statuses", reportController.orderStatuses);
router.get("/inventory", reportController.inventory);
router.get("/recent-orders", reportController.recentOrders);

module.exports = router;
