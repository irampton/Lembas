<template>
  <div class="p-4 md:px-[20%]">
    <div v-if="!isShareRoute && ((store.state.loading && !store.state.ready) || detailLoading)">
      Loading recipe…
    </div>

    <div v-else-if="isShareRoute && shareLoading">
      <p>Loading shared recipe…</p>
    </div>

    <div v-else-if="shareError || detailError">
      <p>Unable to load recipe</p>
      <p>{{ shareError || detailError }}</p>
    </div>

    <div v-else-if="!recipe && !isShareRoute">
      <p>404: Recipe not found</p>
    </div>

    <div v-else>
      <div class="flex flex-row justify-between md:mx-5">
        <div class="font-bold text-base-dark text-4xl">{{ recipe.title }}</div>
        <div class="flex flex-row items-center text-right md:mt-1 text-accent">
          <div v-if="recipeCookbook" class="mr-1 max-w-48 truncate rounded-full px-3 py-1 text-sm font-bold"
            :style="cookbookPillStyle" :title="recipeCookbook.name">
            {{ recipeCookbook.name }}
          </div>
          <div class="rounded-xl p-1 hover:bg-base-alt">
            <RouterLink v-if="canEditRecipe" :to="{ name: 'recipe-edit', params: { id: recipe.id } }"
              aria-label="Edit recipe">
              <PencilIcon class="size-6 md:size-8" />
            </RouterLink>
          </div>
          <div class="rounded-xl p-1 hover:bg-base-alt">
            <ArrowUpOnSquareIcon class="size-6 md:size-8" />
          </div>
        </div>
      </div>
      <div class="text-light pb-1 pl-px pt-px md:ml-5">
        <span v-if="recipe.author">{{ recipe.author }}</span>
        <span v-if="recipe.author && formattedDate"> • </span>
        <span v-if="formattedDate">{{ formattedDate }}</span>
        <span v-if="(recipe.author || formattedDate) && servingSize"> • </span>
        <span v-if="servingSize">{{ servingSize }}</span>
      </div>

      <div class="flex flex-col md:flex-row">
        <div class="md:w-fit md:pr-2">
          <div class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
            <div class="font-bold text-base-dark text-3xl pb-2">
              Ingredients
            </div>
            <div class="flex items-center justify-between gap-3 pb-3 text-accent" aria-label="Recipe quantity">
              <div class="flex flex-row items-center">
                <button type="button" class="rounded-lg p-1 hover:bg-base" :disabled="multiplierIndex === 0"
                  aria-label="Decrease recipe quantity" @click="decreaseMultiplier">
                  <ChevronDoubleLeftIcon class="size-5" />
                </button>
                <span class="min-w-10 text-center font-bold text-base-dark" aria-live="polite">
                  {{ multiplierLabel }}
                </span>
                <button type="button" class="rounded-lg p-1 hover:bg-base"
                  :disabled="multiplierIndex === MULTIPLIERS.length - 1" aria-label="Increase recipe quantity"
                  @click="increaseMultiplier">
                  <ChevronDoubleRightIcon class="size-5" />
                </button>
              </div>
              <BaseSplitButton v-model="unitSystem" :options="unitSystemOptions" color-type="action"
                class="[&>button]:h-7 [&>button]:px-2 [&>button]:text-xs" aria-label="Measurement system" />
            </div>
            <div>
              <div v-for="(ingredient, index) in recipe.ingredients" :key="ingredient.id || index"
                class="flex flex-row">
                <div class="w-10 shrink-0 text-right mr-1">
                  <span class="text-light">{{
                    scaledIngredient(ingredient).quantity
                  }}</span>
                </div>
                <div class="w-10 shrink-0 text-left mr-3">
                  <span class="text-light">{{
                    scaledIngredient(ingredient).unit || "&nbsp;"
                  }}</span>
                </div>
                <div class="md:min-w-30">
                  <span class="text-left text-base-dark">{{
                    ingredient.name
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
            <div class="font-bold text-base-dark text-3xl pb-3 md:pb-2">
              Steps
            </div>
            <div v-for="(stepText, index) in recipe.steps" :key="`step-${index}`">
              <div class="flex flex-row my-2">
                <div
                  class="border-solid border-2 border-accent rounded-4xl text-lg font-bold w-8 h-8 text-center p-0 text-accent shrink-0"
                  :style="stepNumberStyle">
                  {{ index + 1 }}
                </div>
                <div class="ml-2 mt-[2.5px] grow">
                  {{ stepText }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="hasNotes">
        <div class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
          <div class="font-bold text-base-dark text-3xl pb-3">Notes</div>
          {{ recipe.notes }}
        </div>
      </div>
      <!--
      <div>
        <div class="font-bold text-base-dark text-3xl py-3">Makes</div>
      </div>
      <div>
        <div class="font-bold text-base-dark text-3xl py-3">History</div>
      </div>
      -->
      <div v-if="hasTags">
        <div class="bg-base-alt rounded-2xl drop-shadow-lg p-4 md:mt-4 m-2">
          <div class="flex flex-row flex-wrap gap-2">
            <BaseTag v-for="(tag, index) in recipe.tags" :key="`${tag}-${index}`">
              {{ tag }}
            </BaseTag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { PencilIcon, ArrowUpOnSquareIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from "@heroicons/vue/24/outline";
import BaseTag from "../../baseComponents/BaseTag.vue";
import BaseSplitButton from "../../baseComponents/BaseSplitButton.vue";
import { useRecipeStore } from "../../stores/recipeStore.js";
import { formatUnit, getUnit, parseQuantity } from "../../mixins/units.js";

const store = useRecipeStore();
const route = useRoute();

const sharedRecipe = ref(null);
const shareError = ref(null);
const shareLoading = ref(false);
const detailLoading = ref(false);
const detailError = ref(null);
const MULTIPLIERS = Object.freeze([1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8]);
const multiplierIndex = ref(MULTIPLIERS.indexOf(1));
const unitSystem = ref("customary");
const unitSystemOptions = Object.freeze([
  { value: "customary", label: "C" },
  { value: "metric", label: "mL" },
]);
const isShareRoute = computed(() => route.name === "recipe-share-view");
const shareToken = computed(() => route.params.token);

const recipe = computed(() =>
  isShareRoute.value
    ? sharedRecipe.value
    : store.getRecipeById(route.params.id),
);
const canEditRecipe = computed(
  () => !isShareRoute.value && recipe.value?.canEdit !== false,
);
const hasNotes = computed(() => Boolean(recipe.value?.notes?.toString().trim()));
const hasTags = computed(() =>
  (recipe.value?.tags || []).some((tag) =>
    Boolean(
      (typeof tag === "string" ? tag : tag?.name)?.toString().trim(),
    ),
  ),
);
const recipeCookbook = computed(() =>
  recipe.value?.cookbookId
    ? store.getCookbookById(recipe.value.cookbookId)
    : null,
);
const stepNumberStyle = computed(() => {
  const color = recipeCookbook.value?.color;
  return color ? { borderColor: color, color } : {};
});
const cookbookPillStyle = computed(() => {
  const color = recipeCookbook.value?.color || "#1D6AA3";
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const lightColor =
    Number.isNaN(red) || (red * 299 + green * 587 + blue * 114) / 1000 > 160;
  return {
    backgroundColor: color,
    color: lightColor ? "#1F2937" : "#FFFFFF",
  };
});

const servingSize = computed(() => {
  const verb = recipe.value?.servingsVerb === "Serves" ? "Serves" : "Makes";
  const originalQuantity = recipe.value?.servingsQuantity?.toString?.().trim() || "";
  const parsedQuantity = parseQuantity(originalQuantity);
  const quantity = Number.isFinite(parsedQuantity)
    ? formatQuantity(parsedQuantity * multiplier.value)
    : originalQuantity;
  const unit = recipe.value?.servingsUnit?.toString?.().trim() || "";
  const combined = [quantity, unit].filter(Boolean).join(" ").trim();
  return combined ? `${verb} ${combined}` : "";
});

const multiplier = computed(() => MULTIPLIERS[multiplierIndex.value]);
const multiplierLabel = computed(() => `${formatQuantity(multiplier.value)}x`);
const increaseMultiplier = () => {
  multiplierIndex.value = Math.min(multiplierIndex.value + 1, MULTIPLIERS.length - 1);
};
const decreaseMultiplier = () => {
  multiplierIndex.value = Math.max(multiplierIndex.value - 1, 0);
};

const FRACTIONS = Object.freeze({
  "1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾",
  "1/5": "⅕", "2/5": "⅖", "3/5": "⅗", "4/5": "⅘", "1/6": "⅙",
  "5/6": "⅚", "1/7": "⅐", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞",
});
const FRACTION_DENOMINATORS = [2, 3, 4, 5, 6, 7, 8];

const formatQuantity = (amount) => {
  if (!Number.isFinite(amount)) return "";
  const whole = Math.floor(amount + 0.000001);
  const remainder = amount - whole;
  let closest = null;
  for (const denominator of FRACTION_DENOMINATORS) {
    const numerator = Math.round(remainder * denominator);
    const value = numerator / denominator;
    if (numerator && numerator < denominator && (!closest || Math.abs(remainder - value) < closest.difference)) {
      closest = { numerator, denominator, difference: Math.abs(remainder - value) };
    }
  }
  if (closest && closest.difference < 0.035) {
    const fraction = FRACTIONS[`${closest.numerator}/${closest.denominator}`];
    if (fraction) return whole ? `${whole}${fraction}` : fraction;
  }
  if (Math.abs(remainder) < 0.000001) return `${whole}`;
  return `${Math.round(amount * 100) / 100}`;
};

const readableVolume = (amount) => {
  // Recipe quantities stay in familiar cups below a gallon. Quarts are useful
  // for one to three gallons; above that, gallons are easier to scan.
  const targets = [
    ["gal", 3785.411784, 3], ["qt", 946.352946, 4],
    ["cup", 236.5882365, 1 / 3], ["fl oz", 29.5735295625, 1],
    ["tbsp", 14.78676478125, 1], ["tsp", 4.92892159375, 0],
  ];
  return targets.find(([, milliliters, minimum]) => amount / milliliters >= minimum) || targets.at(-1);
};

const readableCustomaryUnit = (amount, dimension) => {
  if (dimension === "volume") return readableVolume(amount);
  if (dimension === "mass") {
    return amount >= 453.59237 ? ["lb", 453.59237] : amount >= 28.349523125 ? ["oz", 28.349523125] : ["g", 1];
  }
  if (dimension === "length") return amount >= 25.4 ? ["in", 25.4] : ["mm", 1];
  return null;
};

const readableMetricUnit = (amount, dimension) => {
  if (dimension === "volume") return amount >= 1000 ? ["l", 1000] : ["ml", 1];
  if (dimension === "mass") return amount >= 1000 ? ["kg", 1000] : amount >= 1 ? ["g", 1] : ["mg", 0.001];
  if (dimension === "length") return amount >= 10 ? ["cm", 10] : ["mm", 1];
  return null;
};

const scaledIngredient = (ingredient) => {
  const original = ingredient.quantity?.toString?.().trim() || "";
  const amount = parseQuantity(original);
  if (!Number.isFinite(amount)) return { quantity: original, unit: formatUnit(ingredient.unit, original) };
  const scaledAmount = amount * multiplier.value;
  const definition = getUnit(ingredient.unit);
  if (definition?.conversion) {
    const baseAmount = scaledAmount * definition.conversion.factor;
    const target = unitSystem.value === "metric"
      ? readableMetricUnit(baseAmount, definition.dimension)
      : readableCustomaryUnit(baseAmount, definition.dimension);
    if (!target) {
      const quantity = formatQuantity(scaledAmount);
      return { quantity, unit: formatUnit(ingredient.unit, quantity) };
    }
    const [unit, factor] = target;
    const quantity = formatQuantity(baseAmount / factor);
    return { quantity, unit: formatUnit(unit, quantity) };
  }
  const quantity = formatQuantity(scaledAmount);
  return { quantity, unit: formatUnit(ingredient.unit, quantity) };
};

const formattedDate = computed(() => {
  if (!recipe.value?.createdAt) return "";
  const date = new Date(recipe.value.createdAt);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

const ingredientQuantity = (ingredient) => {
  return [ingredient.quantity, formatUnit(ingredient.unit, ingredient.quantity)]
    .filter(Boolean)
    .join(" ");
};

const loadSharedRecipe = async () => {
  if (!shareToken.value || !isShareRoute.value) return;
  shareLoading.value = true;
  shareError.value = null;
  try {
    const res = await fetch(`/api/share/${shareToken.value}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data?.error || "Unable to load shared recipe.");
    sharedRecipe.value = data.recipe;
  } catch (error) {
    shareError.value = error.message || "Unable to load shared recipe.";
  } finally {
    shareLoading.value = false;
  }
};

const loadRecipe = async () => {
  if (isShareRoute.value || !route.params.id) return;
  detailLoading.value = true;
  detailError.value = null;
  try {
    await store.loadRecipe(route.params.id);
  } catch (error) {
    detailError.value = error.message || "Unable to load recipe.";
  } finally {
    detailLoading.value = false;
  }
};

watch(
  () => shareToken.value,
  () => loadSharedRecipe(),
  { immediate: true },
);

watch(
  () => route.params.id,
  () => loadRecipe(),
  { immediate: true },
);
</script>
