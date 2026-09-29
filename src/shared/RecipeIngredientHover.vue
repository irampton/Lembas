<template>
  <span class="relative" :class="{ 'cursor-pointer': usePointer && hasConversions }"
    @mouseenter="canOpen && (open = true)" @mouseleave="open = false">
    <slot />
    <BaseFloatingBox
      v-if="open && canOpen"
      :class="sidePlacement
        ? 'absolute right-full top-0 z-20 -mt-3 mr-2 w-max whitespace-nowrap text-left text-sm'
        : 'absolute left-0 top-full z-20 mt-2 w-max whitespace-nowrap text-left text-sm'"
    >
      <div class="font-semibold text-base-dark">{{ writtenAmount }}</div>
      <div v-for="conversion in conversions" :key="conversion.unit" class="text-light">
        {{ conversion.amount }} {{ conversion.label }}
      </div>
    </BaseFloatingBox>
  </span>
</template>

<script setup>
import { computed, ref } from "vue";
import BaseFloatingBox from "../baseComponents/BaseFloatingBox.vue";
import { formatMilliliters, getUnit, parseQuantity } from "../mixins/units.js";

const props = defineProps({
  quantity: { type: [String, Number], default: "" },
  unit: { type: String, default: "" },
  writtenUnit: { type: String, default: "" },
  sidePlacement: { type: Boolean, default: false },
  showWhenEmpty: { type: Boolean, default: false },
  usePointer: { type: Boolean, default: false },
});

const open = ref(false);
const definition = computed(() => getUnit(props.unit));
const amount = computed(() => parseQuantity(props.quantity));
const writtenAmount = computed(() => [props.quantity, props.writtenUnit || props.unit].filter(Boolean).join(" "));

const targets = Object.freeze({
  volume: [
    { unit: "tsp", label: "tsp" },
    { unit: "tbsp", label: "tbsp" },
    { unit: "cup", label: "cup" },
    { unit: "gal", label: "gal" },
    { unit: "ml", label: "mL" },
  ],
  mass: [
    { unit: "lb", label: "lb" },
    { unit: "oz", label: "oz" },
    { unit: "g", label: "g" },
  ],
});

const fractions = Object.freeze({
  "1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾",
  "1/5": "⅕", "2/5": "⅖", "3/5": "⅗", "4/5": "⅘", "1/6": "⅙",
  "5/6": "⅚", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞",
});
const fractionDenominators = [2, 3, 4, 5, 6, 8];

const formatAmount = (value) => {
  if (!Number.isFinite(value)) return "";
  const whole = Math.floor(value + 0.000001);
  const remainder = value - whole;
  let closest = null;
  for (const denominator of fractionDenominators) {
    const numerator = Math.round(remainder * denominator);
    const fraction = numerator / denominator;
    if (numerator && numerator < denominator && (!closest || Math.abs(remainder - fraction) < closest.difference)) {
      closest = { numerator, denominator, difference: Math.abs(remainder - fraction) };
    }
  }
  if (closest?.difference < 0.035) {
    const fraction = fractions[`${closest.numerator}/${closest.denominator}`];
    if (fraction) return whole ? `${whole}${fraction}` : fraction;
  }
  if (Math.abs(remainder) < 0.000001) return `${whole}`;
  return `${Math.round(value * 100) / 100}`;
};

const conversions = computed(() => {
  if (!definition.value?.conversion || !Number.isFinite(amount.value)) return [];
  return (targets[definition.value.dimension] || [])
    .filter(({ unit }) => unit !== definition.value.value)
    .map(({ unit, label }) => {
      const target = getUnit(unit);
      const convertedAmount = (amount.value * definition.value.conversion.factor) / target.conversion.factor;
      return {
        unit,
        label,
        amount: unit === "ml" ? formatMilliliters(convertedAmount) : formatAmount(convertedAmount),
        convertedAmount,
      };
    })
    .filter(({ convertedAmount }) => convertedAmount >= 1 / 8);
});
const hasConversions = computed(() => conversions.value.length > 0);
const canOpen = computed(() => hasConversions.value || props.showWhenEmpty);
</script>
