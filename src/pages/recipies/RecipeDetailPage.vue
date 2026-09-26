<template>
  <div class="p-4 md:px-[20%]">
    <div v-if="!isShareRoute && store.state.loading && !store.state.ready">
      Loading recipe…
    </div>

    <div v-else-if="isShareRoute && shareLoading">
      <p>Loading shared recipe…</p>
    </div>

    <div v-else-if="!recipe && !isShareRoute">
      <p>404: Recipe not found</p>
    </div>

    <div v-else-if="shareError">
      <p>Unable to load shared recipe</p>
      <p>{{ shareError }}</p>
    </div>

    <div v-else>
      <div class="flex flex-row justify-between md:mx-5">
        <div class="font-bold text-base-dark text-4xl">{{ recipe.title }}</div>
        <div class="flex flex-row text-right md:mt-1 text-accent-alt">
          <PencilIcon v-if="canEditRecipe" class="mt-2 mx-3 size-6 md:size-8" />
          <ArrowUpOnSquareIcon class="mt-2 size-6 md:size-8" />
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
            <div class="flex flex-row">
              <div class="shrink-0 text-right">
                <div
                  v-for="(ingredient, index) in recipe.ingredients"
                  :key="ingredient.id || index"
                >
                  <span class="text-light">{{
                    ingredientQuantity(ingredient)
                  }}</span>
                </div>
              </div>
              <div class="pl-2 shrink-0">
                <div
                  v-for="(ingredient, index) in recipe.ingredients"
                  :key="ingredient.id || index"
                >
                  <span class="text-left text-base-dark">{{
                    ingredient.name
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="md:w-fit">
          <div class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
            <div class="font-bold text-base-dark text-3xl pb-3 md:pb-2">
              Steps
            </div>
            <div
              v-for="(stepText, index) in recipe.steps"
              :key="`step-${index}`"
            >
              <div class="flex flex-row my-2">
                <div
                  class="border-solid border-2 border-accent rounded-4xl text-lg font-bold w-8 h-8 text-center p-0 text-accent shrink-0"
                >
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
      <div>
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
      <div>
        <div class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
          <div class="flex flex-row flex-wrap gap-2">
            <BaseTag
              v-for="(tag, index) in recipe.tags"
              :key="`${tag}-${index}`"
            >
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
import { useRoute } from "vue-router";
import { PencilIcon, ArrowUpOnSquareIcon } from "@heroicons/vue/24/outline";
import BaseTag from "../../baseComponents/BaseTag.vue";
import { useRecipeStore } from "../../stores/recipeStore.js";
import { formatUnit } from "../../mixins/units.js";

const store = useRecipeStore();
const route = useRoute();

const sharedRecipe = ref(null);
const shareError = ref(null);
const shareLoading = ref(false);
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

const servingSize = computed(() => {
  const quantity = recipe.value?.servingsQuantity?.toString?.().trim() || "";
  const unit = recipe.value?.servingsUnit?.toString?.().trim() || "";
  const combined = [quantity, unit].filter(Boolean).join(" ").trim();
  return combined || "";
});

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

watch(
  () => shareToken.value,
  () => loadSharedRecipe(),
  { immediate: true },
);
</script>
