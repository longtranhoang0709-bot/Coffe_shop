<script setup>
import { computed, onMounted, ref } from "vue";
import { Search, Truck, ClipboardCheck } from "lucide-vue-next";
import { useAuthStore } from "../../stores/auth";
import { errorText } from "../../api/axios";
import { formatVND } from "../../format";
import * as api from "../../api/admin";
const auth = useAuthStore(),
  loading = ref(false),
  saving = ref(false),
  error = ref(""),
  notice = ref("");
const rows = ref([]),
  page = ref(1),
  total = ref(0),
  search = ref(""),
  status = ref(""),
  chosen = ref(null);
const shippingForm = ref({ don_vi_van_chuyen: "", ma_van_don: "" }),
  collectCash = ref(false);
const statuses = [
  "CHO_XAC_NHAN",
  "DA_XAC_NHAN",
  "DANG_CHUAN_BI",
  "CHO_NHAN",
  "DANG_GIAO",
  "HOAN_THANH",
  "DA_HUY",
];
const labels = {
  CHO_XAC_NHAN: "Chờ xác nhận",
  DA_XAC_NHAN: "Đã xác nhận",
  DANG_CHUAN_BI: "Đang chuẩn bị",
  CHO_NHAN: "Chờ nhận",
  DANG_GIAO: "Đang giao",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};
const pages = computed(() => Math.max(1, Math.ceil(total.value / 10)));
const nextStatus = computed(() => {
  if (!chosen.value) return null;
  const cur = chosen.value.trang_thai_don;
  if (cur === "CHO_XAC_NHAN") return "DA_XAC_NHAN";
  if (cur === "DA_XAC_NHAN") return "DANG_CHUAN_BI";
  if (cur === "DANG_CHUAN_BI")
    return chosen.value.hinh_thuc_nhan === "GIAO_TAN_NOI"
      ? "DANG_GIAO"
      : "CHO_NHAN";
  if (cur === "CHO_NHAN" || cur === "DANG_GIAO") return "HOAN_THANH";
  return null;
});
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const result = await api.adminOrders({
      page: page.value,
      limit: 10,
      status: status.value,
      search: search.value.trim(),
    });
    rows.value = result.items || [];
    total.value = Number(result.tong) || 0;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
