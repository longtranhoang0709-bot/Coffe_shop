import api from "./axios";

export const loginAccount = (payload) =>
  api.post("/auth/login", payload).then((r) => r.data);
export const registerAccount = (payload) =>
  api.post("/auth/register", payload).then((r) => r.data);
export const fetchMe = () => api.get("/auth/me").then((r) => r.data.user);
