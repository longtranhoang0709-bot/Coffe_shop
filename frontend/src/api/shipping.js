import api from "./axios";

// Backend /shipping/zones tra ve mang khu vuc dang hoat dong.
export const listDeliveryZones = () =>
  api.get("/shipping/zones").then((r) => r.data);
