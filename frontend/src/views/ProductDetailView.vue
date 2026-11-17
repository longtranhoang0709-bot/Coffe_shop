<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowRight,
  ShoppingBag,
  Check,
  ShieldCheck,
  Minus,
  Plus,
} from "lucide-vue-next";
import { getProduct, productImage } from "../api/products";
import { formatVND, productTypeLabel } from "../format";
import { errorText } from "../api/axios";
import { useCartStore } from "../stores/cart";
const route = useRoute(),
  router = useRouter(),
  cart = useCartStore();
const product = ref(null),
  loading = ref(true),
  error = ref(""),
  notice = ref(""),
  selectedVariant = ref(null),
  selectedOptions = ref({}),
  quantity = ref(1),
  adding = ref(false);
const variants = computed(() => product.value?.bien_the || []);
const groups = computed(() => product.value?.nhom_tuy_chon || []);
const price = computed(() => {
  let amount = Number(selectedVariant.value?.gia_ban || 0);
  for (const g of groups.value) {
    for (const o of g.gia_tri || []) {
      if (
        (selectedOptions.value[g.ma_nhom_tuy_chon] || []).includes(
          o.ma_tuy_chon,
        )
      )
        amount += Number(o.gia_them || 0);
    }
  }
  return amount;
});
const stock = computed(() => selectedVariant.value?.so_luong_ton);
const soldOut = computed(
  () =>
    product.value?.loai_san_pham === "DONG_GOI" &&
    Number(stock.value ?? 0) < quantity.value,
);
const image = computed(() =>
  productImage(
    product.value?.hinh_anh?.[0]?.duong_dan_anh,
    product.value?.loai_san_pham,
  ),
);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    product.value = await getProduct(route.params.id);
    selectedVariant.value = variants.value[0] || null;
    selectedOptions.value = {};
    quantity.value = 1;
    groups.value.forEach((g) => {
      selectedOptions.value[g.ma_nhom_tuy_chon] =
        g.bat_buoc_chon && g.gia_tri?.length ? [g.gia_tri[0].ma_tuy_chon] : [];
    });
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
function selectOption(g, o) {
  const id = g.ma_nhom_tuy_chon,
    current = selectedOptions.value[id] || [];
  if (g.cho_chon_nhieu) {
    selectedOptions.value[id] = current.includes(o.ma_tuy_chon)
      ? current.filter((x) => x !== o.ma_tuy_chon)
      : [...current, o.ma_tuy_chon];
  } else {
    selectedOptions.value[id] = [o.ma_tuy_chon];
  }
}
async function addCart() {
  if (!selectedVariant.value) return;
  adding.value = true;
  error.value = "";
  notice.value = "";
  try {
    await cart.add({
      ma_bien_the: selectedVariant.value.ma_bien_the,
      so_luong: quantity.value,
      tuy_chon_da_chon: Object.values(selectedOptions.value).flat(),
      ghi_chu: null,
    });
    notice.value = "Đã thêm vào giỏ hàng.";
  } catch (e) {
    error.value = errorText(e);
  } finally {
    adding.value = false;
  }
}
onMounted(load);
watch(() => route.params.id, load);
</script>
<template>
  <div class="container">
    <div class="breadcrumb">
      <RouterLink to="/">Trang chủ</RouterLink><span>/</span
      ><RouterLink to="/menu">Thực đơn</RouterLink><span>/</span
      ><span>{{ product?.ten_san_pham || "Chi tiết" }}</span>
    </div>
    <div v-if="loading" class="busy">Đang tải sản phẩm...</div>
    <div v-else-if="error && !product" class="notice notice-error">
      {{ error }}
    </div>
    <div v-else-if="product" class="product-detail">
      <div class="detail-image">
        <img
          :src="image"
          :alt="product.ten_san_pham"
          @error="
            (e) => (e.target.src = productImage(null, product.loai_san_pham))
          "
        />
      </div>
      <div class="detail-info">
        <span class="eyebrow"
          >{{ productTypeLabel(product.loai_san_pham) }} / COFFESHOP</span
        >
        <h1>{{ product.ten_san_pham }}</h1>
        <p class="muted" style="font-size: 12px">{{ product.ten_danh_muc }}</p>
        <p class="detail-price">{{ formatVND(price) }}</p>
        <p class="detail-description">
          {{
            product.mo_ta ||
            "Khám phá hương vị cà phê được chọn lọc với nhiều quy cách và tùy chọn phù hợp với sở thích của bạn."
          }}
        </p>
        <template v-if="variants.length"
          ><p class="option-title">CHỌN QUY CÁCH / KÍCH THƯỚC</p>
          <div class="choice-list">
            <button
              v-for="variant in variants"
              :key="variant.ma_bien_the"
              class="choice"
              :class="{
                active: selectedVariant?.ma_bien_the === variant.ma_bien_the,
              }"
              @click="selectedVariant = variant"
            >
              {{ variant.ten_bien_the
              }}<span v-if="variant.khoi_luong_gram">
                · {{ variant.khoi_luong_gram }}g</span
              >
            </button>
          </div></template
        >
        <div v-for="g in groups" :key="g.ma_nhom_tuy_chon">
          <p class="option-title">
            {{ g.ten_nhom.toUpperCase() }}
            <span v-if="g.bat_buoc_chon" class="muted">Bắt buộc</span>
          </p>
          <div class="choice-list">
            <button
              v-for="o in g.gia_tri"
              :key="o.ma_tuy_chon"
              class="choice"
              :class="{
                active: (selectedOptions[g.ma_nhom_tuy_chon] || []).includes(
                  o.ma_tuy_chon,
                ),
              }"
              @click="selectOption(g, o)"
            >
              {{ o.ten_tuy_chon }}
              <span v-if="Number(o.gia_them)"
                >(+{{ formatVND(o.gia_them) }})</span
              >
            </button>
          </div>
        </div>
        <p class="option-title">SỐ LƯỢNG</p>
        <div class="quantity-picker">
          <button
            aria-label="Giảm số lượng"
            @click="quantity = Math.max(1, quantity - 1)"
          >
            <Minus :size="15" /></button
          ><span>{{ quantity }}</span
          ><button
            aria-label="Tăng số lượng"
            @click="quantity = Math.min(99, quantity + 1)"
          >
            <Plus :size="15" />
          </button>
        </div>
        <p v-if="soldOut" class="notice notice-error" style="margin-top: 15px">
          Không đủ tồn kho cho số lượng đã chọn. Còn {{ stock || 0 }} sản phẩm.
        </p>
        <div
          v-if="notice"
          class="notice notice-success"
          style="margin-top: 15px"
        >
          {{ notice }}
          <RouterLink to="/cart"
            ><b><u>Xem giỏ hàng</u></b></RouterLink
          >
        </div>
        <div v-if="error" class="notice notice-error" style="margin-top: 15px">
          {{ error }}
        </div>
        <div class="buy-row">
          <button
            class="btn btn-dark"
            :disabled="adding || !selectedVariant || soldOut"
            @click="addCart"
          >
            <ShoppingBag :size="17" />
            {{
              adding
                ? "ĐANG THÊM..."
                : `THÊM GIỎ • ${formatVND(price * quantity)}`
            }}</button
          ><RouterLink to="/cart" class="btn btn-light"
            >XEM GIỎ <ArrowRight :size="16"
          /></RouterLink>
        </div>
        <div class="detail-meta">
          <span
            ><Check
              :size="15"
              style="display: inline; vertical-align: middle"
            />
            Giá và tùy chọn được xác nhận bởi Backend</span
          ><span
            ><ShieldCheck
              :size="15"
              style="display: inline; vertical-align: middle"
            />
            Đồ uống giao nội thành; cà phê đóng gói hỗ trợ nhiều tỉnh
            thành</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
