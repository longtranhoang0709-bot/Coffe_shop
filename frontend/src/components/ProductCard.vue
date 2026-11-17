<script setup>
import { ArrowUpRight } from "lucide-vue-next";
import { productImage } from "../api/products";
import { formatVND, productTypeLabel } from "../format";

const props = defineProps({ product: { type: Object, required: true } });
</script>
<template>
  <RouterLink :to="`/products/${product.ma_san_pham}`" class="product-card">
    <div
      class="product-photo"
      :class="{ 'product-photo-pack': product.loai_san_pham === 'DONG_GOI' }"
    >
      <img
        :src="productImage(product.hinh_anh, product.loai_san_pham)"
        :alt="product.ten_san_pham"
        loading="lazy"
        @error="
          (e) => (e.target.src = productImage(null, product.loai_san_pham))
        "
      />
      <span class="product-type">{{
        productTypeLabel(product.loai_san_pham)
      }}</span>
      <span class="card-arrow"><ArrowUpRight :size="18" /></span>
    </div>
    <div class="product-info">
      <div>
        <p class="product-category">
          {{ product.ten_danh_muc || "coffeShop selection" }}
        </p>
        <h3>{{ product.ten_san_pham }}</h3>
      </div>
      <p class="product-price">{{ formatVND(product.gia_tu) }}</p>
    </div>
  </RouterLink>
</template>
