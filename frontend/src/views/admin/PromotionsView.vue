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
  ma_code: "",
  loai_giam: "PHAN_TRAM",
  gia_tri_giam: 10,
  don_toi_thieu: 0,
  giam_toi_da: null,
  gioi_han_su_dung: null,
  ngay_bat_dau: "",
  ngay_ket_thuc: "",
  dang_ap_dung: true,
});
const form = ref(blank());
function toInput(value) {
  if (!value) return "";
  const s = String(value);
  return s.slice(0, 16).replace(" ", "T");
}
function toDb(value) {
  return String(value).replace("T", " ") + ":00";
}
async function load() {
  loading.value = true;
  try {
    rows.value = await api.adminPromotions();
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
  notice.value = "";
}
function edit(item) {
  editing.value = item.ma_giam_gia;
  form.value = {
    ...item,
    ngay_bat_dau: toInput(item.ngay_bat_dau),
    ngay_ket_thuc: toInput(item.ngay_ket_thuc),
    dang_ap_dung: Boolean(item.dang_ap_dung),
    giam_toi_da: item.giam_toi_da === null ? null : Number(item.giam_toi_da),
    don_toi_thieu:
      item.don_toi_thieu === null ? null : Number(item.don_toi_thieu),
  };
}
function payload() {
  const f = form.value;
  return {
    ma_code: f.ma_code.trim().toUpperCase(),
    loai_giam: f.loai_giam,
    gia_tri_giam: Number(f.gia_tri_giam),
    don_toi_thieu:
      f.don_toi_thieu === "" || f.don_toi_thieu === null
        ? null
        : Number(f.don_toi_thieu),
    giam_toi_da:
      f.giam_toi_da === "" || f.giam_toi_da === null
        ? null
        : Number(f.giam_toi_da),
    gioi_han_su_dung:
      f.gioi_han_su_dung === "" || f.gioi_han_su_dung === null
        ? null
        : Number(f.gioi_han_su_dung),
    ngay_bat_dau: toDb(f.ngay_bat_dau),
    ngay_ket_thuc: toDb(f.ngay_ket_thuc),
    dang_ap_dung: Boolean(f.dang_ap_dung),
  };
}
async function save() {
  saving.value = true;
  error.value = "";
  try {
    const b = payload();
    if (editing.value === "new") await api.createPromotion(b);
    else await api.updatePromotion(editing.value, b);
    editing.value = null;
    notice.value = "Đã lưu mã giảm giá.";
    await load();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
async function toggle(item) {
  try {
    await api.updatePromotion(item.ma_giam_gia, {
      dang_ap_dung: !Boolean(item.dang_ap_dung),
    });
    notice.value = "Đã cập nhật khuyến mãi.";
    await load();
  } catch (e) {
    error.value = errorText(e);
  }
}
onMounted(load);
</script>
<template>
  <div class="admin-view">
    <div class="admin-page-heading">
      <div>
        <span class="eyebrow">PROMOTIONS</span>
        <h1>Mã giảm giá</h1>
        <p>Kiểm soát điều kiện, thời hạn và lượt sử dụng khuyến mãi.</p>
      </div>
      <button class="admin-btn dark" @click="add">
        <Plus :size="17" /> Tạo mã
      </button>
    </div>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-alert success">{{ notice }}</p>
    <div class="admin-panel admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Mã giảm giá</th>
            <th>Giá trị</th>
            <th>Đơn tối thiểu</th>
            <th>Lượt dùng</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in rows" :key="v.ma_giam_gia">
            <td>
              <strong>{{ v.ma_code }}</strong>
            </td>
            <td>
              {{
                v.loai_giam === "PHAN_TRAM"
                  ? `${v.gia_tri_giam}%`
                  : formatVND(v.gia_tri_giam)
              }}
            </td>
            <td>{{ formatVND(v.don_toi_thieu) }}</td>
            <td>{{ v.so_lan_da_dung }} / {{ v.gioi_han_su_dung ?? "∞" }}</td>
            <td>
              <small
                >{{ toInput(v.ngay_bat_dau).slice(0, 10) }} →
                {{ toInput(v.ngay_ket_thuc).slice(0, 10) }}</small
              >
            </td>
            <td>
              <span
                class="admin-status"
                :class="v.dang_ap_dung ? 'ok' : 'muted'"
                >{{ v.dang_ap_dung ? "Đang bật" : "Đã tắt" }}</span
              >
            </td>
            <td>
              <button class="admin-link" @click="edit(v)">Sửa</button
              ><button class="admin-link" @click="toggle(v)">
                {{ v.dang_ap_dung ? "Tắt" : "Bật" }}
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="admin-empty">
              {{ loading ? "Đang tải…" : "Chưa có khuyến mãi." }}
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
      <form class="admin-modal admin-modal-wide" @submit.prevent="save">
        <div class="admin-section-heading">
          <h2>{{ editing === "new" ? "Tạo mã giảm giá" : "Chỉnh sửa mã" }}</h2>
          <button class="admin-link" type="button" @click="editing = null">
            Đóng
          </button>
        </div>
        <div class="admin-form-grid">
          <label
            >Mã giảm giá<input
              v-model="form.ma_code"
              required
              maxlength="50"
              placeholder="CAFE10" /></label
          ><label
            >Kiểu giảm<select v-model="form.loai_giam">
              <option value="PHAN_TRAM">Phần trăm</option>
              <option value="SO_TIEN">Số tiền</option>
            </select></label
          ><label
            >Giá trị giảm<input
              v-model.number="form.gia_tri_giam"
              type="number"
              min="0.01"
              step="0.01"
              required /></label
          ><label
            >Đơn tối thiểu<input
              v-model.number="form.don_toi_thieu"
              type="number"
              min="0"
              step="0.01" /></label
          ><label
            >Giảm tối đa (có thể trống)<input
              v-model.number="form.giam_toi_da"
              type="number"
              min="0"
              step="0.01" /></label
          ><label
            >Giới hạn lượt dùng<input
              v-model.number="form.gioi_han_su_dung"
              type="number"
              min="0"
              step="1" /></label
          ><label
            >Bắt đầu<input
              v-model="form.ngay_bat_dau"
              type="datetime-local"
              required /></label
          ><label
            >Kết thúc<input
              v-model="form.ngay_ket_thuc"
              type="datetime-local"
              required
          /></label>
        </div>
        <label class="admin-check"
          ><input v-model="form.dang_ap_dung" type="checkbox" /> Cho phép sử
          dụng</label
        >
        <div class="admin-actions">
          <button class="admin-btn dark" :disabled="saving">
            {{ saving ? "Đang lưu…" : "Lưu mã giảm giá" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
