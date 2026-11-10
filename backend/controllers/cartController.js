"use strict";

const { randomBytes, createHash } = require("node:crypto");
const model = require("../models/cartModel");

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
function own(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function positiveId(value) {
  return Number.isSafeInteger(value) && value > 0;
}
function routeId(value) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;
  const id = Number(value);
  return positiveId(id) ? id : null;
}

// Khong bao gio lay userId tu body. req.user do authMiddleware cap.
function currentOwner(req) {
  if (req.user) return { userId: req.user.ma_nguoi_dung, guestHash: null };
  const guestToken = req.get("X-Guest-Token") || "";
  if (!/^[a-fA-F0-9]{64}$/.test(guestToken)) {
    throw fail(
      401,
      "Khach vang lai can X-Guest-Token. Goi POST /api/cart/guest truoc.",
    );
  }
  return {
    userId: null,
    guestHash: createHash("sha256")
      .update(guestToken.toLowerCase())
      .digest("hex"),
  };
}

function cleanItem(body, isCreate) {
  if (!object(body)) throw fail(400, "Body phai la JSON object.");
  const allowed = isCreate
    ? ["ma_bien_the", "so_luong", "tuy_chon_da_chon", "ghi_chu"]
    : ["so_luong", "tuy_chon_da_chon", "ghi_chu"];
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !allowed.includes(key))) {
    throw fail(400, "Body rong hoac chua truong khong duoc phep.");
  }
  if (isCreate && !positiveId(body.ma_bien_the)) {
    throw fail(400, "ma_bien_the phai la so nguyen duong.");
  }
  if (isCreate && !own(body, "so_luong")) throw fail(400, "Thieu so_luong.");
  if (
    own(body, "so_luong") &&
    (!Number.isInteger(body.so_luong) ||
      body.so_luong < 1 ||
      body.so_luong > 99)
  ) {
    throw fail(400, "so_luong phai la so nguyen tu 1 den 99.");
  }
  let options;
  if (own(body, "tuy_chon_da_chon")) {
    const a = body.tuy_chon_da_chon;
    if (
      !Array.isArray(a) ||
      a.length > 20 ||
      !a.every(positiveId) ||
      new Set(a).size !== a.length
    ) {
      throw fail(
        400,
        "tuy_chon_da_chon phai la mang ID khong trung, toi da 20 gia tri.",
      );
    }
    options = [...a].sort((x, y) => x - y);
  }
  let note;
  if (own(body, "ghi_chu")) {
    if (
      body.ghi_chu !== null &&
      (typeof body.ghi_chu !== "string" || body.ghi_chu.length > 500)
    ) {
      throw fail(400, "ghi_chu phai la chuoi toi da 500 ky tu hoac null.");
    }
    note = body.ghi_chu?.trim() || null;
  }
  return {
    ...(isCreate ? { ma_bien_the: body.ma_bien_the } : {}),
    ...(own(body, "so_luong") ? { so_luong: body.so_luong } : {}),
    ...(options !== undefined ? { tuy_chon_da_chon: options } : {}),
    ...(own(body, "ghi_chu") ? { ghi_chu: note } : {}),
  };
}

// Express 5 da chuyen loi async sang errorMiddleware.
// Xu ly loi nghiep vu o day de khong can tao them middleware hay utils.
function sendError(err, res, next) {
  if (err.statusCode)
    return res.status(err.statusCode).json({ message: err.message });
  return next(err);
}

async function createGuestCart(req, res, next) {
  try {
    if (req.user)
      throw fail(400, "Ban da dang nhap. Hay su dung GET /api/cart.");
    if (req.get("X-Guest-Token"))
      throw fail(400, "Khong gui X-Guest-Token khi tao gio khach moi.");
    const guestToken = randomBytes(32).toString("hex");
    const guestHash = createHash("sha256").update(guestToken).digest("hex");
    const id = await model.createGuestCart(guestHash);
    res.set("Cache-Control", "no-store");
    return res.status(201).json({
      message: "Da tao gio hang cho khach vang lai.",
      guestToken,
      ma_gio_hang: id,
      huong_dan:
        "Luu token, gui vao header X-Guest-Token cho cac API gio hang tiep theo.",
    });
  } catch (err) {
    return sendError(err, res, next);
  }
}
async function getCart(req, res, next) {
  try {
    const cart = await model.getCart(currentOwner(req));
    res.set("Cache-Control", "no-store");
    return res.json(cart);
  } catch (err) {
    return sendError(err, res, next);
  }
}
async function addItem(req, res, next) {
  try {
    const body = cleanItem(req.body, true);
    const cart = await model.addItem(currentOwner(req), {
      ...body,
      tuy_chon_da_chon: body.tuy_chon_da_chon || [],
      ghi_chu: body.ghi_chu ?? null,
    });
    res.set("Cache-Control", "no-store");
    return res.status(201).json({ message: "Da them vao gio hang.", ...cart });
  } catch (err) {
    return sendError(err, res, next);
  }
}
async function updateItem(req, res, next) {
  try {
    const id = routeId(req.params.itemId);
    if (!id) throw fail(400, "Ma chi tiet gio hang khong hop le.");
    const body = cleanItem(req.body, false);
    const cart = await model.updateItem(currentOwner(req), id, body);
    res.set("Cache-Control", "no-store");
    return res.json({ message: "Da cap nhat gio hang.", ...cart });
  } catch (err) {
    return sendError(err, res, next);
  }
}
async function deleteItem(req, res, next) {
  try {
    const id = routeId(req.params.itemId);
    if (!id) throw fail(400, "Ma chi tiet gio hang khong hop le.");
    const cart = await model.deleteItem(currentOwner(req), id);
    res.set("Cache-Control", "no-store");
    return res.json({ message: "Da xoa san pham khoi gio.", ...cart });
  } catch (err) {
    return sendError(err, res, next);
  }
}
async function clearCart(req, res, next) {
  try {
    const cart = await model.clearCart(currentOwner(req));
    res.set("Cache-Control", "no-store");
    return res.json({ message: "Da xoa toan bo gio hang.", ...cart });
  } catch (err) {
    return sendError(err, res, next);
  }
}

module.exports = {
  createGuestCart,
  getCart,
  addItem,
  updateItem,
  deleteItem,
  clearCart,
};
