<template>
  <div class="p-4 md:px-[15%]">
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

      <div v-if="!isShareRoute && recipeCookbook"
        class="mr-1 max-w-48 w-min truncate rounded-full px-3 py-1 text-sm font-bold md:hidden"
        :style="cookbookPillStyle" :title="recipeCookbook.name">
        {{ recipeCookbook.name }}
      </div>
      <div class="flex flex-row justify-between md:mx-5">
        <div class="font-bold text-base-dark text-4xl">{{ recipe.title }}</div>
        <div class="flex flex-row items-center text-right md:mt-1 text-accent">
          <div v-if="!isShareRoute && recipeCookbook"
            class="mr-1 max-w-48 truncate rounded-full px-3 py-1 text-sm font-bold hidden md:block"
            :style="cookbookPillStyle" :title="recipeCookbook.name">
            {{ recipeCookbook.name }}
          </div>
          <button v-if="isShareRoute && auth.state.user" type="button"
            class="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-alt"
            @click="addToMyRecipes">
            Add to my recipes
          </button>
          <div v-if="!isShareRoute" class="rounded-xl p-1 hover:bg-base-alt">
            <RouterLink v-if="canEditRecipe" :to="{ name: 'recipe-edit', params: { id: recipe.id } }"
              aria-label="Edit recipe">
              <PencilIcon class="size-8" />
            </RouterLink>
          </div>
          <div v-if="canManageShare" class="relative">
            <button type="button" class="rounded-xl p-1 hover:bg-base-alt" aria-label="Share recipe"
              :aria-expanded="shareMenuOpen" @click.stop="toggleShareMenu">
              <ArrowUpOnSquareIcon class="size-8" />
            </button>
            <BaseFloatingBox v-if="shareMenuOpen" class="absolute right-0 top-full z-10 mt-2 w-80 text-left"
              @clickaway="shareMenuOpen = false">
              <div class="flex items-center justify-between gap-4">
                <span class="font-semibold text-base-dark">Anyone can view</span>
                <BaseToggle :model-value="publicShareEnabled" :disabled="shareSaving"
                  aria-label="Allow anyone with the link to view this recipe" @update:model-value="setPublicShare" />
              </div>
              <div class="mt-3 flex items-center justify-between gap-4">
                <span class="font-semibold text-base-dark">Share recipe history</span>
                <BaseToggle :model-value="shareHistoryEnabled" :disabled="shareSaving"
                  aria-label="Allow recipe-only viewers to see the recipe history"
                  @update:model-value="setShareHistory" />
              </div>
              <template v-if="publicShareEnabled && shareLink">
                <label class="mt-4 block text-sm font-semibold text-base-dark" for="recipe-share-link">Share
                  link</label>
                <div class="mt-1 flex gap-2">
                  <input id="recipe-share-link" :value="shareLink" readonly
                    class="min-w-0 grow rounded-lg border border-primary-alt bg-base-alt px-2 py-1 text-sm text-base-dark" />
                  <button type="button"
                    class="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-white hover:bg-primary-alt"
                    @click="copyShareLink">
                    {{ linkCopied ? 'Copied' : 'Copy' }}
                  </button>
                </div>
              </template>
              <p v-if="shareSettingsError" class="mt-3 text-sm text-error" role="alert">{{ shareSettingsError }}</p>
            </BaseFloatingBox>
          </div>
        </div>
      </div>
      <div class="flex flex-col md:flex-row md:items-center">
        <div class="text-light pb-1 pl-px pt-px md:ml-5 shrink-0 place-self-start">
          <span v-if="recipe.author">{{ recipe.author }}</span>
          <span v-if="recipe.author && formattedDate"> • </span>
          <span v-if="formattedDate">{{ formattedDate }}</span>
          <span v-if="(recipe.author || formattedDate) && servingSize"> • </span>
          <span v-if="servingSize">{{ servingSize }}</span>
        </div>
        <div v-if="hasTags" class="py-1 md:py-0 md:ml-4">
          <div class="flex flex-row flex-wrap gap-2">
            <BaseTag v-for="(tag, index) in recipe.tags" :key="`${tag}-${index}`">
              {{ tag }}
            </BaseTag>
          </div>
        </div>
      </div>

      <div class="flex flex-col md:flex-row">
        <div>

          <div class="flex flex-col md:flex-row">
            <div class="md:w-fit md:pr-2">
              <div class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
                <div class="font-bold text-base-dark text-3xl pb-2">
                  Ingredients
                </div>
                <div class="flex items-center justify-between gap-3 pb-3 text-accent" aria-label="Recipe quantity">
                  <div class="flex flex-row items-center">
                    <button type="button" class="rounded-lg p-1 hover:bg-base" :disabled="!canDecreaseMultiplier"
                      aria-label="Decrease recipe quantity" @click="decreaseMultiplier">
                      <ChevronDoubleLeftIcon class="size-5" />
                    </button>
                    <span class="min-w-10 text-center font-bold text-base-dark" aria-live="polite">
                      <input v-if="editingMultiplier" ref="multiplierInputElement" v-model="multiplierInput" type="text"
                        inputmode="decimal" aria-label="Custom recipe quantity multiplier"
                        class="w-12 border-0 bg-transparent p-0 text-center font-bold outline-none"
                        @blur="commitMultiplierInput" @keydown.enter.prevent="commitMultiplierInput"
                        @keydown.esc.prevent="cancelMultiplierInput" />
                      <button v-else type="button" class="cursor-text"
                        aria-label="Enter a custom recipe quantity multiplier" @click="startMultiplierInput">
                        {{ multiplierLabel }}
                      </button>
                    </span>
                    <button type="button" class="rounded-lg p-1 hover:bg-base" :disabled="!canIncreaseMultiplier"
                      aria-label="Increase recipe quantity" @click="increaseMultiplier">
                      <ChevronDoubleRightIcon class="size-5" />
                    </button>
                  </div>
                  <BaseSplitButton v-model="selectedUnitSystem" :options="unitSystemOptions" color-type="action"
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
                      <RecipeIngredientHover :quantity="hoverQuantity(ingredient)" :unit="ingredient.unit"
                        :ingredient-name="ingredient.name"
                        :unit-system="selectedUnitSystem"
                        :written-unit="formatUnit(ingredient.unit, hoverQuantity(ingredient))" side-placement
                        use-pointer>
                        <span class="text-left text-base-dark">{{ ingredient.name }}</span>
                      </RecipeIngredientHover>
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
                      <template v-for="(part, partIndex) in stepParts(stepText)"
                        :key="`step-${index}-part-${partIndex}`">
                        <RecipeIngredientHover v-if="part.ingredient" :quantity="hoverQuantity(part.ingredient)"
                          :unit="part.ingredient.unit"
                          :ingredient-name="part.ingredient.name"
                          :unit-system="selectedUnitSystem"
                          :written-unit="formatUnit(part.ingredient.unit, hoverQuantity(part.ingredient))"
                          show-when-empty>
                          <span class="text-accent">{{ part.text }}</span>
                        </RecipeIngredientHover>
                        <template v-else>{{ part.text }}</template>
                      </template>
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


        </div>

        <div class="md:w-1/4">

          <div v-if="canViewPairings" class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
            <div class="flex flex-row justify-between items-center">
              <div class="font-bold text-base-dark text-xl">
                Parings
              </div>
              <button v-if="canEditRecipe" type="button" class="rounded-lg p-1 text-accent hover:bg-base"
                aria-label="Add a paired recipe" :aria-expanded="pairingPickerOpen" @click="togglePairingPicker">
                <PlusIcon class="size-6 text-accent" />
              </button>
            </div>
            <BaseAutocomplete v-if="pairingPickerOpen" v-model="pairingQuery" :options="pairingOptions" class="mt-3"
              placeholder="Search recipes" aria-label="Search recipes to pair" :disabled="pairingSaving"
              @commit="selectPairing" />
            <p v-if="pairingError" class="mt-2 text-sm text-error" role="alert">{{ pairingError }}</p>
            <ul v-if="recipe.pairings?.length" class="mt-3 space-y-1">
              <li v-for="pairedRecipe in recipe.pairings" :key="pairedRecipe.id">
                <div class="group flex items-center rounded-lg hover:bg-base">
                  <RouterLink :to="{ name: 'recipe-detail', params: { id: pairedRecipe.id } }"
                    class="min-w-0 grow truncate px-2 py-1 text-accent" :title="pairedRecipe.title">
                    {{ pairedRecipe.title }}
                  </RouterLink>
                  <button v-if="canEditRecipe" type="button"
                    class="mr-1 rounded p-1 text-light opacity-0 transition-opacity hover:bg-base-alt hover:text-error focus:opacity-100 group-hover:opacity-100"
                    :aria-label="`Remove ${pairedRecipe.title} pairing`" :title="`Remove ${pairedRecipe.title} pairing`"
                    @click="openPairingRemoval(pairedRecipe)">
                    <XMarkIcon class="size-4" />
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="canViewHistory" class="bg-base-alt rounded-2xl drop-shadow-lg p-4 m-2">
            <div class="flex flex-row justify-between items-center">
              <div class="font-bold text-base-dark text-xl">
                History
              </div>
              <button v-if="canEditRecipe" type="button" class="rounded-lg p-1 text-accent hover:bg-base"
                aria-label="Add a recipe make" @click="openMakePopup()">
                <PlusIcon class="size-6" />
              </button>
            </div>
            <ol v-if="historyEvents.length" class="relative mt-4 ml-2 border-l-2 border-primary-alt">
              <li v-for="event in historyEvents" :key="event.id" class="relative pb-5 pl-5 last:pb-0 cursor-pointer"
                :title="historyTimestamp(event.createdAt)" @click="event.type === 'edit' && openEditRemoval(event)">
                <ChatBubbleBottomCenterTextIcon v-if="event.type === 'make'"
                  class="absolute -left-2.5 top-0 size-5 bg-base-alt text-primary" />
                <CheckCircleIcon v-else-if="event.type === 'created'"
                  class="absolute -left-2.5 top-0 size-5 bg-base-alt text-primary" />
                <PencilIcon v-else class="absolute -left-2.5 top-0 size-5 bg-base-alt text-primary" />
                <template v-if="event.type === 'make'">
                  <div @click="canEditRecipe ? openMakePopup(event) : undefined">
                    <div class="whitespace-pre-wrap text-base-dark">{{ event.notes || 'Made' }}</div>
                  </div>
                </template>
                <template v-else>
                  <div v-if="event.type === 'created'" class="text-sm text-base-dark">Recipe created</div>
                  <div v-if="event.type === 'edit'" class="space-y-1 text-sm text-base-dark">
                    <div v-for="(change, index) in event.changes" :key="`${event.id}-${index}`"
                      class="flex items-center gap-1">
                      <PlusIcon v-if="change.type === 'added'" class="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <MinusIcon v-else-if="change.type === 'removed'" class="size-4 shrink-0 mt-0.5"
                        aria-hidden="true" />
                      <template v-else-if="change.type === 'changed'">
                        <span>{{ historyAmount(change.from) }} {{ change.ingredient }}</span>
                        <ArrowRightIcon class="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>{{ historyAmount(change.to) }}</span>
                      </template>
                      <span v-if="change.type === 'added' || change.type === 'removed'">{{ change.ingredient }}</span>
                      <span v-if="!change.type">{{ change }}</span>
                    </div>
                  </div>
                </template>
              </li>
            </ol>
          </div>

        </div>

      </div>

    </div>
    <BasePopup v-if="pairingToRemove" aria-label="Remove recipe pairing" :buttons="['cancel', 'delete']"
      :delete-disabled="pairingRemoving" @close="closePairingRemoval" @delete="removePairing">
      <h2 class="text-2xl font-bold text-base-dark">Remove pairing?</h2>
      <p class="mt-2">Remove <strong>{{ pairingToRemove.title }}</strong> from this recipe's pairings?</p>
      <p v-if="pairingRemovalError" class="mt-3 text-sm text-error" role="alert">{{ pairingRemovalError }}</p>
    </BasePopup>
    <BasePopup v-if="makePopupOpen" aria-label="Recipe make"
      :buttons="editingMake ? ['cancel', 'delete', 'confirm'] : ['cancel', 'confirm']" :confirm-disabled="makeSaving"
      :delete-disabled="makeSaving" @close="closeMakePopup" @confirm="saveMake" @delete="deleteMake">
      <h2 class="text-2xl font-bold text-base-dark">{{ editingMake ? 'Edit make' : 'Add make' }}</h2>
      <label class="mt-4 block text-sm font-semibold text-base-dark" for="recipe-make-notes">Notes</label>
      <BaseTextArea id="recipe-make-notes" v-model="makeNotes" class="mt-1" rows="4"
        placeholder="Add notes about this make" :disabled="makeSaving" />
      <p v-if="editingMake" class="mt-3 text-sm text-light">Deleting this make cannot be undone.</p>
      <p v-if="makeError" class="mt-3 text-sm text-error" role="alert">{{ makeError }}</p>
    </BasePopup>
    <BasePopup v-if="editToRemove" aria-label="Delete recipe edit" :buttons="['cancel', 'delete']"
      :delete-disabled="editRemoving" @close="closeEditRemoval" @delete="removeEdit">
      <h2 class="text-2xl font-bold text-base-dark">Delete edit?</h2>
      <p class="mt-2">This will permanently remove this recipe edit from the history and cannot be undone.</p>
      <p v-if="editRemovalError" class="mt-3 text-sm text-error" role="alert">{{ editRemovalError }}</p>
    </BasePopup>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ArrowRightIcon, ArrowUpOnSquareIcon, ChatBubbleBottomCenterTextIcon, CheckCircleIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, MinusIcon, PencilIcon, PlusIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import BaseFloatingBox from "../../baseComponents/BaseFloatingBox.vue";
