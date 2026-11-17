<script setup>
import { computed, onMounted, ref } from "vue";
import { PackageCheck } from "lucide-vue-next";
import * as api from "../../api/admin";
import { errorText } from "../../api/axios";
const rows = ref([]),
  loading = ref(false),
  saving = ref(false),
  error = ref(""),
  notice = ref(""),
  low = ref(false),
  search = ref("");
const selected = ref(null),
  form = ref({ so_luong_ton: 0, muc_ton_toi_thieu: 0 });
const filtered = computed(() =>
  rows.value.filter(
    (r) =>
      (!low.value || Number(r.so_luong_ton) <= Number(r.muc_ton_toi_thieu)) &&
      `${r.ten_san_pham} ${r.ma_sku}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
async function load() {
  loading.value = true;
  try {
    rows.value = await api.adminInventory(false);
    error.value = "";
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
function edit(row) {
  selected.value = row;
  form.value = {
    so_luong_ton: Number(row.so_luong_ton),
    muc_ton_toi_thieu: Number(row.muc_ton_toi_thieu),
  };
  notice.value = "";
}
async function save() {
  saving.value = true;
  try {
    await api.updateInventory(selected.value.ma_bien_the, { ...form.value });
    selected.value = null;
    notice.value = "Đã cập nhật tồn kho.";
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
        <span class="eyebrow">WAREHOUSE</span>
        <h1>Quản lý tồn kho</h1>
        <p>Theo dõi cà phê hạt và bột theo từng biến thể đóng gói.</p>
      </div>
    </div>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-alert success">{{ notice }}</p>
    <div class="admin-panel admin-filter-row">
      <input
        v-model="search"
        class="admin-input"
        placeholder="Tên sản phẩm hoặc SKU"
      /><label class="admin-check"
        ><input v-model="low" type="checkbox" /> Chỉ hiện sắp hết</label
      ><button class="admin-btn outline" @click="load">Làm mới</button>
    </div>
    <div class="admin-panel admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Biến thể</th>
            <th>SKU</th>
            <th>Trong kho</th>
            <th>Ngưỡng cảnh báo</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.ma_bien_the">
            <td>
              <strong>{{ item.ten_san_pham }}</strong
              ><small class="admin-block-subtitle">{{
                item.ten_bien_the
              }}</small>
            </td>
            <td>{{ item.ma_sku }}</td>
            <td class="admin-emphasis">{{ item.so_luong_ton }}</td>
            <td>{{ item.muc_ton_toi_thieu }}</td>
            <td>
              <span
                class="admin-status"
                :class="
                  Number(item.so_luong_ton) <= Number(item.muc_ton_toi_thieu)
                    ? 'warning'
                    : 'ok'
                "
                >{{
                  Number(item.so_luong_ton) <= Number(item.muc_ton_toi_thieu)
                    ? "Sắp hết"
                    : "Ổn định"
                }}</span
              >
            </td>
            <td>
              <button class="admin-link" @click="edit(item)">Điều chỉnh</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" class="admin-empty">
              {{ loading ? "Đang tải…" : "Không có biến thể phù hợp." }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="selected"
      class="admin-modal-backdrop"
      @click.self="selected = null"
    >
      <form class="admin-modal" @submit.prevent="save">
        <div class="admin-section-heading">
          <h2>Điều chỉnh tồn kho</h2>
          <button type="button" class="admin-link" @click="selected = null">
            Đóng
          </button>
        </div>
        <p>
          <strong>{{ selected.ten_san_pham }}</strong> ·
          {{ selected.ten_bien_the }}
        </p>
        <div class="admin-form-grid">
          <label
            >Số lượng tồn<input
              v-model.number="form.so_luong_ton"
              type="number"
              min="0"
              step="1"
              required /></label
          ><label
            >Ngưỡng cảnh báo<input
              v-model.number="form.muc_ton_toi_thieu"
              type="number"
              min="0"
              step="1"
              required
          /></label>
        </div>
        <p class="admin-hint">
          Cập nhật giá trị tồn kho thực tế. Lưu ý đây là thao tác điều chỉnh
          trực tiếp, không phải nhật ký nhập/xuất.
        </p>
        <button class="admin-btn dark" :disabled="saving">
          <PackageCheck :size="16" /> Lưu tồn kho
        </button>
      </form>
    </div>
  </div>
</template>
