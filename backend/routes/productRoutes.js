const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/productUploadMiddleware");
const controller = require("../controllers/productController");

const router = express.Router();
const adminOnly = [authMiddleware, allowRoles("ADMIN")];

// PUBLIC: xem menu, danh muc, chi tiet.
router.get("/", controller.listPublic);

// ADMIN: xem ca san pham chua cong khai; dat truoc route /:productId.
router.get("/admin/list", ...adminOnly, controller.listAdmin);
router.get("/admin/:productId", ...adminOnly, controller.getAdmin);
router.post("/", ...adminOnly, controller.createProduct);
router.patch("/:productId", ...adminOnly, controller.patchProduct);
router.delete("/:productId", ...adminOnly, controller.deleteProduct);

// ADMIN: bien the / size / khoi luong.
router.post("/:productId/variants", ...adminOnly, controller.addVariant);
router.patch("/variants/:variantId", ...adminOnly, controller.patchVariant);
router.delete("/variants/:variantId", ...adminOnly, controller.deleteVariant);

// ADMIN: nhom tuy chon va cac gia tri (duong, da, topping).
router.post("/:productId/option-groups", ...adminOnly, controller.addGroup);
router.patch("/option-groups/:groupId", ...adminOnly, controller.patchGroup);
router.delete("/option-groups/:groupId", ...adminOnly, controller.deleteGroup);
router.post(
  "/option-groups/:groupId/values",
  ...adminOnly,
  controller.addOption,
);
router.patch("/options/:optionId", ...adminOnly, controller.patchOption);
router.delete("/options/:optionId", ...adminOnly, controller.deleteOption);

// ADMIN: upload va quan ly hinh anh san pham.
router.post("/:productId/images", ...adminOnly, upload, controller.uploadImage);
router.patch("/images/:imageId/main", ...adminOnly, controller.setPrimaryImage);
router.delete("/images/:imageId", ...adminOnly, controller.deleteImage);

router.get("/:productId", controller.getPublic);
module.exports = router;
