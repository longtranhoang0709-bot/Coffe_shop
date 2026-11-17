<script setup>
import { onMounted, ref } from "vue";
import { Plus } from "lucide-vue-next";
import * as api from "../../api/admin";
import { errorText } from "../../api/axios";
const rows = ref([]),
  loading = ref(false),
  saving = ref(false),
  error = ref(""),
  message = ref("");
const editing = ref(null),
  form = ref({ ten_danh_muc: "", mo_ta: "", dang_hoat_dong: true });
async function load() {
  loading.value = true;
  try {
    rows.value = (await api.adminCategories()).categories || [];
    error.value = "";
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
function clear() {
  editing.value = null;
  form.value = { ten_danh_muc: "", mo_ta: "", dang_hoat_dong: true };
}
function edit(row) {
  editing.value = row.ma_danh_muc;
  form.value = {
    ten_danh_muc: row.ten_danh_muc,
    mo_ta: row.mo_ta || "",
    dang_hoat_dong: Boolean(row.dang_hoat_dong),
  };
}
async function save() {
  saving.value = true;
  error.value = "";
  message.value = "";
  try {
    const body = {
      ten_danh_muc: form.value.ten_danh_muc.trim(),
      mo_ta: form.value.mo_ta.trim() || null,
      dang_hoat_dong: form.value.dang_hoat_dong,
    };
    if (editing.value) await api.updateCategory(editing.value, body);
    else await api.createCategory(body);
    message.value = "Đã lưu danh mục.";
    clear();
    await load();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
async function toggle(row) {
  if (row.dang_hoat_dong && !window.confirm(`Ẩn danh mục ${row.ten_danh_muc}?`))
    return;
  try {
    if (row.dang_hoat_dong) await api.hideCategory(row.ma_danh_muc);
    else await api.updateCategory(row.ma_danh_muc, { dang_hoat_dong: true });
    message.value = "Đã thay đổi trạng thái.";
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
        <span class="eyebrow">CATALOG</span>
        <h1>Danh mục sản phẩm</h1>
        <p>Tổ chức thực đơn cà phê và nhóm sản phẩm đóng gói.</p>
      </div>
    </div>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <p v-if="message" class="admin-alert success">{{ message }}</p>
    <div class="admin-two-col">
      <div class="admin-panel admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Danh mục</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.ma_danh_muc">
              <td>
                <strong>{{ row.ten_danh_muc }}</strong
                ><small class="admin-block-subtitle">{{
                  row.mo_ta || "Không có mô tả"
                }}</small>
              </td>
              <td>
                <span
                  class="admin-status"
                  :class="row.dang_hoat_dong ? 'ok' : 'muted'"
                  >{{ row.dang_hoat_dong ? "Đang hoạt động" : "Đã ẩn" }}</span
                >
              </td>
              <td>
                <button class="admin-link" @click="edit(row)">Sửa</button
                ><button class="admin-link" @click="toggle(row)">
                  {{ row.dang_hoat_dong ? "Ẩn" : "Bật" }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="3" class="admin-empty">
                {{ loading ? "Đang tải…" : "Chưa có danh mục." }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <form class="admin-panel admin-form-panel" @submit.prevent="save">
        <div class="admin-section-heading">
          <h2>{{ editing ? "Sửa danh mục" : "Thêm danh mục" }}</h2>
          <Plus :size="19" />
        </div>
        <label class="admin-field"
          >Tên danh mục<input
            v-model="form.ten_danh_muc"
            required
            minlength="2"
            maxlength="150"
            placeholder="Ví dụ: Cà phê máy" /></label
        ><label class="admin-field"
          >Mô tả<textarea
            v-model="form.mo_ta"
            maxlength="255"
            rows="4"
            placeholder="Mô tả ngắn…"
          /></label
        ><label class="admin-check"
          ><input v-model="form.dang_hoat_dong" type="checkbox" /> Đang hoạt
          động</label
        >
        <div class="admin-actions">
          <button class="admin-btn dark" :disabled="saving">
            {{
              saving ? "Đang lưu…" : editing ? "Cập nhật" : "Thêm danh mục"
            }}</button
          ><button
            v-if="editing"
            class="admin-btn outline"
            type="button"
            @click="clear"
          >
            Hủy chỉnh sửa
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
