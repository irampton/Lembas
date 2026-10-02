<template>
  <span ref="trigger" class="relative" :class="{ 'cursor-pointer': usePointer && hasConversions }"
    @mouseenter="openOnMouseEnter" @mouseleave="closeOnMouseLeave" @click="toggleOnTouch">
    <slot />
    <BaseFloatingBox
      v-if="open && canOpen"
      :class="sidePlacement
        ? 'absolute right-full top-0 z-20 -mt-3 mr-2 w-max whitespace-nowrap text-left text-sm'
        : 'absolute left-0 top-full z-20 mt-2 w-max whitespace-nowrap text-left text-sm'"
    >
      <div class="flex font-semibold text-base-dark">
        <span class="w-8 shrink-0 text-right mr-1">{{ primaryQuantity }}</span>
        <span>{{ primaryUnit }}</span>
        <span v-if="!hasConversions && ingredientName" class="ml-1">{{ ingredientName }}</span>
      </div>
      <div v-for="conversion in allConversions" :key="conversion.unit" class="flex text-light">
        <span class="w-10 shrink-0 text-right mr-1">{{ conversion.amount }}</span>
        <span>{{ conversion.label }}</span>
      </div>
    </BaseFloatingBox>
  </span>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import BaseFloatingBox from "../baseComponents/BaseFloatingBox.vue";
import { convertIngredientUnit, formatMetricQuantity, getIngredientDensity, getUnit, parseQuantity } from "../mixins/units.js";

const props = defineProps({
  quantity: { type: [String, Number], default: "" },
  unit: { type: String, default: "" },
  // RecipeDetailPage supplies these when its ingredient row has applied a
  // multiplier or unit conversion. The heading must mirror that row exactly.
  displayQuantity: { type: [String, Number], default: "" },
  displayUnit: { type: String, default: "" },
  writtenUnit: { type: String, default: "" },
  ingredientName: { type: String, default: "" },
  unitSystem: { type: String, default: "" },
  sidePlacement: { type: Boolean, default: false },
  showWhenEmpty: { type: Boolean, default: false },
  usePointer: { type: Boolean, default: false },
});

const open = ref(false);
const trigger = ref(null);
const openedByTouch = ref(false);
const definition = computed(() => getUnit(props.unit));
const amount = computed(() => parseQuantity(props.quantity));

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
const fractionDenominators = [2, 3, 4, 5, 6, 8, 16];

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
    return whole ? `${whole} ${closest.numerator}/${closest.denominator}` : `${closest.numerator}/${closest.denominator}`;
  }
  if (Math.abs(remainder) < 0.000001) return `${whole}`;
  return `${Math.round(value * 100) / 100}`;
};
const POPUP_CUP_INCREMENTS = [1 / 16, 1 / 6];
const METRIC_UNITS = new Set(["mg", "g", "kg", "ml", "cl", "dl", "l"]);
const isExactPopupCupAmount = (amount) => POPUP_CUP_INCREMENTS.some((increment) =>
  Math.abs(amount - Math.round(amount / increment) * increment) < 0.000001,
);
const roundPopupCupAmount = (amount) => POPUP_CUP_INCREMENTS
  .map((increment) => Math.round(amount / increment) * increment)
  .reduce((closest, candidate) =>
    Math.abs(amount - candidate) < Math.abs(amount - closest) ? candidate : closest,
  );
