<script setup>
import { onMounted, ref } from "vue";
import { Plus } from "lucide-vue-next";
import * as api from "../../api/admin";
import { errorText } from "../../api/axios";
import { formatVND } from "../../format";
const rows = ref([]),
  loading = ref(false),
  saving = ref(false),
  error = ref(""),
  notice = ref(""),
  editing = ref(null);
const blank = () => ({
  ten_khu_vuc: "",
  tinh_thanh: "",
  phuong_xa: "",
  phi_giao_hang: 0,
  cho_giao_do_uong: false,
  cho_giao_dong_goi: true,
  dang_ap_dung: true,
});
const form = ref(blank());
async function load() {
  loading.value = true;
  try {
    rows.value = await api.adminZones();
    error.value = "";
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
function add() {
  editing.value = "new";
  form.value = blank();
}
function edit(item) {
  editing.value = item.ma_khu_vuc;
  form.value = {
    ...item,
    cho_giao_do_uong: Boolean(item.cho_giao_do_uong),
    cho_giao_dong_goi: Boolean(item.cho_giao_dong_goi),
    dang_ap_dung: Boolean(item.dang_ap_dung),
  };
}
function payload() {
  const f = form.value;
  return {
    ten_khu_vuc: f.ten_khu_vuc.trim(),
    tinh_thanh: f.tinh_thanh.trim(),
    phuong_xa: f.phuong_xa.trim(),
    phi_giao_hang: Number(f.phi_giao_hang),
    cho_giao_do_uong: Boolean(f.cho_giao_do_uong),
    cho_giao_dong_goi: Boolean(f.cho_giao_dong_goi),
    dang_ap_dung: Boolean(f.dang_ap_dung),
  };
}
async function save() {
  saving.value = true;
  error.value = "";
  try {
    if (editing.value === "new") await api.createZone(payload());
    else await api.updateZone(editing.value, payload());
    notice.value = "Đã lưu khu vực giao hàng.";
    editing.value = null;
    await load();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="admin-view">
    <div class="admin-page-heading">
      <div>
        <span class="eyebrow">DELIVERY</span>
        <h1>Khu vực giao hàng</h1>
        <p>Cấu hình giao đồ uống nội thành và cà phê đóng gói liên tỉnh.</p>
      </div>
      <button class="admin-btn dark" @click="add">
        <Plus :size="17" /> Thêm khu vực
      </button>
    </div>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-alert success">{{ notice }}</p>
    <div class="admin-panel admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Khu vực</th>
            <th>Đồ uống</th>
            <th>Đóng gói</th>
            <th>Phí giao</th>
            <th>Áp dụng</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="z in rows" :key="z.ma_khu_vuc">
            <td>
              <strong>{{ z.ten_khu_vuc }}</strong
              ><small class="admin-block-subtitle"
                >{{ z.phuong_xa }}, {{ z.tinh_thanh }}</small
              >
            </td>
            <td>{{ z.cho_giao_do_uong ? "Có" : "Không" }}</td>
            <td>{{ z.cho_giao_dong_goi ? "Có" : "Không" }}</td>
            <td>{{ formatVND(z.phi_giao_hang) }}</td>
            <td>
              <span
                class="admin-status"
                :class="z.dang_ap_dung ? 'ok' : 'muted'"
                >{{ z.dang_ap_dung ? "Đang áp dụng" : "Đã tắt" }}</span
              >
            </td>
            <td>
              <button class="admin-link" @click="edit(z)">Chỉnh sửa</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="6" class="admin-empty">
              {{ loading ? "Đang tải…" : "Chưa có khu vực giao hàng." }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="editing !== null"
      class="admin-modal-backdrop"
      @click.self="editing = null"
    >
      <form class="admin-modal" @submit.prevent="save">
        <div class="admin-section-heading">
          <h2>{{ editing === "new" ? "Thêm vùng giao" : "Sửa vùng giao" }}</h2>
          <button class="admin-link" type="button" @click="editing = null">
            Đóng
          </button>
        </div>
        <div class="admin-form-grid">
          <label
            >Tên khu vực<input
              v-model="form.ten_khu_vuc"
              maxlength="150"
              required /></label
          ><label
            >Tỉnh/thành phố<input v-model="form.tinh_thanh" required /></label
          ><label>Phường/xã<input v-model="form.phuong_xa" required /></label
          ><label
            >Phí giao (VND)<input
              v-model.number="form.phi_giao_hang"
              type="number"
              min="0"
              required
          /></label>
        </div>
        <div class="admin-vertical-choices">
          <label class="admin-check"
            ><input v-model="form.cho_giao_do_uong" type="checkbox" /> Cho phép
            giao đồ uống pha chế</label
          ><label class="admin-check"
            ><input v-model="form.cho_giao_dong_goi" type="checkbox" /> Cho phép
            giao cà phê đóng gói</label
          ><label class="admin-check"
            ><input v-model="form.dang_ap_dung" type="checkbox" /> Đang áp dụng
            khu vực này</label
          >
        </div>
        <button class="admin-btn dark" :disabled="saving">Lưu khu vực</button>
      </form>
    </div>
  </div>
</template>