import BaseAutocomplete from "../../baseComponents/BaseAutocomplete.vue";
import BasePopup from "../../baseComponents/BasePopup.vue";
import BaseTag from "../../baseComponents/BaseTag.vue";
import BaseSplitButton from "../../baseComponents/BaseSplitButton.vue";
import BaseToggle from "../../baseComponents/BaseToggle.vue";
import BaseTextArea from "../../baseComponents/BaseTextArea.vue";
import RecipeIngredientHover from "../../shared/RecipeIngredientHover.vue";
import { useAuthStore } from "../../stores/authStore.js";
import { useRecipeStore } from "../../stores/recipeStore.js";
import { convertIngredientUnit, formatMilliliters, formatUnit, getUnit, parseQuantity } from "../../mixins/units.js";

const store = useRecipeStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const sharedRecipe = ref(null);
const shareError = ref(null);
const shareLoading = ref(false);
const detailLoading = ref(false);
const detailError = ref(null);
const shareMenuOpen = ref(false);
const shareSaving = ref(false);
const shareSettingsError = ref("");
const publicShareToken = ref("");
const linkCopied = ref(false);
const pairingPickerOpen = ref(false);
const pairingQuery = ref("");
const pairingSaving = ref(false);
const pairingError = ref("");
const pairingToRemove = ref(null);
const pairingRemoving = ref(false);
const pairingRemovalError = ref("");
const makePopupOpen = ref(false);
const editingMake = ref(null);
const makeNotes = ref("");
const makeSaving = ref(false);
const makeError = ref("");
const editToRemove = ref(null);
const editRemoving = ref(false);
const editRemovalError = ref("");
const MULTIPLIERS = Object.freeze([1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 1.5, 2, 3, 4, 5, 6, 7, 8]);
const multiplierIndex = ref(MULTIPLIERS.indexOf(1));
const customMultiplier = ref(null);
const editingMultiplier = ref(false);
const multiplierInput = ref("");
const multiplierInputElement = ref(null);
// null preserves a mixed recipe exactly as written.  A chosen mode then
// standardizes every ingredient for which the conversion is meaningful.
const unitSystem = ref(null);
const unitSystemOptions = Object.freeze([
  { value: "customary-volume", label: "C" },
  { value: "customary-mass", label: "Oz" },
  { value: "metric-volume", label: "mL" },
  { value: "metric-mass", label: "g" },
]);
const isShareRoute = computed(() => route.name === "recipe-share-view");
const shareToken = computed(() => route.params.token);

