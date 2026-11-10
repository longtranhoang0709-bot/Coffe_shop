const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const controller = require("../controllers/categoryController");

const router = express.Router();
router.get("/", controller.listPublic);
router.get("/admin", authMiddleware, allowRoles("ADMIN"), controller.listAdmin);
router.post("/", authMiddleware, allowRoles("ADMIN"), controller.create);
router.patch(
  "/:categoryId",
  authMiddleware,
  allowRoles("ADMIN"),
  controller.update,
);
// DELETE la an danh muc; khong xoa vat ly san pham lien quan.
router.delete(
  "/:categoryId",
  authMiddleware,
  allowRoles("ADMIN"),
  controller.disable,
);
module.exports = router;
