<script setup>
import { onMounted, ref } from "vue";
import { ArrowUpRight, Leaf, Truck, Coffee } from "lucide-vue-next";
import { getProducts } from "../api/products";
import { errorText } from "../api/axios";
import ProductCard from "../components/ProductCard.vue";

const products = ref([]);
const loading = ref(true);
const error = ref("");
onMounted(async () => {
  try {
    products.value = (await getProducts({ limit: 8 })).products || [];
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
});
</script>
<template>
  <div>
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <p class="overline">WELCOME TO COFFESHOP • EST. 2026</p>
          <h1>Hương vị<br />từ những <em>điều giản dị.</em></h1>
          <p>
            Từ tách cà phê buổi sáng đến những mẻ hạt rang nguyên chất. Mỗi
            khoảnh khắc đều xứng đáng có một hương vị riêng.
          </p>
          <div class="hero-actions">
            <RouterLink class="btn btn-dark" to="/menu"
              >KHÁM PHÁ THỰC ĐƠN <ArrowUpRight :size="17" /></RouterLink
            ><RouterLink
              class="arrow-link"
              :to="{ name: 'menu', query: { type: 'DONG_GOI' } }"
              >Cà phê hạt & bột <ArrowUpRight :size="15"
            /></RouterLink>
          </div>
        </div>
        <div class="hero-visual">
          <img src="/images/hero-cup.svg" alt="Tách cà phê thơm" />
          <div class="hero-badge">
            <strong>100%</strong><span>COFFEE<br />MOMENT</span>
          </div>
          <span class="hero-index">01 / GOOD COFFEE, GOOD DAY</span>
        </div>
      </div>
    </section>
    <div class="trust-bar">
      <div class="container trust-inner">
        <div><Coffee :size="17" :stroke-width="1.6" /> PHA CHẾ MỖI NGÀY</div>
        <div>
          <Leaf :size="17" :stroke-width="1.6" /> CÀ PHÊ HẠT NGUYÊN CHẤT
        </div>
        <div><Truck :size="17" :stroke-width="1.6" /> GIAO HÀNG LINH HOẠT</div>
      </div>
    </div>
    <section class="container page-section">
      <div class="section-heading">
        <div>
          <span class="eyebrow">CHỌN HƯƠNG VỊ CỦA BẠN</span>
          <h2>Một tách dành riêng cho bạn.</h2>
        </div>
        <p>
          Thưởng thức một tách cà phê tại quán, mang đi hoặc chọn những hạt rang
          yêu thích để pha tại nhà.
        </p>
      </div>
      <div class="category-grid">
        <RouterLink
          :to="{ name: 'menu', query: { type: 'DO_UONG' } }"
          class="category-tile"
          ><img src="/images/drink.svg" alt="Cà phê pha chế" />
          <div class="tile-copy">
            <span>01 / SIGNATURE</span>
            <h3>Đồ uống pha chế</h3>
          </div>
          <ArrowUpRight class="tile-arrow" :size="23"
        /></RouterLink>
        <RouterLink
          :to="{ name: 'menu', query: { type: 'DONG_GOI' } }"
          class="category-tile"
          ><img src="/images/pack.svg" alt="Cà phê nguyên chất" />
          <div class="tile-copy">
            <span>02 / PREMIUM</span>
            <h3>Hạt cà phê nguyên chất</h3>
          </div>
          <ArrowUpRight class="tile-arrow" :size="23"
        /></RouterLink>
        <RouterLink to="/menu" class="category-tile"
          ><img src="/images/beans.svg" alt="Khám phá thực đơn" />
          <div class="tile-copy">
            <span>03 / DISCOVER</span>
            <h3>Khám phá mọi hương vị</h3>
          </div>
          <ArrowUpRight class="tile-arrow" :size="23"
        /></RouterLink>
      </div>
    </section>
    <section class="container page-section" style="padding-top: 20px">
      <div class="section-heading">
        <div>
          <span class="eyebrow">THE COFFESHOP COLLECTION</span>
          <h2>Lựa chọn hôm nay.</h2>
        </div>
        <RouterLink class="arrow-link" to="/menu"
          >Xem toàn bộ thực đơn <ArrowUpRight :size="16"
        /></RouterLink>
      </div>
      <div v-if="loading" class="busy">Đang tải sản phẩm từ MySQL...</div>
      <div v-else-if="error" class="notice notice-error">{{ error }}</div>
      <div v-else-if="products.length" class="product-grid">
        <ProductCard
          v-for="product in products"
          :key="product.ma_san_pham"
          :product="product"
        />
      </div>
      <div v-else class="empty-state">
        <h3>Thực đơn đang được cập nhật</h3>
        <p>
          Hãy tạo sản phẩm và biến thể đang bán ở Module 3 để hiển thị tại đây.
        </p>
      </div>
    </section>
    <section class="story-section">
      <div class="container story-inner">
        <div class="story-visual">
          <img src="/images/pack.svg" alt="Cà phê rang xay đóng gói" />
        </div>
        <div class="story-content">
          <span class="eyebrow">TỪ HẠT CÀ PHÊ ĐẾN TÁCH YÊU THÍCH</span>
          <h2>Tinh tế trong<br />từng <em>hương vị.</em></h2>
          <p>
            Mỗi dòng cà phê mang trong mình một cá tính riêng. Khám phá những
            hạt cà phê đã rang và xay với các quy cách đóng gói phù hợp nhu cầu
            của bạn.
          </p>
          <RouterLink
            class="btn btn-dark"
            :to="{ name: 'menu', query: { type: 'DONG_GOI' } }"
            >KHÁM PHÁ CÀ PHÊ NGUYÊN CHẤT <ArrowUpRight :size="16"
          /></RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