const recipe = computed(() =>
  isShareRoute.value
    ? sharedRecipe.value
    : store.getRecipeById(route.params.id),
);
const modeForIngredientUnit = (unitValue) => {
  const definition = getUnit(unitValue);
  if (!definition?.conversion || !['mass', 'volume'].includes(definition.dimension)) return null;
  const customary = ['oz', 'lb', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal'].includes(definition.value);
  if (!customary && !['mg', 'g', 'kg', 'ml', 'cl', 'dl', 'l'].includes(definition.value)) return null;
  return `${customary ? 'customary' : 'metric'}-${definition.dimension === 'mass' ? 'mass' : 'volume'}`;
};
const detectedUnitSystem = computed(() => {
  const modes = (recipe.value?.ingredients || [])
    .filter((ingredient) => Number.isFinite(parseQuantity(ingredient?.quantity)))
    .map((ingredient) => modeForIngredientUnit(ingredient?.unit))
    .filter(Boolean);
  return modes.length && modes.every((mode) => mode === modes[0]) ? modes[0] : null;
});
const selectedUnitSystem = computed({
  get: () => unitSystem.value || detectedUnitSystem.value || '',
  set: (mode) => { unitSystem.value = mode; },
});
const canEditRecipe = computed(
  () => !isShareRoute.value && recipe.value?.canEdit !== false,
);
const canManageShare = computed(() =>
  !isShareRoute.value && recipe.value?.ownerId === auth.state.user?.id,
);
const publicShareEnabled = computed(() => Boolean(publicShareToken.value));
const shareHistoryEnabled = computed(() => Boolean(recipe.value?.shareHistory));
const canAccessCookbook = computed(() => !isShareRoute.value || Boolean(sharedRecipe.value?.permissions?.hasCookbookAccess));
const canViewPairings = computed(() => canAccessCookbook.value);
const canViewHistory = computed(() => canAccessCookbook.value || shareHistoryEnabled.value);
const shareLink = computed(() => {
  if (!publicShareToken.value) return "";
  return `${window.location.origin}/share/${publicShareToken.value}`;
});
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
const pairingOptions = computed(() => {
  const pairedIds = new Set((recipe.value?.pairings || []).map((pairedRecipe) => pairedRecipe.id));
  return store.state.recipes
    .filter((candidate) => candidate.id !== recipe.value?.id && !pairedIds.has(candidate.id))
    .map((candidate) => ({ value: candidate.id, label: candidate.title }));
});
const historyEvents = computed(() => [...(recipe.value?.history || [])]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
  const quantity = multiplier.value === 1 || !Number.isFinite(parsedQuantity)
    ? originalQuantity
    : formatQuantity(parsedQuantity * multiplier.value);
  const unit = recipe.value?.servingsUnit?.toString?.().trim() || "";
  const combined = [quantity, unit].filter(Boolean).join(" ").trim();
  return combined ? `${verb} ${combined}` : "";
});

