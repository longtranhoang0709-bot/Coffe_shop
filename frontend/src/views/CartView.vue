<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-vue-next";
import { useCartStore } from "../stores/cart";
import { getProduct, productImage } from "../api/products";
import { formatVND } from "../format";
import { errorText } from "../api/axios";

const cart = useCartStore();
const busy = ref(null);
const error = ref("");
const editing = ref(null);
const loadingOptions = ref(false);
const optionGroups = ref([]);
const chosen = ref({});
const note = ref("");
const cartValid = computed(
  () => !!cart.cart.co_the_dat_hang && !cart.loading && !busy.value,
);

onMounted(async () => {
  try {
    await cart.refresh();
  } catch (e) {
    error.value = errorText(e);
  }
});

async function change(item, delta) {
  const next = item.so_luong + delta;
  if (next < 1 || next > 99) return;
  busy.value = item.ma_chi_tiet_gio;
  error.value = "";
  try {
    await cart.change(item.ma_chi_tiet_gio, { so_luong: next });
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = null;
  }
}
async function remove(item) {
  busy.value = item.ma_chi_tiet_gio;
  error.value = "";
  try {
    await cart.remove(item.ma_chi_tiet_gio);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = null;
  }
}
async function clear() {
  if (!window.confirm("Bạn muốn xóa toàn bộ giỏ hàng?")) return;
  busy.value = "all";
  error.value = "";
  try {
    await cart.clear();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = null;
  }
}
async function editItem(item) {
  editing.value = item;
  loadingOptions.value = true;
  error.value = "";
  note.value = item.ghi_chu || "";
  chosen.value = {};
  try {
    const product = await getProduct(item.ma_san_pham);
    optionGroups.value = product.nhom_tuy_chon || [];
    const ids = new Set(
      (item.tuy_chon_da_chon || []).map((o) => Number(o.ma_tuy_chon)),
    );
    for (const group of optionGroups.value) {
      chosen.value[group.ma_nhom_tuy_chon] = (group.gia_tri || [])
        .filter((option) => ids.has(Number(option.ma_tuy_chon)))
        .map((option) => option.ma_tuy_chon);
    }
  } catch (e) {
    error.value = errorText(e);
    editing.value = null;
  } finally {
    loadingOptions.value = false;
  }
}
function pickOption(group, option) {
  const id = group.ma_nhom_tuy_chon;
  const selected = chosen.value[id] || [];
  if (group.cho_chon_nhieu) {
    chosen.value[id] = selected.includes(option.ma_tuy_chon)
      ? selected.filter((value) => value !== option.ma_tuy_chon)
      : [...selected, option.ma_tuy_chon];
  } else {
    chosen.value[id] =
      selected.includes(option.ma_tuy_chon) && !group.bat_buoc_chon
        ? []
        : [option.ma_tuy_chon];
  }
}
async function saveChanges() {
  if (!editing.value) return;
  const missing = optionGroups.value.find(
    (g) => g.bat_buoc_chon && !(chosen.value[g.ma_nhom_tuy_chon] || []).length,
  );
  if (missing) {
    error.value = `Vui lòng chọn ${missing.ten_nhom.toLowerCase()}.`;
    return;
  }
  busy.value = editing.value.ma_chi_tiet_gio;
  error.value = "";
  try {
    await cart.change(editing.value.ma_chi_tiet_gio, {
      tuy_chon_da_chon: Object.values(chosen.value).flat(),
      ghi_chu: note.value.trim() || null,
    });
    editing.value = null;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div class="container">
    <div class="page-top">
      <span class="eyebrow">YOUR DAILY COFFEE RITUAL</span>
      <h1 class="display">Giỏ hàng của bạn.</h1>
      <p>
        Điều chỉnh món, kích thước, đường, đá và ghi chú trước khi đặt hàng.
      </p>
    </div>
    <div
      v-if="error || cart.error"
      class="notice notice-error"
      role="alert"
      style="margin-bottom: 20px"
    >
      {{ error || cart.error }}
    </div>
    <div v-if="cart.loading" class="busy">Đang đồng bộ giỏ hàng...</div>
    <div
      v-else-if="!cart.items.length"
      class="empty-state"
      style="margin-bottom: 90px"
    >
      <h3>Giỏ hàng đang trống</h3>
      <p>Hãy bắt đầu bằng một thức uống hoặc gói cà phê yêu thích.</p>
      <RouterLink to="/menu" class="btn btn-dark">XEM THỰC ĐƠN</RouterLink>
    </div>
    <div v-else class="cart-layout">
      <section>
        <div class="cart-table">
          <article
            v-for="item in cart.items"
            :key="item.ma_chi_tiet_gio"
            class="cart-item"
          >
            <RouterLink :to="`/products/${item.ma_san_pham}`">
              <img
                class="cart-thumb"
                :src="productImage(item.hinh_anh, item.loai_san_pham)"
                :alt="item.ten_san_pham"
                @error="
                  (e) => (e.target.src = productImage(null, item.loai_san_pham))
                "
              />
            </RouterLink>
            <div>
              <RouterLink :to="`/products/${item.ma_san_pham}`"
                ><h3>{{ item.ten_san_pham }}</h3></RouterLink
              >
              <p>{{ item.ten_bien_the }}</p>
              <p v-if="item.tuy_chon_da_chon?.length">
                {{
                  item.tuy_chon_da_chon.map((o) => o.ten_tuy_chon).join(" · ")
                }}
              </p>
              <p v-if="item.ghi_chu">Ghi chú: {{ item.ghi_chu }}</p>
              <button
                class="text-button cart-edit-button"
                :disabled="busy !== null"
                @click="editItem(item)"
              >
                <Pencil :size="13" /> Chỉnh tùy chọn
              </button>
              <p v-if="!item.hop_le" class="notice notice-error">
                {{ item.loi?.join("; ") }}
              </p>
            </div>
            <div class="cart-item-actions">
              <strong>{{ formatVND(item.thanh_tien) }}</strong>
              <div class="quantity-picker" style="height: 35px">
                <button
                  :disabled="busy !== null"
                  aria-label="Giảm số lượng"
                  @click="change(item, -1)"
                >
                  <Minus :size="12" />
                </button>
                <span style="min-width: 25px">{{ item.so_luong }}</span>
                <button
                  :disabled="busy !== null"
                  aria-label="Tăng số lượng"
                  @click="change(item, 1)"
                >
                  <Plus :size="12" />
                </button>
              </div>
              <button
                class="text-button"
                :disabled="busy !== null"
                aria-label="Xóa sản phẩm"
                @click="remove(item)"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </article>
        </div>
        <div class="cart-bottom-actions">
          <RouterLink class="arrow-link" to="/menu"
            ><ArrowLeft :size="15" /> Tiếp tục mua sắm</RouterLink
          >
          <button class="text-button" :disabled="busy !== null" @click="clear">
            Xóa toàn bộ
          </button>
        </div>
      </section>
      <aside class="cart-totals">
        <span class="eyebrow">ORDER SUMMARY</span>
        <h2>Đơn hàng tạm tính.</h2>
        <div class="price-line">
          <span>{{ cart.count }} sản phẩm</span
          ><strong>{{ formatVND(cart.subtotal) }}</strong>
        </div>
        <div class="price-line">
          <span>Giảm giá / phí vận chuyển</span><span>Tính ở bước sau</span>
        </div>
        <hr class="line-divider" />
        <div class="price-line">
          <strong>Tạm tính</strong
          ><strong style="font-size: 20px">{{
            formatVND(cart.subtotal)
          }}</strong>
        </div>
        <p class="cart-checkout-hint">
          Giá và số lượng tồn kho được kiểm tra lại trước khi tạo đơn.
        </p>
        <RouterLink
          v-if="cartValid"
          class="btn btn-dark btn-block"
          to="/checkout"
          >TIẾN HÀNH ĐẶT HÀNG <ArrowRight :size="17"
        /></RouterLink>
        <button v-else class="btn btn-dark btn-block" disabled>
          VUI LÒNG KIỂM TRA GIỎ HÀNG
        </button>
      </aside>
    </div>

    <div v-if="editing" class="cart-edit-backdrop" @click.self="editing = null">
      <section
        class="cart-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Tùy chọn sản phẩm"
      >
        <div class="cart-edit-head">
          <div>
            <span class="eyebrow">PERSONALIZE YOUR COFFEE</span>
            <h2>{{ editing.ten_san_pham }}</h2>
          </div>
          <button class="icon-btn" aria-label="Đóng" @click="editing = null">
            <X :size="20" />
          </button>
        </div>
        <div v-if="loadingOptions" class="busy">Đang tải tùy chọn...</div>
        <template v-else>
          <div
            v-for="g in optionGroups"
            :key="g.ma_nhom_tuy_chon"
            class="cart-edit-group"
          >
            <p class="option-title">
              {{ g.ten_nhom }} <span v-if="g.bat_buoc_chon"> · Bắt buộc</span>
            </p>
            <div class="choice-list">
              <button
                v-for="o in g.gia_tri"
                :key="o.ma_tuy_chon"
                class="choice"
                :class="{
                  active: (chosen[g.ma_nhom_tuy_chon] || []).includes(
                    o.ma_tuy_chon,
                  ),
                }"
                @click="pickOption(g, o)"
              >
                {{ o.ten_tuy_chon }}
                <span v-if="Number(o.gia_them)"
                  >(+{{ formatVND(o.gia_them) }})</span
                >
              </button>
            </div>
          </div>
          <div class="field">
            <label for="edit-item-note">Ghi chú pha chế</label
            ><textarea
              id="edit-item-note"
              v-model="note"
              class="textarea"
              maxlength="500"
              placeholder="Ví dụ: ít đá, không quá ngọt..."
            />
          </div>
          <div v-if="error" class="notice notice-error" role="alert">
            {{ error }}
          </div>
          <div class="cart-edit-actions">
            <button class="btn btn-light" @click="editing = null">HỦY</button
            ><button
              class="btn btn-dark"
              :disabled="busy !== null"
              @click="saveChanges"
            >
              {{ busy ? "ĐANG LƯU..." : "LƯU THAY ĐỔI" }}
            </button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
