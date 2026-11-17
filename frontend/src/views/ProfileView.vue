<script setup>
import { reactive, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { UserRound, MapPin, LogOut, Plus, Trash2, Star } from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
import { useCartStore } from "../stores/cart";
import {
  getProfile,
  saveProfile,
  listAddresses,
  createAddress,
  editAddress,
  setDefaultAddress,
  removeAddress,
} from "../api/user";
import { errorText } from "../api/axios";
const auth = useAuthStore(),
  cart = useCartStore(),
  router = useRouter();
const loading = ref(true),
  saving = ref(false),
  message = ref(""),
  error = ref(""),
  addresses = ref([]);
const profile = reactive({ ho_ten: "", so_dien_thoai: "" });
const addressForm = reactive({
  ten_nguoi_nhan: "",
  sdt_nguoi_nhan: "",
  tinh_thanh: "",
  quan_huyen: "",
  phuong_xa: "",
  dia_chi_chi_tiet: "",
  la_mac_dinh: false,
});
const showAddressForm = ref(false),
  editId = ref(null),
  activeTab = ref("profile");
async function load() {
  loading.value = true;
  try {
    const [user, items] = await Promise.all([getProfile(), listAddresses()]);
    Object.assign(profile, {
      ho_ten: user.ho_ten || "",
      so_dien_thoai: user.so_dien_thoai || "",
    });
    auth.user = user;
    addresses.value = items || [];
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
async function save() {
  saving.value = true;
  message.value = "";
  error.value = "";
  try {
    const data = await saveProfile({
      ...profile,
      so_dien_thoai: profile.so_dien_thoai || null,
    });
    auth.user = data.user;
    message.value = "Đã cập nhật thông tin cá nhân.";
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
function resetAddress() {
  Object.assign(addressForm, {
    ten_nguoi_nhan: auth.user?.ho_ten || "",
    sdt_nguoi_nhan: auth.user?.so_dien_thoai || "",
    tinh_thanh: "",
    quan_huyen: "",
    phuong_xa: "",
    dia_chi_chi_tiet: "",
    la_mac_dinh: false,
  });
  editId.value = null;
  showAddressForm.value = true;
}
function edit(a) {
  editId.value = a.ma_dia_chi;
  Object.assign(addressForm, {
    ten_nguoi_nhan: a.ten_nguoi_nhan,
    sdt_nguoi_nhan: a.sdt_nguoi_nhan,
    tinh_thanh: a.tinh_thanh,
    quan_huyen: a.quan_huyen || "",
    phuong_xa: a.phuong_xa,
    dia_chi_chi_tiet: a.dia_chi_chi_tiet,
    la_mac_dinh: Boolean(a.la_mac_dinh),
  });
  showAddressForm.value = true;
}
async function addressSave() {
  saving.value = true;
  message.value = "";
  error.value = "";
  try {
    const payload = {
      ten_nguoi_nhan: addressForm.ten_nguoi_nhan,
      sdt_nguoi_nhan: addressForm.sdt_nguoi_nhan,
      tinh_thanh: addressForm.tinh_thanh,
      quan_huyen: addressForm.quan_huyen || null,
      phuong_xa: addressForm.phuong_xa,
      dia_chi_chi_tiet: addressForm.dia_chi_chi_tiet,
    };
    if (editId.value) {
      await editAddress(editId.value, payload);
      if (addressForm.la_mac_dinh) await setDefaultAddress(editId.value);
    } else {
      await createAddress({ ...payload, la_mac_dinh: addressForm.la_mac_dinh });
    }
    addresses.value = await listAddresses();
    showAddressForm.value = false;
    message.value = "Địa chỉ đã được lưu.";
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
async function makeDefault(id) {
  error.value = "";
  try {
    await setDefaultAddress(id);
    addresses.value = await listAddresses();
  } catch (e) {
    error.value = errorText(e);
  }
}
async function erase(id) {
  if (!window.confirm("Xóa địa chỉ này?")) return;
  error.value = "";
  try {
    await removeAddress(id);
    addresses.value = await listAddresses();
  } catch (e) {
    error.value = errorText(e);
  }
}
function logout() {
  auth.logout();
  cart.reset();
  router.push("/");
}
</script>
<template>
  <div class="container">
    <div class="page-top">
      <span class="eyebrow">YOUR ACCOUNT</span>
      <h1 class="display">Tài khoản của tôi.</h1>
      <p>Quản lý thông tin và các địa chỉ nhận hàng của bạn.</p>
    </div>
    <div class="profile-grid">
      <aside class="profile-sidebar">
        <h3>{{ auth.user?.ho_ten || "Khách hàng" }}</h3>
        <p>{{ auth.user?.email }}</p>
        <nav>
          <button @click="activeTab = 'profile'">
            <UserRound :size="16" /> Thông tin cá nhân</button
          ><button @click="activeTab = 'addresses'">
            <MapPin :size="16" /> Sổ địa chỉ</button
          ><RouterLink v-if="auth.isAdmin" to="/admin"
            >Quản trị hệ thống</RouterLink
          ><button @click="logout"><LogOut :size="16" /> Đăng xuất</button>
        </nav>
      </aside>
      <section class="profile-main">
        <div v-if="loading" class="busy">Đang tải thông tin...</div>
        <template v-else
          ><div
            v-if="message"
            class="notice notice-success"
            style="margin-bottom: 20px"
          >
            {{ message }}
          </div>
          <div
            v-if="error"
            class="notice notice-error"
            style="margin-bottom: 20px"
          >
            {{ error }}
          </div>
          <div v-if="activeTab === 'profile'">
            <h2>Thông tin cá nhân</h2>
            <form
              @submit.prevent="save"
              class="form-grid"
              style="max-width: 600px"
            >
              <div class="field">
                <label>Họ tên</label
                ><input
                  v-model="profile.ho_ten"
                  class="input"
                  required
                  minlength="2"
                  maxlength="150"
                />
              </div>
              <div class="field">
                <label>Số điện thoại</label
                ><input
                  v-model="profile.so_dien_thoai"
                  class="input"
                  autocomplete="tel"
                />
              </div>
              <div class="field" style="grid-column: 1/-1">
                <label>Email đăng nhập</label
                ><input
                  :value="auth.user?.email"
                  class="input"
                  disabled
                /><small class="muted"
                  >Để đảm bảo an toàn, email không thể thay đổi tại đây.</small
                >
              </div>
              <button class="btn btn-dark" :disabled="saving" type="submit">
                {{ saving ? "ĐANG LƯU..." : "LƯU THAY ĐỔI" }}
              </button>
            </form>
          </div>
          <div v-else>
            <div class="section-heading" style="margin-bottom: 25px">
              <h2 style="margin: 0">Sổ địa chỉ</h2>
              <button class="btn btn-light" @click="resetAddress">
                <Plus :size="15" /> THÊM ĐỊA CHỈ
              </button>
            </div>
            <div
              v-if="!addresses.length && !showAddressForm"
              class="empty-state"
            >
              <h3>Chưa có địa chỉ</h3>
              <p>Bổ sung địa chỉ để đặt hàng nhanh hơn.</p>
            </div>
            <div
              v-for="a in addresses"
              :key="a.ma_dia_chi"
              class="address-card"
            >
              <div>
                <strong>{{ a.ten_nguoi_nhan }}</strong
                ><span
                  v-if="a.la_mac_dinh"
                  class="tag"
                  style="margin-left: 10px"
                  >Mặc định</span
                >
                <p>{{ a.sdt_nguoi_nhan }}</p>
                <p>
                  {{ a.dia_chi_chi_tiet }}, {{ a.phuong_xa }},
                  {{ a.tinh_thanh }}
                </p>
              </div>
              <div
                style="
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                  align-items: end;
                "
              >
                <button class="text-button" @click="edit(a)">Sửa</button
                ><button
                  v-if="!a.la_mac_dinh"
                  class="text-button"
                  @click="makeDefault(a.ma_dia_chi)"
                >
                  Đặt mặc định</button
                ><button class="text-button" @click="erase(a.ma_dia_chi)">
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>
            <form
              v-if="showAddressForm"
              @submit.prevent="addressSave"
              class="form-grid"
              style="
                padding-top: 25px;
                border-top: 1px solid var(--line);
                margin-top: 24px;
              "
            >
              <h2 style="grid-column: 1/-1">
                {{ editId ? "Sửa địa chỉ" : "Địa chỉ mới" }}
              </h2>
              <div class="field">
                <label>Người nhận</label
                ><input
                  v-model="addressForm.ten_nguoi_nhan"
                  required
                  class="input"
                />
              </div>
              <div class="field">
                <label>Số điện thoại</label
                ><input
                  v-model="addressForm.sdt_nguoi_nhan"
                  required
                  class="input"
                />
              </div>
              <div class="field">
                <label>Tỉnh / thành phố</label
                ><input
                  v-model="addressForm.tinh_thanh"
                  required
                  class="input"
                  placeholder="TP. Hồ Chí Minh"
                />
              </div>
              <div class="field">
                <label>Phường / xã</label
                ><input
                  v-model="addressForm.phuong_xa"
                  required
                  class="input"
                />
              </div>
              <div class="field" style="grid-column: 1/-1">
                <label>Địa chỉ chi tiết</label
                ><input
                  v-model="addressForm.dia_chi_chi_tiet"
                  required
                  class="input"
                  placeholder="Số nhà, tên đường..."
                />
              </div>
              <label
                style="
                  grid-column: 1/-1;
                  font-size: 13px;
                  display: flex;
                  align-items: center;
                  gap: 9px;
                "
                ><input v-model="addressForm.la_mac_dinh" type="checkbox" /> Đặt
                làm địa chỉ mặc định</label
              >
              <div style="display: flex; gap: 10px">
                <button class="btn btn-dark" :disabled="saving" type="submit">
                  LƯU ĐỊA CHỈ</button
                ><button
                  class="btn btn-light"
                  type="button"
                  @click="showAddressForm = false"
                >
                  HỦY
                </button>
              </div>
            </form>
          </div></template
        >
      </section>
    </div>
  </div>
</template>