const multiplier = computed(() => customMultiplier.value ?? MULTIPLIERS[multiplierIndex.value]);
const multiplierLabel = computed(() => `${formatQuantity(multiplier.value)}x`);
const canDecreaseMultiplier = computed(() => MULTIPLIERS.some((value) => value < multiplier.value));
const canIncreaseMultiplier = computed(() => MULTIPLIERS.some((value) => value > multiplier.value));
const startMultiplierInput = async () => {
  multiplierInput.value = `${multiplier.value}`;
  editingMultiplier.value = true;
  await nextTick();
  multiplierInputElement.value?.select();
};
const cancelMultiplierInput = () => {
  editingMultiplier.value = false;
  multiplierInput.value = "";
};
const commitMultiplierInput = () => {
  const value = parseQuantity(multiplierInput.value);
  if (Number.isFinite(value) && value > 0) customMultiplier.value = value;
  cancelMultiplierInput();
};
const increaseMultiplier = () => {
  const nextIndex = MULTIPLIERS.findIndex((value) => value > multiplier.value);
  if (nextIndex < 0) return;
  customMultiplier.value = null;
  multiplierIndex.value = nextIndex;
};
const decreaseMultiplier = () => {
  let previousIndex = -1;
  MULTIPLIERS.forEach((value, index) => {
    if (value < multiplier.value) previousIndex = index;
  });
  if (previousIndex < 0) return;
  customMultiplier.value = null;
  multiplierIndex.value = previousIndex;
};

