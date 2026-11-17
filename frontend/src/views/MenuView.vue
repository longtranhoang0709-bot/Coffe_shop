<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
} from "lucide-vue-next";
import { getProducts, getCategories } from "../api/products";
import { errorText } from "../api/axios";
import ProductCard from "../components/ProductCard.vue";
const route = useRoute();
const router = useRouter();
const products = ref([]);
const categories = ref([]);
const total = ref(0);
const totalPages = ref(0);
const loading = ref(false);
const error = ref("");
const draftSearch = ref(route.query.search || "");
const params = reactive({
  type: route.query.type || "",
  categoryId: route.query.categoryId || "",
  search: route.query.search || "",
  sort: "moi_nhat",
  page: 1,
});
function setParam(key, value) {
  params[key] = value;
  params.page = 1;
  router.replace({
    name: "menu",
    query: { ...route.query, [key]: value || undefined },
  });
}
function submitSearch() {
  setParam("search", draftSearch.value.trim());
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getProducts({
      ...params,
      limit: 12,
      categoryId: params.categoryId || undefined,
      type: params.type || undefined,
    });
    products.value = data.products || [];
    total.value = data.total || 0;
    totalPages.value = data.totalPages || 0;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
onMounted(async () => {
  try {
    categories.value = await getCategories();
  } catch {
    categories.value = [];
  }
  await load();
});
watch(
  () => route.query,
  (q) => {
    params.type = q.type || "";
    params.search = q.search || "";
    params.categoryId = q.categoryId || "";
    draftSearch.value = params.search;
    params.page = 1;
  },
  { deep: true },
);
watch(params, load);
</script>
<template>
  <div class="container">
    <div class="page-top">
      <span class="eyebrow">CURATED COFFEE EXPERIENCE</span>
      <h1 class="display">Thực đơn của chúng tôi.</h1>
      <p>
        Khám phá từ những tách cà phê pha chế mỗi ngày đến cà phê nguyên hạt và
        xay bột. Mọi hương vị, cùng một nơi.
      </p>
    </div>
    <div class="menu-tools">
      <div class="filters">
        <button
          class="pill"
          :class="{ active: !params.type }"
          @click="setParam('type', '')"
        >
          Tất cả</button
        ><button
          class="pill"
          :class="{ active: params.type === 'DO_UONG' }"
          @click="setParam('type', 'DO_UONG')"
        >
          Đồ uống</button
        ><button
          class="pill"
          :class="{ active: params.type === 'DONG_GOI' }"
          @click="setParam('type', 'DONG_GOI')"
        >
          Cà phê hạt & bột
        </button>
      </div>
      <div class="menu-controls">
        <form
          @submit.prevent="submitSearch"
          style="display: flex; gap: 5px; flex: 1"
        >
          <input
            class="input"
            v-model="draftSearch"
            placeholder="Tìm sản phẩm..."
            aria-label="Tìm sản phẩm"
          /><button
            class="icon-btn"
            style="border: 1px solid var(--line); height: 48px; width: 48px"
            type="submit"
          >
            <Search :size="17" />
          </button>
        </form>
        <select
          class="select"
          v-model="params.categoryId"
          @change="params.page = 1"
          aria-label="Danh mục"
        >
          <option value="">Tất cả danh mục</option>
          <option
            v-for="category in categories"
            :key="category.ma_danh_muc"
            :value="category.ma_danh_muc"
          >
            {{ category.ten_danh_muc }}
          </option></select
        ><select
          class="select"
          v-model="params.sort"
          @change="params.page = 1"
          aria-label="Sắp xếp"
        >
          <option value="moi_nhat">Mới nhất</option>
          <option value="gia_tang">Giá tăng dần</option>
          <option value="gia_giam">Giá giảm dần</option>
        </select>
      </div>
    </div>
    <div class="section-heading" style="margin-top: 15px">
      <p style="margin: 0">{{ total }} sản phẩm phù hợp</p>
      <span class="eyebrow" style="color: #8a8379"
        ><SlidersHorizontal
          :size="13"
          style="display: inline; vertical-align: middle"
        />
        Menu</span
      >
    </div>
    <div v-if="loading" class="busy">Đang tải thực đơn...</div>
    <div v-else-if="error" class="notice notice-error">{{ error }}</div>
    <div v-else-if="!products.length" class="empty-state">
      <h3>Chưa tìm được sản phẩm</h3>
      <p>Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
    </div>
    <div v-else class="product-grid">
      <ProductCard
        v-for="product in products"
        :key="product.ma_san_pham"
        :product="product"
      />
    </div>
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="btn btn-ghost"
        :disabled="params.page === 1 || loading"
        @click="params.page--"
      >
        <ArrowLeft :size="16" /> Trước</button
      ><span>Trang {{ params.page }} / {{ totalPages }}</span
      ><button
        class="btn btn-ghost"
        :disabled="params.page === totalPages || loading"
        @click="params.page++"
      >
        Tiếp <ArrowRight :size="16" />
      </button>
    </div>
    <div style="height: 65px"></div>
  </div>
</template>
