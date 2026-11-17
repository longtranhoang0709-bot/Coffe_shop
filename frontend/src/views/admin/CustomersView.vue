<script setup>
import { computed, onMounted, ref } from "vue";
import { Search, UserRound } from "lucide-vue-next";
import { errorText } from "../../api/axios";
import * as api from "../../api/admin";
const users = ref([]),
  total = ref(0),
  page = ref(1),
  limit = 10,
  search = ref(""),
  role = ref(""),
  status = ref("");
const loading = ref(false),
  saving = ref(false),
  error = ref(""),
  notice = ref(""),
  chosen = ref(null);
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)));
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const r = await api.adminUsers({
      page: page.value,
      limit,
      search: search.value.trim(),
      role: role.value,
      status: status.value,
    });
    users.value = r.items || [];
    total.value = Number(r.total) || 0;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
async function inspect(id) {
  try {
    chosen.value = (await api.adminUser(id)).user;
  } catch (e) {
    error.value = errorText(e);
  }
}
async function changeStatus(user) {
  if (user.vai_tro === "ADMIN") return;
  const next = user.trang_thai === "HOAT_DONG" ? "BI_KHOA" : "HOAT_DONG";
  if (
    !window.confirm(
      `${next === "BI_KHOA" ? "Khóa" : "Mở khóa"} tài khoản ${user.email}?`,
    )
  )
    return;
  saving.value = true;
  try {
    await api.setUserStatus(user.ma_nguoi_dung, next);
    notice.value = "Đã cập nhật trạng thái tài khoản.";
    await load();
    if (chosen.value) await inspect(chosen.value.ma_nguoi_dung);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
async function changeRole(user, newRole) {
  if (user.vai_tro === "ADMIN") return;
  if (!window.confirm(`Đổi vai trò ${user.email} thành ${newRole}?`)) return;
  saving.value = true;
  try {
    await api.setUserRole(user.ma_nguoi_dung, newRole);
    notice.value = "Đã đổi quyền tài khoản.";
    await load();
    if (chosen.value) await inspect(chosen.value.ma_nguoi_dung);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
function filter() {
  page.value = 1;
  load();
}
onMounted(load);
</script>
<template>
  <div class="admin-view">
    <div class="admin-page-heading">
      <div>
        <span class="eyebrow">ACCOUNTS</span>
        <h1>Khách hàng & nhân viên</h1>
        <p>Kiểm soát tài khoản, quyền truy cập và trạng thái hoạt động.</p>
      </div>
    </div>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-alert success">{{ notice }}</p>
    <div class="admin-panel admin-filter-row">
      <label class="admin-search"
        ><Search :size="16" /><input
          v-model="search"
          placeholder="Tìm họ tên hoặc email"
          @keyup.enter="filter" /></label
      ><select v-model="role" class="admin-select" @change="filter">
        <option value="">Mọi vai trò</option>
        <option value="CUSTOMER">Khách hàng</option>
        <option value="STAFF">Nhân viên</option>
        <option value="ADMIN">Admin</option></select
      ><select v-model="status" class="admin-select" @change="filter">
        <option value="">Mọi trạng thái</option>
        <option value="HOAT_DONG">Hoạt động</option>
        <option value="BI_KHOA">Bị khóa</option></select
      ><button class="admin-btn outline" @click="filter">Tìm kiếm</button>
    </div>
    <div class="admin-panel admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Tài khoản</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.ma_nguoi_dung">
            <td>
              <div class="admin-user-cell">
                <span class="admin-avatar light"><UserRound :size="16" /></span>
                <div>
                  <strong>{{ u.ho_ten }}</strong
                  ><small>{{ u.email }}</small
                  ><small>{{ u.so_dien_thoai || "" }}</small>
                </div>
              </div>
            </td>
            <td>{{ u.vai_tro }}</td>
            <td>
              <span
                class="admin-status"
                :class="u.trang_thai === 'HOAT_DONG' ? 'ok' : 'warning'"
                >{{
                  u.trang_thai === "HOAT_DONG" ? "Hoạt động" : "Bị khóa"
                }}</span
              >
            </td>
            <td>{{ String(u.ngay_tao || "").slice(0, 10) }}</td>
            <td>
              <button class="admin-link" @click="inspect(u.ma_nguoi_dung)">
                Chi tiết
              </button>
            </td>
          </tr>
          <tr v-if="!users.length">
            <td colspan="5" class="admin-empty">
              {{ loading ? "Đang tải…" : "Không tìm thấy tài khoản." }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="admin-pagination">
      <button
        :disabled="page <= 1"
        @click="
          page--;
          load();
        "
      >
        Trước</button
      ><span>{{ page }} / {{ pages }} · {{ total }} tài khoản</span
      ><button
        :disabled="page >= pages"
        @click="
          page++;
          load();
        "
      >
        Sau
      </button>
    </div>
    <div v-if="chosen" class="admin-modal-backdrop" @click.self="chosen = null">
      <div class="admin-modal">
        <div class="admin-section-heading">
          <h2>{{ chosen.ho_ten }}</h2>
          <button class="admin-link" @click="chosen = null">Đóng</button>
        </div>
        <div class="admin-detail-grid">
          <span>Email</span><strong>{{ chosen.email }}</strong
          ><span>Điện thoại</span
          ><strong>{{ chosen.so_dien_thoai || "—" }}</strong
          ><span>Vai trò</span><strong>{{ chosen.vai_tro }}</strong
          ><span>Trạng thái</span><strong>{{ chosen.trang_thai }}</strong>
        </div>
        <p class="admin-hint">
          Không thể thay đổi tài khoản ADMIN qua các API này.
        </p>
        <div v-if="chosen.vai_tro !== 'ADMIN'" class="admin-actions">
          <button
            class="admin-btn outline"
            :disabled="saving"
            @click="changeStatus(chosen)"
          >
            {{
              chosen.trang_thai === "HOAT_DONG" ? "Khóa tài khoản" : "Mở khóa"
            }}</button
          ><button
            class="admin-btn dark"
            :disabled="saving"
            @click="
              changeRole(
                chosen,
                chosen.vai_tro === 'STAFF' ? 'CUSTOMER' : 'STAFF',
              )
            "
          >
            {{
              chosen.vai_tro === "STAFF"
                ? "Hạ quyền thành khách"
                : "Cấp quyền nhân viên"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