const addToMyRecipes = () => {
  if (!sharedRecipe.value || !auth.state.user) return;
  const { id, ownerId, cookbookId, isPublic, canEdit, ...draft } = sharedRecipe.value;
  store.setImportedDraft(draft);
  router.push({ name: "recipe-new" });
};

const toggleShareMenu = () => {
  shareMenuOpen.value = !shareMenuOpen.value;
  linkCopied.value = false;
};

const togglePairingPicker = () => {
  pairingPickerOpen.value = !pairingPickerOpen.value;
  pairingQuery.value = "";
  pairingError.value = "";
};

const selectPairing = async (pairedRecipeId) => {
  pairingQuery.value = "";
  if (!pairedRecipeId || pairingSaving.value || !recipe.value?.id) return;
  pairingSaving.value = true;
  pairingError.value = "";
  try {
    await store.addRecipePairing(recipe.value.id, pairedRecipeId);
    pairingPickerOpen.value = false;
  } catch (error) {
    pairingError.value = error.message || "Unable to add recipe pairing.";
  } finally {
    pairingSaving.value = false;
  }
};

const openPairingRemoval = (pairedRecipe) => {
  pairingToRemove.value = pairedRecipe;
  pairingRemovalError.value = "";
};

const closePairingRemoval = () => {
  if (pairingRemoving.value) return;
  pairingToRemove.value = null;
  pairingRemovalError.value = "";
};

