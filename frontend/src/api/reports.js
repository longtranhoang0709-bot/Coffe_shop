import api from "./axios";
const get = (path, params) =>
  api.get(`/reports/${path}`, { params }).then((r) => r.data);
export const getDashboard = (params) => get("dashboard", params);
export const getOverview = (params) => get("overview", params);
export const getRevenue = (params) => get("revenue", params);
export const getTopProducts = (params) => get("top-products", params);
export const getCategorySales = (params) => get("categories", params);
export const getPaymentMethods = (params) => get("payment-methods", params);
export const getOrderStatuses = (params) => get("order-statuses", params);
export const getInventoryAlerts = (params) => get("inventory", params);
export const getRecentOrders = (params) => get("recent-orders", params);
