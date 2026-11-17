import { defineStore } from "pinia";
import {
  newGuestCart,
  readCart,
  insertCartItem,
  patchCartItem,
  deleteCartItem,
  deleteCart,
} from "../api/cart";
import { errorText } from "../api/axios";

const emptyCart = () => ({
  items: [],
  tong_so_luong: 0,
  tam_tinh: 0,
  co_the_dat_hang: false,
});

export const useCartStore = defineStore("cart", {
  state: () => ({ cart: emptyCart(), loading: false, error: "" }),
  getters: {
    count: (state) => state.cart?.tong_so_luong || 0,
    items: (state) => state.cart?.items || [],
    subtotal: (state) => Number(state.cart?.tam_tinh || 0),
  },
  actions: {
    reset() {
      this.cart = emptyCart();
      this.error = "";
    },
    async ensureGuest() {
      if (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("coffeShopGuestToken")
      )
        return;
      const data = await newGuestCart();
      localStorage.setItem("coffeShopGuestToken", data.guestToken);
    },
    async refresh() {
      // Chua co gio khach thi khong gui request khong du token.
      if (
        !localStorage.getItem("accessToken") &&
        !localStorage.getItem("coffeShopGuestToken")
      ) {
        this.reset();
        return;
      }
      this.loading = true;
      try {
        this.cart = await readCart();
        this.error = "";
      } catch (error) {
        this.error = errorText(error);
        if (
          error.response?.status === 401 &&
          !localStorage.getItem("accessToken")
        ) {
          localStorage.removeItem("coffeShopGuestToken");
          this.reset();
        }
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async add(payload) {
      this.loading = true;
      try {
        await this.ensureGuest();
        const data = await insertCartItem(payload);
        this.cart = data;
        this.error = "";
        return data;
      } catch (error) {
        this.error = errorText(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async change(itemId, data) {
      const response = await patchCartItem(itemId, data);
      this.cart = response;
      return response;
    },
    async remove(itemId) {
      const response = await deleteCartItem(itemId);
      this.cart = response;
      return response;
    },
    async clear() {
      const response = await deleteCart();
      this.cart = response;
      return response;
    },
  },
});