const removePairing = async () => {
  if (!recipe.value?.id || !pairingToRemove.value || pairingRemoving.value) return;
  pairingRemoving.value = true;
  pairingRemovalError.value = "";
  try {
    await store.removeRecipePairing(recipe.value.id, pairingToRemove.value.id);
    pairingToRemove.value = null;
  } catch (error) {
    pairingRemovalError.value = error.message || "Unable to remove recipe pairing.";
  } finally {
    pairingRemoving.value = false;
  }
};

const openMakePopup = (event = null) => {
  editingMake.value = event;
  makeNotes.value = event?.notes || "";
  makeError.value = "";
  makePopupOpen.value = true;
};

const closeMakePopup = () => {
  if (makeSaving.value) return;
  makePopupOpen.value = false;
  editingMake.value = null;
  makeNotes.value = "";
  makeError.value = "";
};

const saveMake = async () => {
  if (!recipe.value?.id || makeSaving.value) return;
  makeSaving.value = true;
  makeError.value = "";
  try {
    await store.saveRecipeMake({
      recipeId: recipe.value.id,
      id: editingMake.value?.id,
      notes: makeNotes.value,
    });
    makePopupOpen.value = false;
    editingMake.value = null;
    makeNotes.value = "";
  } catch (error) {
    makeError.value = error.message || "Unable to save recipe make.";
  } finally {
    makeSaving.value = false;
  }
};

const deleteMake = async () => {
  if (!recipe.value?.id || !editingMake.value?.id || makeSaving.value) return;
  makeSaving.value = true;
  makeError.value = "";
  try {
    await store.deleteRecipeMake(recipe.value.id, editingMake.value.id);
    makePopupOpen.value = false;
    editingMake.value = null;
    makeNotes.value = "";
  } catch (error) {
    makeError.value = error.message || "Unable to delete recipe make.";
  } finally {
    makeSaving.value = false;
  }
};

const openEditRemoval = (event) => {
  if (!canEditRecipe.value || event?.type !== "edit") return;
  editToRemove.value = event;
  editRemovalError.value = "";
};

const closeEditRemoval = () => {
  if (editRemoving.value) return;
  editToRemove.value = null;
  editRemovalError.value = "";
};

const removeEdit = async () => {
  if (!recipe.value?.id || !editToRemove.value || editRemoving.value) return;
  editRemoving.value = true;
  editRemovalError.value = "";
  try {
    await store.deleteRecipeHistoryEdit(recipe.value.id, editToRemove.value.id);
    editToRemove.value = null;
  } catch (error) {
    editRemovalError.value = error.message || "Unable to delete recipe edit.";
  } finally {
    editRemoving.value = false;
  }
};