const formatPopupAmount = (amount, unit) => {
  if (METRIC_UNITS.has(unit)) return formatMetricQuantity(amount);
  if (unit !== "cup") return formatAmount(amount);
  if (amount < 1) return isExactPopupCupAmount(amount) ? formatAmount(amount) : null;
  return formatAmount(roundPopupCupAmount(amount));
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
        targetUnit: unit,
        label,
        dimension: target.dimension,
        system: customaryUnits.has(target.value) ? "customary" : "metric",
        amount: formatPopupAmount(convertedAmount, unit),
        convertedAmount,
      };
    })
    .filter(({ convertedAmount, amount }) => convertedAmount >= 1 / 8 && amount !== null);
});
const massVolumeConversions = computed(() => {
  if (!definition.value?.conversion || !Number.isFinite(amount.value) || !getIngredientDensity(props.ingredientName)) return [];
  const isVolume = definition.value.dimension === "volume";
  const targets = isVolume
    ? [{ unit: "oz", label: "oz" }, { unit: "lb", label: "lb" }, { unit: "g", label: "g" }]
    : [{ unit: "cup", label: "cup" }, { unit: "ml", label: "mL" }];
  return targets.map(({ unit, label }) => {
    const convertedAmount = convertIngredientUnit(amount.value, definition.value.value, unit, props.ingredientName);
    return {
      unit: `mass-volume-${unit}`,
      targetUnit: unit,
      label,
      dimension: getUnit(unit).dimension,
      system: customaryUnits.has(unit) ? "customary" : "metric",
      amount: formatPopupAmount(convertedAmount, unit),
      convertedAmount,
    };
  }).filter(({ convertedAmount, amount }) => Number.isFinite(convertedAmount) && convertedAmount >= 1 / 8 && amount !== null);
});
const customaryUnits = new Set(["tsp", "tbsp", "cup", "pt", "qt", "gal", "fl oz", "lb", "oz"]);
const selectorTargets = Object.freeze({
  "customary-volume": "cup",
  "customary-mass": "oz",
  "metric-volume": "ml",
  "metric-mass": "g",
});
const selectorConversion = computed(() => {
  let targetUnit = selectorTargets[props.unitSystem];
  if (!targetUnit || !definition.value?.conversion || !Number.isFinite(amount.value)) return null;
  let convertedAmount = convertIngredientUnit(amount.value, definition.value.value, targetUnit, props.ingredientName);
  if (!Number.isFinite(convertedAmount)) return null;
  // The metric buttons use their larger familiar unit for substantial amounts;
  // customary weight does the same once the result reaches a pound.
  if ((targetUnit === "ml" && convertedAmount > 1500) || (targetUnit === "g" && convertedAmount > 1500)) {
    targetUnit = targetUnit === "ml" ? "l" : "kg";
    convertedAmount = convertIngredientUnit(amount.value, definition.value.value, targetUnit, props.ingredientName);
  } else if (targetUnit === "oz" && convertedAmount > 16) {
    targetUnit = "lb";
    convertedAmount = convertIngredientUnit(amount.value, definition.value.value, targetUnit, props.ingredientName);
  }
  const target = getUnit(targetUnit);
  const displayAmount = formatPopupAmount(convertedAmount, targetUnit);
  if (displayAmount === null) return null;
  return {
    unit: `selected-${targetUnit}`,
    targetUnit,
    label: target.abbreviation,
    dimension: target.dimension,
    system: customaryUnits.has(targetUnit) ? "customary" : "metric",
    amount: displayAmount,
    convertedAmount,
    selected: true,
  };
});
const hasDisplayValue = computed(() => props.displayQuantity !== "" && props.displayQuantity !== null);
const primaryQuantity = computed(() => hasDisplayValue.value ? props.displayQuantity : selectorConversion.value?.amount || props.quantity);
const primaryUnit = computed(() => hasDisplayValue.value ? props.displayUnit : selectorConversion.value?.label || props.writtenUnit || props.unit);
const primaryTargetUnit = computed(() => getUnit(props.displayUnit)?.value || selectorConversion.value?.targetUnit || definition.value?.value);
const originalUnitConversion = computed(() => {
  // The source measurement is represented by the heading when no mode is
  // selected. Once a mode is selected, retain it in its natural group unless
  // the heading already represents that exact unit.
  if (!props.unitSystem || !definition.value?.conversion || !Number.isFinite(amount.value)
    || !['mass', 'volume'].includes(definition.value.dimension)) return null;
  const displayAmount = formatPopupAmount(amount.value, definition.value.value);
  if (displayAmount === null) return null;
  return {
    unit: `original-${definition.value.value}`,
    targetUnit: definition.value.value,
    label: definition.value.abbreviation,
    dimension: definition.value.dimension,
    system: customaryUnits.has(definition.value.value) ? "customary" : "metric",
    amount: displayAmount,
    convertedAmount: amount.value,
  };
});
const primarySystem = computed(() => {
  if (props.unitSystem.startsWith("customary")) return "customary";
  if (props.unitSystem.startsWith("metric")) return "metric";
  return customaryUnits.has(definition.value?.value) ? "customary" : "metric";
});
const allConversions = computed(() => {
  const primaryDimension = definition.value?.dimension;
  const secondaryDimension = primaryDimension === "volume" ? "mass" : "volume";
  const systems = primarySystem.value === "customary"
    ? ["customary", "metric"]
    : ["metric", "customary"];
  const order = new Map(systems.flatMap((system) => [
    `${system}-${primaryDimension}`,
    `${system}-${secondaryDimension}`,
  ]).map((key, index) => [key, index]));
  const candidates = [...conversions.value, ...massVolumeConversions.value, originalUnitConversion.value].filter(Boolean);
  const uniqueTargets = new Set();
  return candidates
    .sort((left, right) =>
      (order.get(`${left.system}-${left.dimension}`) ?? 99) -
      (order.get(`${right.system}-${right.dimension}`) ?? 99))
    .filter((conversion) => {
      // The bold heading is the ingredient-row value, so no detail row may
      // repeat its unit.
      if (conversion.targetUnit === primaryTargetUnit.value) return false;
      if (uniqueTargets.has(conversion.targetUnit)) return false;
      uniqueTargets.add(conversion.targetUnit);
      return true;
    });
});
const hasConversions = computed(() => allConversions.value.length > 0);
const canOpen = computed(() => hasConversions.value || props.showWhenEmpty);

const openOnMouseEnter = () => {
  if (!openedByTouch.value && canOpen.value) open.value = true;
};

const closeOnMouseLeave = () => {
  if (!openedByTouch.value) open.value = false;
};

const toggleOnTouch = (event) => {
  // Safari on iOS does not consistently synthesize mouseenter for a tap, so
  // hover alone leaves the conversion list inaccessible there. Keep mouse
  // hover unchanged, but let a touch tap open the same floating box.
  const isTouch = event.pointerType === "touch"
    || (!event.pointerType && window.matchMedia?.("(hover: none), (pointer: coarse)").matches);
  if (!isTouch || !canOpen.value) return;
  event.stopPropagation();
  openedByTouch.value = true;
  open.value = true;
};

const closeWhenTouchedElsewhere = (event) => {
  if (!openedByTouch.value || trigger.value?.contains(event.target)) return;
  openedByTouch.value = false;
  open.value = false;
};

onMounted(() => document.addEventListener("pointerdown", closeWhenTouchedElsewhere));
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeWhenTouchedElsewhere));
</script>
