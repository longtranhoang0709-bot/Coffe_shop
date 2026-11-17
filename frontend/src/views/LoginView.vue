<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowRight, Eye, EyeOff } from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
import { useCartStore } from "../stores/cart";
const email = ref(""),
  password = ref(""),
  visible = ref(false),
  auth = useAuthStore(),
  cart = useCartStore(),
  route = useRoute(),
  router = useRouter();
async function submit() {
  try {
    const user = await auth.login(email.value, password.value);
    cart.reset();
    try {
      await cart.refresh();
    } catch {}
    const redirect =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/") &&
      !route.query.redirect.startsWith("//")
        ? route.query.redirect
        : null;
    router.replace(redirect || (user.vai_tro === "ADMIN" ? "/admin" : "/"));
  } catch {
    /* error hien o form */
  }
}
</script>
<template>
  <div class="auth-wrap">
    <div class="auth-art">
      <img src="/images/hero-cup.svg" alt="Tách cà phê coffeShop" />
      <p>Every good day begins with coffee.</p>
    </div>
    <div class="auth-form-panel">
      <div class="auth-box">
        <span class="eyebrow">WELCOME BACK</span>
        <h1>Rất vui được<br />gặp lại bạn.</h1>
        <div
          v-if="route.query.registered"
          class="notice notice-success"
          style="margin: 15px 0"
        >
          Đăng ký thành công. Hãy đăng nhập bằng tài khoản vừa tạo.
        </div>
        <p>
          Đăng nhập để quản lý tài khoản và những lựa chọn cà phê yêu thích.
        </p>
        <form @submit.prevent="submit">
          <div class="field">
            <label for="email">Email</label
            ><input
              id="email"
              v-model.trim="email"
              class="input"
              type="email"
              autocomplete="email"
              placeholder="email@example.com"
              required
            />
          </div>
          <div class="field">
            <label for="password">Mật khẩu</label>
            <div style="display: flex; align-items: center; position: relative">
              <input
                id="password"
                v-model="password"
                class="input"
                :type="visible ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Nhập mật khẩu"
                required
                style="padding-right: 50px"
              /><button
                class="icon-btn"
                type="button"
                style="position: absolute; right: 8px"
                :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                @click="visible = !visible"
              >
                <EyeOff v-if="visible" :size="18" /><Eye v-else :size="18" />
              </button>
            </div>
          </div>
          <div v-if="auth.error" class="notice notice-error" role="alert">
            {{ auth.error }}
          </div>
          <button
            class="btn btn-dark btn-block"
            type="submit"
            :disabled="auth.loading"
          >
            {{ auth.loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP" }}
            <ArrowRight :size="17" />
          </button>
        </form>
        <p class="auth-bottom">
          Chưa có tài khoản?
          <RouterLink to="/register">Đăng ký ngay</RouterLink>
        </p>
        <p class="auth-bottom" style="line-height: 1.7">
          Quên mật khẩu? Tính năng đặt lại qua email sẽ được kết nối khi có API
          tương ứng; hiện tại chưa khả dụng.
        </p>
      </div>
    </div>
  </div>
</template>
