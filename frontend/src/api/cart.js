import api from "./axios";

export const newGuestCart = () => api.post("/cart/guest").then((r) => r.data);
export const readCart = () => api.get("/cart").then((r) => r.data);
export const insertCartItem = (payload) =>
  api.post("/cart/items", payload).then((r) => r.data);
export const patchCartItem = (itemId, payload) =>
  api.patch(`/cart/items/${itemId}`, payload).then((r) => r.data);
export const deleteCartItem = (itemId) =>
  api.delete(`/cart/items/${itemId}`).then((r) => r.data);
export const deleteCart = () => api.delete("/cart").then((r) => r.data);
