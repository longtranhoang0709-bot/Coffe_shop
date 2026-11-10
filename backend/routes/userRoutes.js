const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const controller = require("../controllers/userController");

const router = express.Router();

// Tat ca API ben duoi phai dang nhap.
router.use(authMiddleware);

// Thong tin tai khoan hien tai
router.get("/me", controller.getMe);
router.patch("/me", controller.patchMe);

// So dia chi cua nguoi dang nhap (khong truy cap duoc cua nguoi khac)
router.get("/me/addresses", controller.listAddresses);
router.post("/me/addresses", controller.addAddress);
router.patch("/me/addresses/:addressId", controller.patchAddress);
router.patch("/me/addresses/:addressId/default", controller.setDefaultAddress);
router.delete("/me/addresses/:addressId", controller.removeAddress);

// Quan tri vien: xem va quan ly tai khoan
router.get("/", allowRoles("ADMIN"), controller.adminList);
router.get("/:userId", allowRoles("ADMIN"), controller.adminGet);
router.patch("/:userId/status", allowRoles("ADMIN"), controller.adminStatus);
router.patch("/:userId/role", allowRoles("ADMIN"), controller.adminRole);

module.exports = router;