const setPublicShare = async (enabled) => {
  if (!recipe.value?.id || shareSaving.value) return;
  shareSaving.value = true;
  shareSettingsError.value = "";
  try {
    const res = await fetch(`/api/recipes/${recipe.value.id}/share/public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || "Unable to update sharing settings.");
    publicShareToken.value = data.share?.token || "";
  } catch (error) {
    shareSettingsError.value = error.message || "Unable to update sharing settings.";
  } finally {
    shareSaving.value = false;
  }
};

const copyShareLink = async () => {
  if (!shareLink.value) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareLink.value);
    } else {
      const input = document.getElementById("recipe-share-link");
      input?.select();
      if (!document.execCommand("copy")) throw new Error("Copy failed.");
    }
    linkCopied.value = true;
  } catch (error) {
    shareSettingsError.value = "Unable to copy the share link.";
  }
};

const FRACTIONS = Object.freeze({
  "1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾",
  "1/5": "⅕", "2/5": "⅖", "3/5": "⅗", "4/5": "⅘", "1/6": "⅙",
  "5/6": "⅚", "1/7": "⅐", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞",
});
const FRACTION_DENOMINATORS = [2, 3, 4, 5, 6, 7, 8, 16];
const SUPERSCRIPT_DIGITS = Object.freeze({ 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" });
const SUBSCRIPT_DIGITS = Object.freeze({ 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" });

const formatComposedFraction = (numerator, denominator) =>
  `${[...`${numerator}`].map((digit) => SUPERSCRIPT_DIGITS[digit]).join("")}⁄${[...`${denominator}`].map((digit) => SUBSCRIPT_DIGITS[digit]).join("")}`;

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
    const textFraction = formatComposedFraction(closest.numerator, closest.denominator);
    return whole ? `${whole} ${textFraction}` : textFraction;
  }
  if (Math.abs(remainder) < 0.000001) return `${whole}`;
  return `${Math.round(amount * 100) / 100}`;
};

const readableVolume = (amount) => {
  // Recipe quantities stay in familiar cups below a gallon. Quarts are useful
  // for one to three gallons; above that, gallons are easier to scan.
  const targets = [
    ["gal", 3785.411784, 3], ["qt", 946.352946, 4],
    ["cup", 236.5882365, 1 / 8], ["tbsp", 14.78676478125, 1 / 2],
    ["tsp", 4.92892159375, 0],
  ];
  return targets.find(([, milliliters, minimum]) => amount / milliliters >= minimum) || targets.at(-1);
};

const CUSTOMARY_VOLUME_INCREMENTS = Object.freeze({
  cup: [1 / 8, 1 / 6],
  tbsp: [1 / 2],
  tsp: [1 / 16, 1 / 6],
});

const roundToNearestMultiple = (amount, increments) => increments
  .map((increment) => Math.round(amount / increment) * increment)
  .reduce((closest, candidate) =>
    Math.abs(amount - candidate) < Math.abs(amount - closest) ? candidate : closest,
  );

const formatCustomaryVolume = (amount, unit) => {
  const increments = CUSTOMARY_VOLUME_INCREMENTS[unit];
  const roundedAmount = increments ? roundToNearestMultiple(amount, increments) : amount;
  return formatQuantity(roundedAmount);
};

const setShareHistory = async (enabled) => {
  if (!recipe.value?.id || shareSaving.value) return;
  shareSaving.value = true;
  shareSettingsError.value = "";
  try {
    const res = await fetch(`/api/recipes/${recipe.value.id}/share/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || "Unable to update sharing settings.");
    recipe.value.shareHistory = Boolean(data.shareHistory);
  } catch (error) {
    shareSettingsError.value = error.message || "Unable to update sharing settings.";
  } finally {
    shareSaving.value = false;
  }
};

const formatMetricQuantity = (amount, unit) => {
  if (unit === "ml" || unit === "g") return formatMilliliters(amount);
  if (unit === "l" || unit === "kg") {
    const decimalPlaces = amount < 10 ? 3 : 2;
    const precision = 10 ** decimalPlaces;
    return `${Math.round(amount * precision) / precision}`;
  }
  return `${Math.round(amount * 100) / 100}`;
};

