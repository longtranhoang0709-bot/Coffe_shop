"use strict";
const express = require("express");
const auth = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const ctrl = require("../controllers/orderController");
const router = express.Router();

// Jwt neu co Authorization. Neu khong co thi su dung X-Guest-Token cho gio khach.
router.use((req, res, next) =>
  req.get("authorization") ? auth(req, res, next) : next(),
);
const mustLogin = (req, res, next) =>
  req.user ? next() : res.status(401).json({ message: "Vui long dang nhap." });

router.post("/preview", ctrl.preview);
router.post("/", ctrl.create);
router.post("/guest/lookup", ctrl.guestLookup);
router.post("/guest/cancel", ctrl.guestCancel);

router.get(
  "/admin/list",
  mustLogin,
  allowRoles("STAFF", "ADMIN"),
  ctrl.listAdmin,
);
router.get(
  "/admin/:id",
  mustLogin,
  allowRoles("STAFF", "ADMIN"),
  ctrl.getAdmin,
);
router.patch(
  "/admin/:id/status",
  mustLogin,
  allowRoles("STAFF", "ADMIN"),
  ctrl.statusAdmin,
);
router.patch(
  "/admin/:id/shipping",
  mustLogin,
  allowRoles("STAFF", "ADMIN"),
  ctrl.patchShipment,
);
router.post(
  "/admin/:id/cancel",
  mustLogin,
  allowRoles("STAFF", "ADMIN"),
  ctrl.cancelAdmin,
);

router.get("/", mustLogin, ctrl.listMine);
router.get("/:id", mustLogin, ctrl.getMine);
router.post("/:id/cancel", mustLogin, ctrl.cancelMine);
module.exports = router;
