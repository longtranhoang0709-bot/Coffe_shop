<script setup>
import { computed, onMounted, ref } from "vue";
import {
  Plus,
  Search,
  Pencil,
  ImagePlus,
  ArrowLeft,
  Trash2,
  Package,
} from "lucide-vue-next";
import { productImage } from "../../api/products";
import { errorText } from "../../api/axios";
import { formatVND } from "../../format";
import * as api from "../../api/admin";

const loading = ref(false),
  saving = ref(false),
  error = ref(""),
  notice = ref("");
const rows = ref([]),
  categories = ref([]),
  page = ref(1),
  totalPages = ref(1);
const search = ref(""),
  selectedType = ref("");
const current = ref(null),
  editor = ref(false);
const productForm = ref({
  ten_san_pham: "",
  ma_danh_muc: "",
  loai_san_pham: "DO_UONG",
  mo_ta: "",
  dang_ban: true,
});
const variantForm = ref({
  ma_sku: "",
  ten_bien_the: "",
  kich_co: "",
  khoi_luong_gram: "",
  loai_hat: "",
  do_xay: "",
  gia_ban: 0,
});
const groupName = ref(""),
  optionName = ref(""),
  optionPrice = ref(0),
  targetGroup = ref("");
const uploadFile = ref(null),
  uploadPrimary = ref(false);
const isEditing = computed(() => !!current.value);
const variantPack = computed(
  () =>
    (current.value?.loai_san_pham || productForm.value.loai_san_pham) ===
    "DONG_GOI",
);