const readableCustomaryUnit = (amount, dimension) => {
  if (dimension === "volume") return readableVolume(amount);
  if (dimension === "mass") {
    return amount >= 453.59237 ? ["lb", 453.59237] : ["oz", 28.349523125];
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
  const mode = unitSystem.value || detectedUnitSystem.value;
  if (multiplier.value === 1 && !mode) {
    return { quantity: original, unit: formatUnit(ingredient.unit, original) };
  }
  const amount = parseQuantity(original);
  if (!Number.isFinite(amount)) return { quantity: original, unit: formatUnit(ingredient.unit, original) };
  const scaledAmount = amount * multiplier.value;
  const definition = getUnit(ingredient.unit);
  if (definition?.conversion && mode) {
    const targetDimension = mode.endsWith("-mass") ? "mass" : "volume";
    const metric = mode.startsWith("metric");
    const baseUnit = targetDimension === "mass" ? "g" : "ml";
    const baseAmount = convertIngredientUnit(scaledAmount, ingredient.unit, baseUnit, ingredient.name);
    const target = Number.isFinite(baseAmount)
      ? metric
        ? readableMetricUnit(baseAmount, targetDimension)
        : readableCustomaryUnit(baseAmount, targetDimension)
      : null;
    if (!target) {
      const quantity = formatQuantity(scaledAmount);
      return { quantity, unit: formatUnit(ingredient.unit, quantity) };
    }
    const [unit, factor] = target;
    const convertedAmount = baseAmount / factor;
    const quantity = metric
      ? formatMetricQuantity(convertedAmount, unit)
      : targetDimension === "volume"
        ? formatCustomaryVolume(convertedAmount, unit)
        : formatQuantity(convertedAmount);
    return { quantity, unit: formatUnit(unit, quantity) };
  }
  const quantity = formatQuantity(scaledAmount);
  return { quantity, unit: formatUnit(ingredient.unit, quantity) };
};

const hoverQuantity = (ingredient) => {
  const original = ingredient?.quantity?.toString?.().trim() || "";
  const parsed = parseQuantity(original);
  return Number.isFinite(parsed) ? formatQuantity(parsed * multiplier.value) : original;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stepParts = (stepText) => {
  const ingredientsByName = new Map();
  (recipe.value?.ingredients || []).forEach((ingredient) => {
    const name = ingredient?.name?.toString?.().trim();
    if (name && !ingredientsByName.has(name.toLocaleLowerCase())) {
      ingredientsByName.set(name.toLocaleLowerCase(), ingredient);
    }
  });
  const names = [...ingredientsByName.keys()].sort((a, b) => b.length - a.length);
  const text = stepText?.toString?.() || "";
  if (!names.length) return [{ text }];

  const matcher = new RegExp(names.map(escapeRegExp).join("|"), "gi");
  const parts = [];
  let lastIndex = 0;
  for (const match of text.matchAll(matcher)) {
    if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index) });
    parts.push({ text: match[0], ingredient: ingredientsByName.get(match[0].toLocaleLowerCase()) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
  return parts.length ? parts : [{ text }];
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

const historyTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const historyAmount = ({ quantity, unit } = {}) => {
  const abbreviation = getUnit(unit)?.abbreviation || unit || "";
  return [quantity, abbreviation].filter(Boolean).join(" ");
};

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
    if (res.status === 404) {
      router.replace({ name: "recipe-not-found" });
      return;
    }
    if (!res.ok || !data.success)
      throw new Error(data?.error || "Unable to load shared recipe.");
    sharedRecipe.value = { ...data.recipe, permissions: data.permissions || {} };
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
    if (error.message === "Recipe not found.") {
      router.replace({ name: "recipe-not-found" });
      return;
    }
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
  () => {
    pairingPickerOpen.value = false;
    pairingQuery.value = "";
    pairingError.value = "";
    pairingToRemove.value = null;
    closeMakePopup();
    closeEditRemoval();
    loadRecipe();
  },
  { immediate: true },
);

watch(
  () => recipe.value?.publicShareToken,
  (token) => { publicShareToken.value = token || ""; },
  { immediate: true },
);
</script>
