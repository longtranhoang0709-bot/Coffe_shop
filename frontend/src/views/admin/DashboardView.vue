<script setup>
import { computed, onMounted, ref } from "vue";
import {
  ArrowUpRight,
  Wallet,
  ShoppingBag,
  PackageCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-vue-next";
import { getDashboard } from "../../api/reports";
import { errorText } from "../../api/axios";
import { formatVND } from "../../format";
import AdminBars from "../../components/admin/AdminBars.vue";
const loading = ref(false),
  error = ref(""),
  data = ref(null),
  groupBy = ref("day");
function defaultRange() {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now.getTime() - 29 * 86400000);
  const local = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: local(from), to: local(to) };
}
const range = ref(defaultRange());
const overview = computed(() => data.value?.tong_quan || {});
const sold = computed(() => data.value?.san_pham_ban_chay || []);
const recent = computed(() => data.value?.don_gan_day || []);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    data.value = await getDashboard({
      ...range.value,
      groupBy: groupBy.value,
      limit: 8,
    });
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="admin-view">
    <div class="admin-page-heading">
      <div>
        <span class="eyebrow">PERFORMANCE OVERVIEW</span>
        <h1>Tổng quan cửa hàng</h1>
        <p>Doanh thu thực nhận, hoạt động đơn hàng và cảnh báo tồn kho.</p>
      </div>
      <RouterLink class="admin-btn dark" to="/admin/revenue"
        >Báo cáo chi tiết <ArrowUpRight :size="16"
      /></RouterLink>
    </div>
    <form class="admin-panel admin-filter-row" @submit.prevent="load">
      <label>Từ ngày <input v-model="range.from" type="date" required /></label
      ><label>Đến ngày <input v-model="range.to" type="date" required /></label
      ><select v-model="groupBy" class="admin-select">
        <option value="day">Theo ngày</option>
        <option value="month">Theo tháng</option>
        <option value="year">Theo năm</option></select
      ><button class="admin-btn dark" :disabled="loading">
        {{ loading ? "Đang tải…" : "Áp dụng" }}
      </button>
    </form>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <template v-if="data"
      ><div class="admin-kpi-grid">
        <div class="admin-kpi">
          <div class="admin-kpi-title">
            Doanh thu đã thu <Wallet :size="19" />
          </div>
          <strong>{{ formatVND(overview.tong_tien_thu) }}</strong
          ><span>Đơn hoàn tất và thanh toán thành công</span>
        </div>
        <div class="admin-kpi">
          <div class="admin-kpi-title">
            Đơn hoàn thành <ShoppingBag :size="19" />
          </div>
          <strong>{{ overview.don_hoan_thanh ?? 0 }}</strong
          ><span>Trong khoảng thời gian đã chọn</span>
        </div>
        <div class="admin-kpi">
          <div class="admin-kpi-title">
            Giá trị trung bình <TrendingUp :size="19" />
          </div>
          <strong>{{ formatVND(overview.trung_binh_moi_don) }}</strong
          ><span>Giá trị trung bình mỗi đơn hoàn thành</span>
        </div>
        <div class="admin-kpi">
          <div class="admin-kpi-title">
            Sắp hết hàng <AlertTriangle :size="19" />
          </div>
          <strong>{{
            data.ton_kho?.tong_quan?.so_bien_the_sap_het ?? 0
          }}</strong
          ><span>Biến thể cà phê đóng gói</span>
        </div>
      </div>
      <div class="admin-dashboard-grid">
        <section class="admin-panel admin-form-panel">
          <div class="admin-section-heading">
            <h2>Biểu đồ doanh thu</h2>
            <span>{{ range.from }} → {{ range.to }}</span>
          </div>
          <AdminBars :items="data.bieu_do || []" />
          <p class="admin-hint">
            Số tiền đơn hoàn thành và đã thanh toán, gồm phí giao.
          </p>
        </section>
        <section class="admin-panel admin-form-panel">
          <div class="admin-section-heading">
            <h2>Sản phẩm bán chạy</h2>
            <PackageCheck :size="19" />
          </div>
          <div
            v-for="(p, i) in sold.slice(0, 6)"
            :key="p.ma_san_pham"
            class="admin-ranking"
          >
            <span class="admin-rank-num">{{
              String(i + 1).padStart(2, "0")
            }}</span>
            <div>
              <strong>{{ p.ten_san_pham }}</strong
              ><small>{{ p.so_luong_ban }} sản phẩm đã bán</small>
            </div>
            <strong>{{ formatVND(p.doanh_so_truoc_giam) }}</strong>
          </div>
          <div v-if="!sold.length" class="admin-empty">
            Chưa có sản phẩm bán ra.
          </div>
        </section>
      </div>
      <div class="admin-dashboard-grid">
        <section class="admin-panel admin-form-panel">
          <div class="admin-section-heading">
            <h2>Đơn hàng gần đây</h2>
            <RouterLink class="admin-link" to="/admin/orders"
              >Xem tất cả</RouterLink
            >
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Trạng thái</th>
                  <th>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in recent" :key="o.ma_don_hang">
                  <td>{{ o.ma_don }}</td>
                  <td>{{ o.trang_thai_don }}</td>
                  <td>{{ formatVND(o.tong_tien) }}</td>
                </tr>
                <tr v-if="!recent.length">
                  <td colspan="3" class="admin-empty">Chưa có đơn hàng.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="admin-panel admin-form-panel">
          <div class="admin-section-heading">
            <h2>Tồn kho cần chú ý</h2>
            <RouterLink class="admin-link" to="/admin/inventory"
              >Điều chỉnh kho</RouterLink
            >
          </div>
          <div
            v-for="p in (data.ton_kho?.danh_sach || []).slice(0, 6)"
            :key="p.ma_bien_the"
            class="admin-ranking"
          >
            <span class="admin-rank-num"><AlertTriangle :size="17" /></span>
            <div>
              <strong>{{ p.ten_san_pham }}</strong
              ><small>{{ p.ten_bien_the }}</small>
            </div>
            <strong>{{ p.so_luong_ton }} gói</strong>
          </div>
          <div
            v-if="!(data.ton_kho?.danh_sach || []).length"
            class="admin-empty"
          >
            Không có cảnh báo tồn kho.
          </div>
        </section>
      </div>
      <p class="admin-note">{{ data.ghi_chu }}</p></template
    >
    <div v-else-if="loading" class="admin-panel admin-empty">
      Đang tải số liệu từ Backend…
    </div>
  </div>
</template>
