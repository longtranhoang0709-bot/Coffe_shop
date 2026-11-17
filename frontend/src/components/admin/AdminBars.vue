<script setup>
import { computed } from "vue";
import { formatVND } from "../../format";
const props = defineProps({
  items: { type: Array, default: () => [] },
  labelKey: { type: String, default: "ky_bao_cao" },
  valueKey: { type: String, default: "tong_tien_thu" },
  currency: { type: Boolean, default: true },
});
const max = computed(() =>
  Math.max(1, ...props.items.map((x) => Number(x[props.valueKey]) || 0)),
);
const visible = computed(() => props.items.slice(-24));
</script>
<template>
  <div class="admin-chart" role="img" aria-label="Biểu đồ doanh thu">
    <div v-if="!visible.length" class="admin-empty">
      Chưa có số liệu trong khoảng thời gian này.
    </div>
    <div v-else class="admin-chart-bars">
      <div
        v-for="item in visible"
        :key="item[labelKey]"
        class="admin-chart-item"
        :title="`${item[labelKey]}: ${currency ? formatVND(item[valueKey]) : item[valueKey]}`"
      >
        <div class="admin-chart-bar-track">
          <div
            class="admin-chart-bar"
            :style="{
              height: `${Math.max(3, ((Number(item[valueKey]) || 0) / max) * 100)}%`,
            }"
          />
        </div>
        <span>{{ item[labelKey] }}</span>
      </div>
    </div>
  </div>
</template>
