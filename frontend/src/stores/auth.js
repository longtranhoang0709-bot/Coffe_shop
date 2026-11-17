import { defineStore } from "pinia";
import { fetchMe, loginAccount, registerAccount } from "../api/auth";
import { errorText } from "../api/axios";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    initialized: false,
    loading: false,
    error: "",
  }),
  getters: {
    loggedIn: (state) =>
      Boolean(state.user && localStorage.getItem("accessToken")),
    role: (state) => state.user?.vai_tro || "",
    isAdmin: (state) => state.user?.vai_tro === "ADMIN",
    isStaff: (state) => ["STAFF", "ADMIN"].includes(state.user?.vai_tro),
  },
  actions: {
    async bootstrap() {
      if (this.initialized) return;
      const token = localStorage.getItem("accessToken");
      if (!token) {
        this.initialized = true;
        return;
      }
      try {
        this.user = await fetchMe();
      } catch (error) {
        // Loi 401 la token khong hop le. Loi mang se de nguoi dung thu lai.
        if (error.response?.status === 401)
          localStorage.removeItem("accessToken");
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },
    async login(email, password) {
      this.loading = true;
      this.error = "";
      try {
        const data = await loginAccount({ email, mat_khau: password });
        if (!data.accessToken || !data.user)
          throw new Error("Phản hồi đăng nhập không hợp lệ.");
        localStorage.setItem("accessToken", data.accessToken);
        this.user = data.user;
        this.initialized = true;
        return data.user;
      } catch (error) {
        this.error = errorText(
          error,
          error.message || "Đăng nhập không thành công.",
        );
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async register(payload) {
      this.loading = true;
      this.error = "";
      try {
        return await registerAccount(payload);
      } catch (error) {
        this.error = errorText(error, "Đăng ký không thành công.");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      localStorage.removeItem("accessToken");
      this.user = null;
      this.error = "";
      this.initialized = true;
    },
  },
});