async function inspect(id) {
  error.value = "";
  try {
    chosen.value = await api.adminOrder(id);
    shippingForm.value = {
      don_vi_van_chuyen: chosen.value.don_vi_van_chuyen || "",
      ma_van_don: chosen.value.ma_van_don || "",
    };
    collectCash.value = false;
  } catch (e) {
    error.value = errorText(e);
  }
}
async function advance() {
  if (!nextStatus.value || !chosen.value) return;
  const next = nextStatus.value;
  const requiresPayment =
    next === "HOAN_THANH" &&
    ["COD", "TIEN_MAT"].includes(chosen.value.phuong_thuc);
  if (requiresPayment && !collectCash.value) {
    error.value =
      "Xác nhận đã thu đủ tiền trước khi hoàn tất đơn COD/TIỀN MẶT.";
    return;
  }
  if (!window.confirm(`Chuyển sang ${labels[next]}?`)) return;
  saving.value = true;
  error.value = "";
  try {
    await api.setOrderStatus(chosen.value.ma_don_hang, {
      trang_thai_don: next,
      ...(requiresPayment ? { da_thu_tien: true } : {}),
    });
    notice.value = "Đã cập nhật trạng thái đơn.";
    await inspect(chosen.value.ma_don_hang);
    await load();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
async function saveShipping() {
  saving.value = true;
  error.value = "";
  try {
    const payload = {
      don_vi_van_chuyen: shippingForm.value.don_vi_van_chuyen.trim() || null,
      ma_van_don: shippingForm.value.ma_van_don.trim() || null,
    };
    await api.updateOrderShipping(chosen.value.ma_don_hang, payload);
    notice.value = "Đã cập nhật vận chuyển.";
    await inspect(chosen.value.ma_don_hang);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
async function cancel() {
  if (
    !chosen.value ||
    !["CHO_XAC_NHAN", "DA_XAC_NHAN"].includes(chosen.value.trang_thai_don)
  )
    return;
  if (
    !window.confirm(
      "Hủy đơn? Backend sẽ tự kiểm tra điều kiện hoàn kho/hoàn mã giảm giá.",
    )
  )
    return;
  saving.value = true;
  error.value = "";
  try {
    await api.cancelAdminOrder(chosen.value.ma_don_hang);
    notice.value = "Đã hủy đơn.";
    await inspect(chosen.value.ma_don_hang);
    await load();
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
        <span class="eyebrow">ORDER MANAGEMENT</span>
        <h1>
          {{
            auth.role === "STAFF" ? "Đơn hàng cần xử lý" : "Quản lý đơn hàng"
          }}
        </h1>
        <p>Xác nhận, chuẩn bị, giao nhận và theo dõi thanh toán.</p>
      </div>
    </div>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-alert success">{{ notice }}</p>
    <div class="admin-panel admin-filter-row">
      <label class="admin-search"
        ><Search :size="16" /><input
          v-model="search"
          placeholder="Mã đơn hoặc người nhận"
          @keyup.enter="filter" /></label
      ><select v-model="status" class="admin-select" @change="filter">
        <option value="">Tất cả trạng thái</option>
        <option v-for="s in statuses" :key="s" :value="s">
          {{ labels[s] }}
        </option></select
      ><button class="admin-btn outline" @click="filter">Tìm kiếm</button>
    </div>
    <div class="admin-panel admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Đơn hàng</th>
            <th>Khách hàng</th>
            <th>Ngày đặt</th>
            <th>Tổng tiền</th>
            <th>Thanh toán</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in rows" :key="d.ma_don_hang">
            <td>
              <strong>{{ d.ma_don }}</strong
              ><small class="admin-block-subtitle">{{
                d.hinh_thuc_nhan
              }}</small>
            </td>
            <td>{{ d.ten_nguoi_nhan }}</td>
            <td>
              {{
                String(d.ngay_dat || "")
                  .slice(0, 16)
                  .replace("T", " ")
              }}
            </td>
            <td>{{ formatVND(d.tong_tien) }}</td>
            <td>
              {{ d.phuong_thuc
              }}<small class="admin-block-subtitle">{{
                d.trang_thai_thanh_toan
              }}</small>
            </td>
            <td>
              <span
                class="admin-status"
                :class="
                  d.trang_thai_don === 'HOAN_THANH'
                    ? 'ok'
                    : d.trang_thai_don === 'DA_HUY'
                      ? 'muted'
                      : 'warning'
                "
                >{{ labels[d.trang_thai_don] || d.trang_thai_don }}</span
              >
            </td>
            <td>
              <button class="admin-link" @click="inspect(d.ma_don_hang)">
                Xử lý
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="admin-empty">
              {{ loading ? "Đang tải…" : "Chưa có đơn hàng." }}
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
      ><span>Trang {{ page }} / {{ pages }}</span
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
      <div class="admin-modal admin-modal-wide">
        <div class="admin-section-heading">
          <h2>Đơn {{ chosen.ma_don }}</h2>
          <button class="admin-link" @click="chosen = null">Đóng</button>
        </div>
        <div class="admin-detail-grid">
          <span>Người nhận</span
          ><strong
            >{{ chosen.ten_nguoi_nhan }} · {{ chosen.sdt_nguoi_nhan }}</strong
          ><span>Hình thức</span><strong>{{ chosen.hinh_thuc_nhan }}</strong
          ><span>Trạng thái</span
          ><strong>{{
            labels[chosen.trang_thai_don] || chosen.trang_thai_don
          }}</strong
          ><span>Thanh toán</span
          ><strong
            >{{ chosen.phuong_thuc }} ·
            {{ chosen.trang_thai_thanh_toan }}</strong
          ><span>Địa chỉ</span
          ><strong
            >{{ chosen.dia_chi_giao_hang || "Nhận tại quán" }}
            {{ chosen.phuong_xa || "" }}</strong
          ><span>Tổng thanh toán</span
          ><strong>{{ formatVND(chosen.tong_tien) }}</strong>
        </div>
        <h3 class="admin-subheading">Sản phẩm trong đơn</h3>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SL</th>
                <th>Giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in chosen.items" :key="item.ma_chi_tiet_don">
                <td>
                  {{ item.ten_san_pham_luu
                  }}<small class="admin-block-subtitle">{{
                    item.ten_bien_the_luu
                  }}</small>
                </td>
                <td>{{ item.so_luong }}</td>
                <td>{{ formatVND(item.don_gia) }}</td>
                <td>{{ formatVND(item.thanh_tien) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="
            chosen.hinh_thuc_nhan === 'GIAO_TAN_NOI' &&
            !['HOAN_THANH', 'DA_HUY'].includes(chosen.trang_thai_don)
          "
          class="admin-box-subtle"
        >
          <h3 class="admin-subheading"><Truck :size="17" />Vận chuyển</h3>
          <form class="admin-inline-form" @submit.prevent="saveShipping">
            <input
              v-model="shippingForm.don_vi_van_chuyen"
              maxlength="150"
              placeholder="Đơn vị giao hàng"
            /><input
              v-model="shippingForm.ma_van_don"
              maxlength="100"
              placeholder="Mã vận đơn"
            /><button class="admin-btn outline" :disabled="saving">
              Lưu vận chuyển
            </button>
          </form>
        </div>
        <div v-if="nextStatus" class="admin-box-subtle">
          <h3 class="admin-subheading">
            <ClipboardCheck :size="17" />Bước xử lý tiếp theo
          </h3>
          <label
            v-if="
              nextStatus === 'HOAN_THANH' &&
              ['COD', 'TIEN_MAT'].includes(chosen.phuong_thuc)
            "
            class="admin-check"
            ><input v-model="collectCash" type="checkbox" /> Tôi xác nhận đã thu
            đủ tiền COD/tiền mặt</label
          ><button class="admin-btn dark" :disabled="saving" @click="advance">
            Chuyển sang: {{ labels[nextStatus] }}
          </button>
        </div>
        <div
          v-if="['CHO_XAC_NHAN', 'DA_XAC_NHAN'].includes(chosen.trang_thai_don)"
          class="admin-actions"
        >
          <button class="admin-btn danger" :disabled="saving" @click="cancel">
            Hủy đơn (nếu đủ điều kiện)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
