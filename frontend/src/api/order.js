import api from "./axios";

// Module 5: bao gia, tao don, xem va huy don.
export const previewOrder = (payload) =>
  api.post("/orders/preview", payload).then((r) => r.data);
export const createOrder = (payload) =>
  api.post("/orders", payload).then((r) => r.data);
export const listMyOrders = (page = 1, limit = 10) =>
  api.get("/orders", { params: { page, limit } }).then((r) => r.data);
export const getMyOrder = (id) =>
  api.get(`/orders/${encodeURIComponent(id)}`).then((r) => r.data);
export const cancelMyOrder = (id) =>
  api.post(`/orders/${encodeURIComponent(id)}/cancel`).then((r) => r.data);
export const lookupGuestOrder = (payload) =>
  api.post("/orders/guest/lookup", payload).then((r) => r.data);
export const cancelGuestOrder = (payload) =>
  api.post("/orders/guest/cancel", payload).then((r) => r.data);
