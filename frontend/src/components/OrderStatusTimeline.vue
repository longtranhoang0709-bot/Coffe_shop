<script setup>
import { computed } from "vue";
import { Check } from "lucide-vue-next";
const props = defineProps({
  status: { type: String, default: "CHO_XAC_NHAN" },
  method: { type: String, default: "GIAO_TAN_NOI" },
});
const phases = computed(() =>
  props.method === "GIAO_TAN_NOI"
    ? [
        "CHO_XAC_NHAN",
        "DA_XAC_NHAN",
        "DANG_CHUAN_BI",
        "DANG_GIAO",
        "HOAN_THANH",
      ]
    : [
        "CHO_XAC_NHAN",
        "DA_XAC_NHAN",
        "DANG_CHUAN_BI",
        "CHO_NHAN",
        "HOAN_THANH",
      ],
);
const currentIndex = computed(() => phases.value.indexOf(props.status));
const labels = {
  CHO_XAC_NHAN: "Chờ xác nhận",
  DA_XAC_NHAN: "Đã xác nhận",
  DANG_CHUAN_BI: "Đang chuẩn bị",
  CHO_NHAN: "Chờ nhận",
  DANG_GIAO: "Đang giao",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};
</script>
<template>
  <div
    v-if="status === 'DA_HUY'"
    class="cs34-alert cs34-alert-warn"
    role="status"
  >
    Đơn hàng đã hủy. Không có bước giao nhận tiếp theo.
  </div>
  <ol v-else class="cs34-steps" aria-label="Tiến độ đơn hàng">
    <li
      v-for="(step, i) in phases"
      :key="step"
      :class="{ done: currentIndex >= i, current: currentIndex === i }"
    >
      <span class="cs34-step-num"
        ><Check v-if="currentIndex > i" :size="13" /><span v-else>{{
          i + 1
        }}</span></span
      >
      <span>{{ labels[step] }}</span>
    </li>
  </ol>
</template>
