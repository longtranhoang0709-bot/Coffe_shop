<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, Eye, EyeOff } from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
const form = reactive({
    ho_ten: "",
    email: "",
    so_dien_thoai: "",
    mat_khau: "",
    confirm: "",
  }),
  visible = ref(false),
  error = ref(""),
  auth = useAuthStore(),
  router = useRouter();
async function submit() {
  error.value = "";
  if (form.mat_khau !== form.confirm) {
    error.value = "Mật khẩu xác nhận không khớp.";
    return;
  }
  if (form.mat_khau.length < 8) {
    error.value = "Mật khẩu tối thiểu 8 ký tự.";
    return;
  }
  try {
    await auth.register({
      ho_ten: form.ho_ten,
      email: form.email,
      so_dien_thoai: form.so_dien_thoai,
      mat_khau: form.mat_khau,
    });
    router.push({ name: "login", query: { registered: "1" } });
  } catch {
    /* error tu auth store */
  }
}
</script>
<template>
  <div class="auth-wrap">
    <div class="auth-art">
      <img src="/images/pack.svg" alt="Cà phê hạt nguyên chất" />
      <p>Make a little room for your new ritual.</p>
    </div>
    <div class="auth-form-panel">
      <div class="auth-box">
        <span class="eyebrow">JOIN THE COFFESHOP CLUB</span>
        <h1>Bắt đầu cùng<br />coffeShop.</h1>
        <p>
          Đăng ký tài khoản để theo dõi đơn hàng và lưu địa chỉ nhận cà phê.
        </p>
        <form @submit.prevent="submit">
          <div class="field">
            <label for="name">Họ và tên</label
            ><input
              id="name"
              class="input"
              v-model.trim="form.ho_ten"
              autocomplete="name"
              required
              minlength="2"
              maxlength="150"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div class="field">
            <label for="regemail">Email</label
            ><input
              id="regemail"
              type="email"
              class="input"
              v-model.trim="form.email"
              autocomplete="email"
              required
              placeholder="email@example.com"
            />
          </div>
          <div class="field">
            <label for="phone">Số điện thoại (tùy chọn)</label
            ><input
              id="phone"
              class="input"
              v-model.trim="form.so_dien_thoai"
              autocomplete="tel"
              placeholder="090..."
            />
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="regpass">Mật khẩu</label
              ><input
                id="regpass"
                class="input"
                :type="visible ? 'text' : 'password'"
                v-model="form.mat_khau"
                minlength="8"
                required
                autocomplete="new-password"
              />
            </div>
            <div class="field">
              <label for="confirm">Nhập lại mật khẩu</label
              ><input
                id="confirm"
                class="input"
                :type="visible ? 'text' : 'password'"
                v-model="form.confirm"
                required
                autocomplete="new-password"
              />
            </div>
          </div>
          <button
            class="text-button"
            style="justify-self: start"
            type="button"
            @click="visible = !visible"
          >
            {{ visible ? "Ẩn mật khẩu" : "Hiện mật khẩu" }}
          </button>
          <div
            v-if="error || auth.error"
            class="notice notice-error"
            role="alert"
          >
            {{ error || auth.error }}
          </div>
          <button
            class="btn btn-dark btn-block"
            type="submit"
            :disabled="auth.loading"
          >
            {{ auth.loading ? "ĐANG ĐĂNG KÝ..." : "TẠO TÀI KHOẢN" }}
            <ArrowRight :size="17" />
          </button>
        </form>
        <p class="auth-bottom">
          Đã có tài khoản? <RouterLink to="/login">Đăng nhập</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
