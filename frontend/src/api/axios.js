import axios from "axios";

export const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
export const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (
    (config.url?.startsWith("/cart") || config.url?.startsWith("/orders")) &&
    config.url !== "/cart/guest"
  ) {
    const guestToken = localStorage.getItem("coffeShopGuestToken");
    if (guestToken) config.headers["X-Guest-Token"] = guestToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const protectedCall = error.config?.headers?.Authorization;
    if (
      error.response?.status === 401 &&
      protectedCall &&
      !["/auth/login", "/auth/register"].includes(url)
    ) {
      localStorage.removeItem("accessToken");
      window.dispatchEvent(new Event("coffeShop:session-expired"));
    }
    return Promise.reject(error);
  },
);

export function errorText(
  error,
  fallback = "Có lỗi xảy ra. Vui lòng thử lại.",
) {
  if (error.response?.data?.message) return error.response.data.message;
  if (!error.response)
    return "Không kết nối được máy chủ. Hãy kiểm tra Backend ở cổng 3000.";
  return fallback;
}

export default api;