function fail(e) {
  error.value = errorText(e);
}
function success(message) {
  error.value = "";
  notice.value = message;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const r = await api.adminProducts({
      page: page.value,
      limit: 10,
      search: search.value.trim(),
      type: selectedType.value,
    });
    rows.value = r.products || [];
    totalPages.value = r.totalPages || 1;
  } catch (e) {
    fail(e);
  } finally {
    loading.value = false;
  }
}
async function loadCategories() {
  try {
    categories.value = (await api.adminCategories()).categories || [];
  } catch (e) {
    fail(e);
  }
}
function newProduct() {
  current.value = null;
  editor.value = true;
  notice.value = "";
  error.value = "";
  productForm.value = {
    ten_san_pham: "",
    ma_danh_muc:
      categories.value.find((c) => c.dang_hoat_dong)?.ma_danh_muc ?? "",
    loai_san_pham: "DO_UONG",
    mo_ta: "",
    dang_ban: true,
  };
}
async function openProduct(id) {
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    const r = await api.adminProduct(id);
    current.value = r.product;
    editor.value = true;
    productForm.value = {
      ten_san_pham: r.product.ten_san_pham,
      ma_danh_muc: r.product.ma_danh_muc,
      loai_san_pham: r.product.loai_san_pham,
      mo_ta: r.product.mo_ta || "",
      dang_ban: Boolean(r.product.dang_ban),
    };
  } catch (e) {
    fail(e);
  } finally {
    loading.value = false;
  }
}
async function refreshCurrent() {
  if (current.value) {
    const r = await api.adminProduct(current.value.ma_san_pham);
    current.value = r.product;
  }
}
async function saveProduct() {
  if (
    !productForm.value.ten_san_pham.trim() ||
    !Number(productForm.value.ma_danh_muc)
  ) {
    error.value = "Nhập tên và chọn danh mục.";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const payload = {
      ...productForm.value,
      ten_san_pham: productForm.value.ten_san_pham.trim(),
      ma_danh_muc: Number(productForm.value.ma_danh_muc),
      mo_ta: productForm.value.mo_ta.trim() || null,
    };
    const r = current.value
      ? await api.updateProduct(current.value.ma_san_pham, payload)
      : await api.createProduct(payload);
    current.value = r.product;
    success("Đã lưu sản phẩm.");
    await load();
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function hideCurrent() {
  if (
    !current.value ||
    !window.confirm(`Ngừng bán ${current.value.ten_san_pham}?`)
  )
    return;
  saving.value = true;
  try {
    await api.hideProduct(current.value.ma_san_pham);
    success("Đã ngừng bán sản phẩm.");
    await refreshCurrent();
    await load();
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function addVariant() {
  if (!current.value) return;
  const f = variantForm.value;
  const p = {
    ma_sku: f.ma_sku.trim(),
    ten_bien_the: f.ten_bien_the.trim(),
    gia_ban: Number(f.gia_ban),
    dang_ban: true,
  };
  if (variantPack.value) {
    p.khoi_luong_gram = Number(f.khoi_luong_gram);
    if (f.loai_hat.trim()) p.loai_hat = f.loai_hat.trim();
    if (f.do_xay.trim()) p.do_xay = f.do_xay.trim();
  } else {
    if (f.kich_co.trim()) p.kich_co = f.kich_co.trim();
  }
  saving.value = true;
  try {
    await api.createVariant(current.value.ma_san_pham, p);
    variantForm.value = {
      ma_sku: "",
      ten_bien_the: "",
      kich_co: "",
      khoi_luong_gram: "",
      loai_hat: "",
      do_xay: "",
      gia_ban: 0,
    };
    await refreshCurrent();
    success("Đã thêm biến thể.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function editVariant(v) {
  const name = window.prompt("Tên biến thể", v.ten_bien_the);
  if (name === null) return;
  const raw = window.prompt("Giá bán (VND)", String(v.gia_ban));
  if (raw === null) return;
  const price = Number(raw);
  if (!Number.isFinite(price) || price < 0) {
    error.value = "Giá bán không hợp lệ.";
    return;
  }
  saving.value = true;
  try {
    await api.updateVariant(v.ma_bien_the, {
      ten_bien_the: name,
      gia_ban: price,
    });
    await refreshCurrent();
    success("Đã sửa biến thể.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function toggleVariant(v) {
  if (v.dang_ban && !window.confirm("Ngừng bán biến thể này?")) return;
  saving.value = true;
  try {
    await api.updateVariant(v.ma_bien_the, { dang_ban: !Boolean(v.dang_ban) });
    await refreshCurrent();
    success("Đã cập nhật trạng thái biến thể.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function addGroup() {
  if (!groupName.value.trim()) return;
  saving.value = true;
  try {
    await api.createOptionGroup(current.value.ma_san_pham, {
      ten_nhom: groupName.value.trim(),
      bat_buoc_chon: false,
      cho_chon_nhieu: false,
    });
    groupName.value = "";
    await refreshCurrent();
    success("Đã tạo nhóm tùy chọn.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function addOption() {
  if (!Number(targetGroup.value) || !optionName.value.trim()) return;
  saving.value = true;
  try {
    await api.createOption(Number(targetGroup.value), {
      ten_tuy_chon: optionName.value.trim(),
      gia_them: Number(optionPrice.value),
      dang_ban: true,
    });
    optionName.value = "";
    optionPrice.value = 0;
    await refreshCurrent();
    success("Đã tạo tùy chọn.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function toggleOption(opt) {
  saving.value = true;
  try {
    await api.updateOption(opt.ma_tuy_chon, {
      dang_ban: !Boolean(opt.dang_ban),
    });
    await refreshCurrent();
    success("Đã cập nhật tùy chọn.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function toggleGroup(group, key) {
  saving.value = true;
  try {
    await api.updateOptionGroup(group.ma_nhom_tuy_chon, {
      [key]: !Boolean(group[key]),
    });
    await refreshCurrent();
    success("Đã cập nhật nhóm.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function editOption(opt) {
  const label = window.prompt("Tên tùy chọn", opt.ten_tuy_chon);
  if (label === null) return;
  const priceRaw = window.prompt("Phụ phí", String(opt.gia_them));
  if (priceRaw === null) return;
  const price = Number(priceRaw);
  if (price < 0 || !Number.isFinite(price)) {
    error.value = "Phụ phí không hợp lệ.";
    return;
  }
  saving.value = true;
  try {
    await api.updateOption(opt.ma_tuy_chon, {
      ten_tuy_chon: label,
      gia_them: price,
    });
    await refreshCurrent();
    success("Đã sửa tùy chọn.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function uploadImage() {
  if (!uploadFile.value) return;
  if (uploadFile.value.size > 3 * 1024 * 1024) {
    error.value = "Ảnh tối đa 3 MB.";
    return;
  }
  saving.value = true;
  try {
    await api.uploadProductImage(
      current.value.ma_san_pham,
      uploadFile.value,
      uploadPrimary.value,
    );
    uploadFile.value = null;
    await refreshCurrent();
    success("Đã tải ảnh lên.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
async function actionImage(kind, id) {
  if (kind === "remove" && !window.confirm("Xóa ảnh này?")) return;
  saving.value = true;
  try {
    if (kind === "main") await api.setPrimaryImage(id);
    else await api.deleteProductImage(id);
    await refreshCurrent();
    success("Đã cập nhật ảnh.");
  } catch (e) {
    fail(e);
  } finally {
    saving.value = false;
  }
}
function closeEditor() {
  editor.value = false;
  current.value = null;
  error.value = "";
  notice.value = "";
}
function searchNow() {
  page.value = 1;
  load();
}
onMounted(async () => {
  await Promise.all([load(), loadCategories()]);
});
</script>
<template>
  <div class="admin-view">
    <div class="admin-page-heading">
      <div>
        <span class="eyebrow">CATALOG / COFFESHOP</span>
        <h1>{{ editor ? "Thông tin sản phẩm" : "Quản lý sản phẩm" }}</h1>
        <p>Thực đơn, cà phê đóng gói, biến thể, tùy chọn và hình ảnh.</p>
      </div>
      <button
        class="admin-btn dark"
        type="button"
        @click="editor ? closeEditor() : newProduct()"
      >
        <ArrowLeft v-if="editor" :size="17" /><Plus v-else :size="17" />{{
          editor ? "Quay lại danh sách" : "Thêm sản phẩm"
        }}
      </button>
    </div>
    <p v-if="error" class="admin-alert danger" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-alert success" role="status">{{ notice }}</p>
    <template v-if="!editor">
      <div class="admin-panel admin-filter-row">
        <label class="admin-search"
          ><Search :size="16" /><input
            v-model="search"
            placeholder="Tìm tên sản phẩm…"
            @keyup.enter="searchNow" /></label
        ><select
          v-model="selectedType"
          class="admin-select"
          @change="searchNow"
        >
          <option value="">Tất cả loại</option>
          <option value="DO_UONG">Đồ uống</option>
          <option value="DONG_GOI">Hạt & bột</option></select
        ><button class="admin-btn outline" @click="searchNow">Lọc</button>
      </div>
      <div class="admin-panel admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Loại</th>
              <th>Danh mục</th>
              <th>Giá từ</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.ma_san_pham">
              <td>
                <div class="admin-product-cell">
                  <img
                    :src="productImage(p.hinh_anh, p.loai_san_pham)"
                    alt=""
                  />
                  <div>
                    <strong>{{ p.ten_san_pham }}</strong
                    ><small>#{{ p.ma_san_pham }}</small>
                  </div>
                </div>
              </td>
              <td>
                {{ p.loai_san_pham === "DO_UONG" ? "Đồ uống" : "Đóng gói" }}
              </td>
              <td>{{ p.ten_danh_muc }}</td>
              <td>{{ p.gia_tu == null ? "Chưa có" : formatVND(p.gia_tu) }}</td>
              <td>
                <span
                  class="admin-status"
                  :class="p.dang_ban ? 'ok' : 'muted'"
                  >{{ p.dang_ban ? "Đang bán" : "Ngừng bán" }}</span
                >
              </td>
              <td>
                <button class="admin-link" @click="openProduct(p.ma_san_pham)">
                  Quản lý
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="admin-empty">
                {{ loading ? "Đang tải…" : "Không có sản phẩm phù hợp." }}
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
        ><span>Trang {{ page }} / {{ totalPages }}</span
        ><button
          :disabled="page >= totalPages"
          @click="
            page++;
            load();
          "
        >
          Sau
        </button>
      </div>
    </template>
    <template v-else>
      <form class="admin-panel admin-form-panel" @submit.prevent="saveProduct">
        <div class="admin-section-heading">
          <h2>{{ isEditing ? "Sửa sản phẩm" : "Tạo sản phẩm mới" }}</h2>
          <span v-if="current">ID #{{ current.ma_san_pham }}</span>
        </div>
        <div class="admin-form-grid">
          <label
            >Tên sản phẩm<input
              v-model="productForm.ten_san_pham"
              required
              maxlength="200" /></label
          ><label
            >Danh mục<select v-model="productForm.ma_danh_muc" required>
              <option value="">Chọn danh mục</option>
              <option
                v-for="c in categories.filter((x) => x.dang_hoat_dong)"
                :key="c.ma_danh_muc"
                :value="c.ma_danh_muc"
              >
                {{ c.ten_danh_muc }}
              </option>
            </select></label
          ><label
            >Loại sản phẩm<select
              v-model="productForm.loai_san_pham"
              :disabled="!!current?.bien_the?.length"
            >
              <option value="DO_UONG">Đồ uống pha chế</option>
              <option value="DONG_GOI">Hạt/bột đóng gói</option>
            </select></label
          ><label class="admin-check"
            ><input v-model="productForm.dang_ban" type="checkbox" /> Đang kinh
            doanh</label
          ><label class="admin-span"
            >Mô tả<textarea v-model="productForm.mo_ta" rows="3" />
          </label>
        </div>
        <div class="admin-actions">
          <button class="admin-btn dark" :disabled="saving">
            {{ saving ? "Đang lưu…" : "Lưu thông tin" }}</button
          ><button
            v-if="current && current.dang_ban"
            type="button"
            class="admin-btn danger"
            @click="hideCurrent"
          >
            Ngừng bán
          </button>
        </div>
      </form>
      <template v-if="current">
        <section class="admin-panel admin-form-panel">
          <div class="admin-section-heading">
            <h2>Biến thể & giá</h2>
            <span>Size / Trọng lượng</span>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Tên</th>
                  <th>Quy cách</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in current.bien_the" :key="v.ma_bien_the">
                  <td>{{ v.ma_sku }}</td>
                  <td>{{ v.ten_bien_the }}</td>
                  <td>
                    {{
                      variantPack
                        ? `${v.khoi_luong_gram || "–"}g`
                        : v.kich_co || "–"
                    }}
                  </td>
                  <td>{{ formatVND(v.gia_ban) }}</td>
                  <td>{{ v.dang_ban ? "Đang bán" : "Đã ẩn" }}</td>
                  <td>
                    <button class="admin-link" @click="editVariant(v)">
                      Sửa
                    </button>
                    ·
                    <button class="admin-link" @click="toggleVariant(v)">
                      {{ v.dang_ban ? "Ẩn" : "Bật" }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!current.bien_the?.length">
                  <td colspan="6" class="admin-empty">
                    Chưa có biến thể. Cần tạo để bán hàng.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="admin-inline-form" @submit.prevent="addVariant">
            <input
              v-model="variantForm.ma_sku"
              placeholder="SKU duy nhất"
              required
            /><input
              v-model="variantForm.ten_bien_the"
              placeholder="Tên biến thể"
              required
            /><input
              v-if="!variantPack"
              v-model="variantForm.kich_co"
              placeholder="Size (S/M/L)"
            /><input
              v-else
              v-model.number="variantForm.khoi_luong_gram"
              type="number"
              min="1"
              placeholder="Khối lượng (g)"
              required
            /><input
              v-if="variantPack"
              v-model="variantForm.loai_hat"
              placeholder="Loại hạt"
            /><input
              v-if="variantPack"
              v-model="variantForm.do_xay"
              placeholder="Độ xay"
            /><input
              v-model.number="variantForm.gia_ban"
              type="number"
              min="0"
              placeholder="Giá bán"
              required
            /><button class="admin-btn dark" :disabled="saving">
              Thêm biến thể
            </button>
          </form>
          <p v-if="variantPack" class="admin-hint">
            Biến thể cà phê đóng gói được tạo với tồn kho 0; cập nhật tại trang
            Tồn kho.
          </p>
        </section>
        <section v-if="!variantPack" class="admin-panel admin-form-panel">
          <div class="admin-section-heading">
            <h2>Tùy chọn đồ uống</h2>
            <span>Đường, đá, topping</span>
          </div>
          <div
            v-for="g in current.nhom_tuy_chon"
            :key="g.ma_nhom_tuy_chon"
            class="admin-option-row"
          >
            <div>
              <strong>{{ g.ten_nhom }}</strong>
              <div class="admin-inline-controls">
                <label
                  ><input
                    type="checkbox"
                    :checked="!!g.bat_buoc_chon"
                    @change="toggleGroup(g, 'bat_buoc_chon')"
                  />
                  Bắt buộc</label
                ><label
                  ><input
                    type="checkbox"
                    :checked="!!g.cho_chon_nhieu"
                    @change="toggleGroup(g, 'cho_chon_nhieu')"
                  />
                  Chọn nhiều</label
                >
              </div>
            </div>
            <div class="admin-chip-list">
              <span
                v-for="v in g.gia_tri"
                :key="v.ma_tuy_chon"
                class="admin-chip"
                :class="!v.dang_ban ? 'disabled' : ''"
                >{{ v.ten_tuy_chon }} ({{ formatVND(v.gia_them) }})
                <button title="Sửa" @click="editOption(v)">
                  <Pencil :size="12" /></button
                ><button
                  :title="v.dang_ban ? 'Ngừng bán' : 'Bật lại'"
                  @click="toggleOption(v)"
                >
                  {{ v.dang_ban ? "×" : "+" }}
                </button></span
              >
            </div>
          </div>
          <div class="admin-form-grid">
            <form class="admin-inline-form" @submit.prevent="addGroup">
              <input
                v-model="groupName"
                placeholder="Nhóm mới (ví dụ: Mức đá)"
                required
              /><button class="admin-btn outline">Thêm nhóm</button>
            </form>
            <form class="admin-inline-form" @submit.prevent="addOption">
              <select v-model="targetGroup" required>
                <option value="">Chọn nhóm</option>
                <option
                  v-for="g in current.nhom_tuy_chon"
                  :key="g.ma_nhom_tuy_chon"
                  :value="g.ma_nhom_tuy_chon"
                >
                  {{ g.ten_nhom }}
                </option></select
              ><input
                v-model="optionName"
                placeholder="Tên tùy chọn"
                required
              /><input
                v-model.number="optionPrice"
                type="number"
                min="0"
                placeholder="Phụ phí"
              /><button class="admin-btn outline">Thêm lựa chọn</button>
            </form>
          </div>
        </section>
        <section class="admin-panel admin-form-panel">
          <div class="admin-section-heading">
            <h2>Hình ảnh sản phẩm</h2>
            <span>JPG / PNG / WebP · tối đa 3 MB</span>
          </div>
          <div class="admin-images">
            <div
              v-for="img in current.hinh_anh"
              :key="img.ma_hinh_anh"
              class="admin-image-item"
            >
              <img
                :src="productImage(img.duong_dan_anh, current.loai_san_pham)"
                alt="Hình sản phẩm"
              /><small>{{
                img.la_anh_chinh ? "Ảnh đại diện" : "Ảnh phụ"
              }}</small>
              <div>
                <button
                  v-if="!img.la_anh_chinh"
                  class="admin-link"
                  @click="actionImage('main', img.ma_hinh_anh)"
                >
                  Đặt chính</button
                ><button
                  class="admin-link"
                  @click="actionImage('remove', img.ma_hinh_anh)"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
          <form class="admin-inline-form" @submit.prevent="uploadImage">
            <label class="admin-file-input"
              ><ImagePlus :size="18" />Chọn ảnh<input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                @change="
                  uploadFile = $event.target.files?.[0] || null
                " /></label
            ><span v-if="uploadFile">{{ uploadFile.name }}</span
            ><label class="admin-check"
              ><input v-model="uploadPrimary" type="checkbox" /> Ảnh
              chính</label
            ><button class="admin-btn dark" :disabled="saving || !uploadFile">
              Tải ảnh lên
            </button>
          </form>
        </section>
      </template>
    </template>
  </div>
</template>
