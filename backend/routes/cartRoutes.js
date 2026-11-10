"use strict";

const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/cartController");

const router = express.Router();

// Khi co Bearer token, dung chinh middleware JWT da chay o Module 1.
// Neu khong co token, API yeu cau X-Guest-Token (ngoai tru tao gio khach).
router.use((req, res, next) => {
  if (!req.get("authorization")) return next();
  return authMiddleware(req, res, next);
});

router.post("/guest", controller.createGuestCart);
router.get("/", controller.getCart);
router.post("/items", controller.addItem);
router.patch("/items/:itemId", controller.updateItem);
router.delete("/items/:itemId", controller.deleteItem);
router.delete("/", controller.clearCart);

module.exports = router;
