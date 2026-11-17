<script setup>
import { computed, onMounted, ref } from "vue";
import AdminBars from "../../components/admin/AdminBars.vue";
import * as reports from "../../api/reports";
import { formatVND } from "../../format";
import { errorText } from "../../api/axios";
const loading = ref(false),
  error = ref(""),
  data = ref(null),
  period = ref("month");
function dateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const now = new Date(),
  filters = ref({
    from: dateString(new Date(now.getFullYear(), 0, 1)),
    to: dateString(now),
    groupBy: "month",
  });
const totals = computed(() => data.value?.overview?.ket_qua || {});
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const p = { ...filters.value };
    const [overview, revenue, products, categories, methods, statuses] =
      await Promise.all([
        reports.getOverview(p),
        reports.getRevenue(p),
        reports.getTopProducts({ ...p, limit: 10, sort: "revenue" }),
        reports.getCategorySales(p),
        reports.getPaymentMethods(p),
        reports.getOrderStatuses(p),
      ]);
    data.value = { overview, revenue, products, categories, methods, statuses };
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
        <span class="eyebrow">ANALYTICS</span>
        <h1>Báo cáo doanh thu</h1>
        <p>
          Dữ liệu lấy trực tiếp từ những đơn hoàn thành và thanh toán thành
          công.
        </p>
      </div>
    </div>
    <form class="admin-panel admin-filter-row" @submit.prevent="load">
      <label>Từ ngày<input v-model="filters.from" type="date" required /></label
      ><label>Đến ngày<input v-model="filters.to" type="date" required /></label
      ><label
        >Nhóm kỳ<select v-model="filters.groupBy">
          <option value="day">Ngày</option>
          <option value="month">Tháng</option>
          <option value="year">Năm</option>
        </select></label
      ><button class="admin-btn dark" :disabled="loading">
        {{ loading ? "Đang tải…" : "Xem báo cáo" }}
      </button>
    </form>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <template v-if="data"
      ><div class="admin-kpi-grid">
        <div class="admin-kpi">
          <div class="admin-kpi-title">Tổng tiền thực thu</div>
          <strong>{{ formatVND(totals.tong_tien_thu) }}</strong
          ><span>Đã hoàn tất + đã thu tiền</span>
        </div>
        <div class="admin-kpi">
          <div class="admin-kpi-title">Doanh thu hàng hóa</div>
          <strong>{{ formatVND(totals.doanh_thu_hang_hoa) }}</strong
          ><span>Sau giảm giá, không gồm phí giao</span>
        </div>
        <div class="admin-kpi">
          <div class="admin-kpi-title">Phí giao đã thu</div>
          <strong>{{ formatVND(totals.phi_giao_da_thu) }}</strong
          ><span>Đã ghi nhận trong đơn hoàn tất</span>
        </div>
        <div class="admin-kpi">
          <div class="admin-kpi-title">Tổng giảm giá</div>
          <strong>{{ formatVND(totals.tong_giam_gia) }}</strong
          ><span>Giá trị khuyến mãi đã áp dụng</span>
        </div>
      </div>
      <section class="admin-panel admin-form-panel">
        <div class="admin-section-heading">
          <h2>
            Doanh thu theo
            {{
              filters.groupBy === "day"
                ? "ngày"
                : filters.groupBy === "month"
                  ? "tháng"
                  : "năm"
            }}
          </h2>
          <span>{{ filters.from }} → {{ filters.to }}</span>
        </div>
        <AdminBars :items="data.revenue?.danh_sach || []" />
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Kỳ</th>
                <th>Đơn hoàn tất</th>
                <th>Tổng tiền thực thu</th>
                <th>Doanh thu hàng hóa</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in (data.revenue?.danh_sach || [])
                  .slice(-18)
                  .reverse()"
                :key="row.ky_bao_cao"
              >
                <td>{{ row.ky_bao_cao }}</td>
                <td>{{ row.so_don }}</td>
                <td>{{ formatVND(row.tong_tien_thu) }}</td>
                <td>{{ formatVND(row.doanh_thu_hang_hoa) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <div class="admin-dashboard-grid">
        <section class="admin-panel admin-form-panel">
          <h2>Sản phẩm bán chạy</h2>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SL</th>
                  <th>Doanh số</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in data.products?.danh_sach || []"
                  :key="r.ma_san_pham"
                >
                  <td>{{ r.ten_san_pham }}</td>
                  <td>{{ r.so_luong_ban }}</td>
                  <td>{{ formatVND(r.doanh_so_truoc_giam) }}</td>
                </tr>
                <tr v-if="!data.products?.danh_sach?.length">
                  <td colspan="3" class="admin-empty">Không có dữ liệu.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="admin-panel admin-form-panel">
          <h2>Doanh số theo danh mục</h2>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Danh mục</th>
                  <th>SL</th>
                  <th>Doanh số</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in data.categories?.danh_sach || []"
                  :key="r.ma_danh_muc"
                >
                  <td>{{ r.ten_danh_muc }}</td>
                  <td>{{ r.so_luong_ban }}</td>
                  <td>{{ formatVND(r.doanh_so_truoc_giam) }}</td>
                </tr>
                <tr v-if="!data.categories?.danh_sach?.length">
                  <td colspan="3" class="admin-empty">Không có dữ liệu.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="admin-panel admin-form-panel">
          <h2>Theo phương thức thanh toán</h2>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Phương thức</th>
                  <th>Đơn</th>
                  <th>Thực thu</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in data.methods?.danh_sach || []"
                  :key="r.phuong_thuc"
                >
                  <td>{{ r.phuong_thuc }}</td>
                  <td>{{ r.so_don }}</td>
                  <td>{{ formatVND(r.tong_tien_thu) }}</td>
                </tr>
                <tr v-if="!data.methods?.danh_sach?.length">
                  <td colspan="3" class="admin-empty">Không có dữ liệu.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="admin-panel admin-form-panel">
          <h2>Tình trạng đơn hàng</h2>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Số đơn</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in data.statuses?.danh_sach || []"
                  :key="r.trang_thai_don"
                >
                  <td>{{ r.trang_thai_don }}</td>
                  <td>{{ r.so_don }}</td>
                </tr>
                <tr v-if="!data.statuses?.danh_sach?.length">
                  <td colspan="2" class="admin-empty">Không có dữ liệu.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p class="admin-note">
        Sản phẩm/danh mục thể hiện doanh số trước giảm giá và chưa cộng phí
        giao; tổng tiền thực thu ở các chỉ tiêu phía trên được tính riêng. Trạng
        thái đơn hàng được đếm theo ngày đặt, còn doanh thu dùng ngày hoàn tất.
      </p></template
    >
    <div v-else-if="loading" class="admin-panel admin-empty">
      Đang tổng hợp số liệu…
    </div>
  </div>
</template>
