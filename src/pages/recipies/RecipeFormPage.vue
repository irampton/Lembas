<template>
  <section class="mx-auto w-full max-w-5xl p-4 md:p-6">
    <form class="space-y-6" @submit.prevent="save">
      <header class="flex items-center justify-between gap-4 md:mx-5">
        <h1 class="font-bold text-3xl text-base-dark md:text-4xl">
          {{ isEditing ? "Edit recipe" : "New recipe" }}
        </h1>
        <div>
          <BaseDropdown
            v-if="showCookbookSelect"
            v-model="selectedCookbook"
            :disabled="cookbookReadonly"
            color-style="accent"
            aria-label="Cookbook"
          >
            <option
              v-for="cookbook in cookbookOptions"
              :key="cookbook.id"
              :value="cookbook"
            >
              {{ cookbook.name }}
            </option>
          </BaseDropdown>
        </div>
      </header>
      <p
        v-if="store.state.error || shareError"
        role="alert"
        class="rounded-lg bg-red-50 p-3 text-red-700"
      >
        {{ shareError || store.state.error }}
      </p>

      <div
        class="relative rounded-2xl bg-base-alt p-4 drop-shadow-lg focus-within:z-30 md:m-2 md:mt-6 md:p-5"
      >
        <div class="space-y-4">
          <BaseTextInput
            v-model="form.title"
            placeholder="Title"
            aria-label="Recipe title"
            xl
            required
          />
          <div class="flex flex-col gap-4 md:flex-row md:mx-4">
            <label class="flex w-full items-center gap-2 md:w-1/2">
              <span class="shrink-0 text-base-dark">by</span>
              <span class="min-w-0 grow">
                <BaseTextInput v-model="form.author" placeholder="Author" />
              </span>
            </label>
            <div class="flex w-full items-center gap-2 md:w-1/2">
              <span class="w-28 shrink-0">
                <BaseDropdown
                  v-model="form.servingsVerb"
                  aria-label="Serving description"
                  color-style="transparent"
                >
                  <option value="Makes">Makes</option>
                  <option value="Serves">Serves</option>
                </BaseDropdown>
              </span>
              <span class="w-20 shrink-0">
                <BaseNumberInput
                  v-model="form.servingsQuantity"
                  placeholder="#"
                  aria-label="Serving quantity"
                  min="0"
                />
              </span>
              <span class="min-w-0 grow">
                <BaseTextInput
                  v-model="form.servingsUnit"
                  placeholder=""
                  aria-label="Serving units"
                />
              </span>
            </div>
          </div>
          <div class="flex gap-2 md:mx-4 items-center">
            <button
              type="button"
              class="rounded-full p-1 text-accent hover:bg-white"
              aria-label="Add tag"
              @click="showTagInput"
            >
              <PlusIcon class="size-5" />
            </button>
            <div class="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
              <BaseTag
                v-for="(tag, index) in form.tags"
                :key="`${tag}-${index}`"
                editable
                :remove-label="`Remove ${tag} tag`"
                @remove="removeTag(index)"
              >
                {{ tag }}
              </BaseTag>
              <BaseAutocomplete
                v-if="isTagInputVisible"
                ref="tagAutocomplete"
                v-model="tagInput"
                :options="availableTagOptions"
                class="min-w-40 max-w-64 grow"
                placeholder="Add a tag"
                aria-label="Add a tag"
                @commit="addTag"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        class="relative rounded-2xl bg-base-alt p-4 drop-shadow-lg focus-within:z-20 md:m-2 md:mt-6 md:p-5"
      >
        <h2 class="mb-3 font-bold text-3xl text-base-dark">Ingredients</h2>
        <div class="space-y-2">
          <div
            v-for="(ingredient, index) in form.ingredients"
            :key="ingredient.id"
            class="relative flex w-full flex-row focus-within:z-20"
          >
            <div class="grow flex flex-col md:flex-row mt-2 md:mt-0">
              <div class="mb-2 md:mr-2 w-full">
                <BaseTextInput
                  v-model="ingredient.name"
                  aria-label="Ingredient name"
                  class="col-span-3 md:col-span-1"
                />
              </div>
              <div class="flex flex-row">
                <div class="mr-2 w-24">
                  <BaseTextInput
                    v-model="ingredient.quantity"
                    aria-label="Quantity"
                  />
                </div>
                <UnitAutocomplete v-model="ingredient.unit" aria-label="Unit" />
              </div>
            </div>
            <div class="place-self-center">
              <button
                type="button"
                :disabled="form.ingredients.length === 1"
                class="rounded-lg p-2 text-accent hover:bg-white disabled:opacity-40"
                aria-label="Remove ingredient"
                @click="removeIngredient(index)"
              >
                <XMarkIcon class="size-7" />
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="mt-3 flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-accent hover:bg-white"
          @click="addIngredient"
        >
          <PlusIcon class="size-5" /> Add ingredient
        </button>
      </div>
      <div
        class="rounded-2xl bg-base-alt p-4 drop-shadow-lg md:m-2 md:mt-6 md:p-5"
      >
        <h2 class="mb-3 font-bold text-3xl text-base-dark">Steps</h2>
        <div class="space-y-3">
          <div
            v-for="(step, index) in form.steps"
            :key="index"
            class="flex gap-2"
          >
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-accent font-bold text-accent"
              >{{ index + 1 }}</span
            ><BaseTextArea
              v-model="form.steps[index]"
              :aria-label="`Step ${index + 1}`"
              rows="2"
              class="min-w-0 grow"
            />
            <button
              type="button"
              :disabled="form.steps.length === 1"
              class="self-start rounded-lg p-2 text-accent hover:bg-white disabled:opacity-40"
              aria-label="Remove step"
              @click="removeStep(index)"
            >
              <XMarkIcon class="size-5" />
            </button>
          </div>
        </div>
        <button
          type="button"
          class="mt-3 flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-accent hover:bg-white"
          @click="addStep"
        >
          <PlusIcon class="size-5" /> Add step
        </button>
      </div>
      <div
        class="rounded-2xl bg-base-alt p-4 drop-shadow-lg md:m-2 md:mt-6 md:p-5"
      >
        <label>
          <span class="mb-2 block font-bold text-3xl text-base-dark">
            Notes
          </span>
          <BaseTextArea v-model="form.notes" rows="5" />
        </label>
      </div>
      <div class="flex justify-end md:mt-6 md:mx-5">
        <BaseButton
          class="mr-2"
          colorType="cancel"
          @click="$router.push(cancelRoute)"
        >
          Cancel
        </BaseButton>
        <BaseButton
          colorType="submit"
          native-type="submit"
          :disabled="isSaving || (isShareEdit && !sharedRecipe)"
        >
          {{ isSaving ? "Saving…" : "Save" }}
        </BaseButton>
      </div>
    </form>
  </section>
</template>

<script>
import {
  ArrowDownTrayIcon,
  CheckIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import { RouterLink } from "vue-router";
import { useRecipeStore } from "../../stores/recipeStore.js";
import { useSettingsStore } from "../../stores/settingsStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import unitsMixin from "../../mixins/units.js";
import BaseButton from "../../baseComponents/BaseButton.vue";
import BaseNumberInput from "../../baseComponents/BaseNumberInput.vue";
import BaseTextInput from "../../baseComponents/BaseTextInput.vue";
import BaseDropdown from "../../baseComponents/BaseDropdown.vue";
import BaseTextArea from "../../baseComponents/BaseTextArea.vue";
import BaseAutocomplete from "../../baseComponents/BaseAutocomplete.vue";
import BaseTag from "../../baseComponents/BaseTag.vue";
import UnitAutocomplete from "../../baseComponents/UnitAutocomplete.vue";

const today = new Date().toISOString().slice(0, 10);
const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
const blankIngredient = () => ({
  id: makeId(),
  name: "",
  quantity: "",
  unit: "",
});

export default {
  name: "RecipeFormPage",
  mixins: [unitsMixin],
  components: {
    RouterLink,
    ArrowDownTrayIcon,
    CheckIcon,
    PlusIcon,
    XMarkIcon,
    BaseButton,
    BaseNumberInput,
    BaseTextInput,
    BaseDropdown,
    BaseTextArea,
    BaseAutocomplete,
    BaseTag,
    UnitAutocomplete,
  },
  data() {
    return {
      store: useRecipeStore(),
      settingsStore: useSettingsStore(),
      auth: useAuthStore(),
      form: {
        title: "",
        description: "",
        author: "",
        createdAt: today,
        ingredients: [blankIngredient()],
        steps: [""],
        notes: "",
        servingsVerb: "Makes",
        servingsQuantity: "",
        servingsUnit: "",
        cookbookId: "",
        tags: [],
      },
      tagInput: "",
      isTagInputVisible: false,
      isSaving: false,
      sharedRecipe: null,
      shareError: null,
      selectedCookbook: null,
    };
  },
  computed: {
    shareToken() {
      return this.$route.params.token;
    },
    isShareEdit() {
      return this.$route.name === "recipe-share-edit";
    },
    currentRecipe() {
      return this.isShareEdit
        ? this.sharedRecipe
        : this.store.getRecipeById(this.$route.params.id);
    },
    isEditing() {
      return Boolean(this.$route.params.id) || this.isShareEdit;
    },
    isShareOwner() {
      return (
        this.sharedRecipe &&
        this.auth.state.user?.id === this.sharedRecipe.ownerId
      );
    },
    showCookbookSelect() {
      return !this.isShareEdit || Boolean(this.isShareOwner);
    },
    cookbookReadonly() {
      if (!this.isEditing) return false;
      const ownerId = this.currentRecipe?.ownerId || "";
      return Boolean(
        ownerId &&
        this.auth.state.user?.id &&
        ownerId !== this.auth.state.user.id,
      );
    },
    cookbookOptions() {
      const owned = (this.store.state.cookbooks || []).map((cb) => ({
        ...cb,
        ownerUsername: "You",
      }));
      const editableShared = (this.store.state.sharedCookbooks || []).filter(
        (cb) => cb.canEdit,
      );
      return [...owned, ...editableShared];
    },
    availableTagOptions() {
      const selected = new Set(
        this.form.tags.map((tag) => tag.toLocaleLowerCase()),
      );
      const tags = this.store.state.recipes.flatMap((recipe) =>
        (recipe.tags || []).map((tag) =>
          typeof tag === "string" ? tag : tag?.name,
        ),
      );
      const uniqueTags = new Map();
      tags.forEach((tag) => {
        const name = String(tag || "").trim();
        const key = name.toLocaleLowerCase();
        if (name && !selected.has(key) && !uniqueTags.has(key)) {
          uniqueTags.set(key, name);
        }
      });
      return [...uniqueTags.values()]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        .map((tag) => ({ label: tag, value: tag }));
    },
    llmAvailable() {
      return this.settingsStore.isLlmEnabled();
    },
    cancelRoute() {
      if (this.isShareEdit && this.shareToken)
        return {
          name: "recipe-share-view",
          params: { token: this.shareToken },
        };
      if (this.isEditing && this.currentRecipe)
        return { name: "recipe-detail", params: { id: this.currentRecipe.id } };
      return { name: "home" };
    },
  },
  watch: {
    currentRecipe: {
      handler() {
        this.hydrateForm();
      },
      immediate: true,
    },
    shareToken: {
      handler() {
        this.loadSharedRecipe();
      },
      immediate: true,
    },
    "store.state.importedDraft": {
      handler(draft) {
        if (!draft || this.isEditing) return;
        this.applyDraft(draft, { replaceExisting: true });
        this.store.consumeImportedDraft();
      },
      immediate: true,
    },
    cookbookOptions: {
      handler() {
        this.syncSelectedCookbook(this.form.cookbookId);
      },
      deep: true,
      immediate: true,
    },
    selectedCookbook(cb) {
      this.form.cookbookId = cb?.id || "";
    },
  },
  mounted() {
    this.settingsStore.loadSettings();
    this.loadSharedRecipe();
  },
  methods: {
    applyDraft(data, { replaceExisting = false } = {}) {
      if (!data) return;
      const setField = (key, value) => {
        if (replaceExisting || value) {
          this.form[key] = value ?? "";
        }
      };

      setField("title", data.title);
      setField("description", data.description);
      setField("author", data.author);
      if (replaceExisting && data.createdAt) {
        this.form.createdAt = new Date(data.createdAt)
          .toISOString()
          .slice(0, 10);
      }
      setField("notes", data.notes);
      setField("servingsVerb", data.servingsVerb || "Makes");
      setField("servingsQuantity", data.servingsQuantity);
      setField("servingsUnit", data.servingsUnit);
      setField("cookbookId", data.cookbookId);

      const nextIngredients = (data.ingredients || []).map((item) => ({
        id: item.id || makeId(),
        name: item.name || "",
        quantity: item.quantity ?? "",
        unit: item.unit || "",
      }));
      if (replaceExisting || nextIngredients.length) {
        this.form.ingredients = nextIngredients.length
          ? nextIngredients
          : [blankIngredient()];
      }

      const nextSteps = (
        data.steps && data.steps.length ? [...data.steps] : [""]
      ).map((step) => step || "");
      if (replaceExisting || (data.steps && data.steps.length)) {
        this.form.steps = nextSteps;
      }

      if (replaceExisting || (data.tags && data.tags.length)) {
        this.form.tags = (data.tags || [])
          .map((tag) => (typeof tag === "string" ? tag : tag?.name))
          .map((tag) => String(tag || "").trim().toLocaleLowerCase())
          .filter(Boolean);
        this.tagInput = "";
        this.isTagInputVisible = false;
      }
    },
    hydrateForm() {
      if (!this.isEditing || !this.currentRecipe) return;
      this.applyDraft(this.currentRecipe, { replaceExisting: true });
      this.syncSelectedCookbook(this.currentRecipe.cookbookId);
    },
    async loadSharedRecipe() {
      if (!this.isShareEdit || !this.shareToken) return;
      this.shareError = null;
      try {
        const res = await fetch(`/api/share/${this.shareToken}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data?.error || "Unable to load shared recipe.");
        this.sharedRecipe = data.recipe;
        this.applyDraft(data.recipe, { replaceExisting: true });
        this.syncSelectedCookbook(data.recipe.cookbookId);
      } catch (err) {
        this.shareError = err.message || "Unable to load shared recipe.";
      }
    },
    addIngredient() {
      this.form.ingredients.push(blankIngredient());
    },
    removeIngredient(index) {
      if (this.form.ingredients.length === 1) return;
      this.form.ingredients.splice(index, 1);
    },
    addStep() {
      this.form.steps.push("");
    },
    removeStep(index) {
      if (this.form.steps.length === 1) return;
      this.form.steps.splice(index, 1);
    },
    showTagInput() {
      this.isTagInputVisible = true;
      this.$nextTick(() => {
        this.$refs.tagAutocomplete?.$el?.querySelector("input")?.focus();
      });
    },
    addTag(value) {
      const tag = String(value || "").trim().toLocaleLowerCase();
      if (!tag) return;
      const exists = this.form.tags.some(
        (existingTag) => existingTag.toLocaleLowerCase() === tag.toLocaleLowerCase(),
      );
      if (!exists) this.form.tags.push(tag);
      this.tagInput = "";
      this.isTagInputVisible = false;
    },
    removeTag(index) {
      this.form.tags.splice(index, 1);
    },
    buildPayload() {
      const ingredients = this.form.ingredients
        .filter((item) => item.name || item.quantity || item.unit)
        .map((item) => ({
          id: item.id || makeId(),
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        }));

      const steps = this.form.steps.map((step) => step.trim()).filter(Boolean);

      return {
        ...(this.isEditing && this.currentRecipe
          ? { id: this.currentRecipe.id }
          : {}),
        title: this.form.title,
        description: this.form.description,
        author: this.form.author,
        createdAt: this.form.createdAt
          ? new Date(this.form.createdAt).toISOString()
          : new Date().toISOString(),
        tags: this.form.tags.map((tag) => tag.toLocaleLowerCase()),
        ingredients,
        steps,
        notes: this.form.notes,
        servingsVerb: this.form.servingsVerb,
        servingsQuantity: this.form.servingsQuantity,
        servingsUnit: this.form.servingsUnit,
        cookbookId: this.form.cookbookId,
      };
    },
    async save() {
      try {
        this.isSaving = true;
        if (this.isShareEdit) {
          this.shareError = null;
        }
        const payload = this.buildPayload();
        if (this.isShareEdit && this.shareToken) {
          const res = await fetch(`/api/share/${this.shareToken}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data.success)
            throw new Error(data?.error || "Unable to save recipe.");
          this.$router.push({
            name: "recipe-share-view",
            params: { token: this.shareToken },
          });
        } else {
          const saved = await this.store.saveRecipe(payload);
          this.$router.push({
            name: "recipe-detail",
            params: { id: saved.id },
          });
        }
      } catch (error) {
        console.error(error);
        if (this.isShareEdit) {
          this.shareError = error.message || "Unable to save recipe.";
        }
      } finally {
        this.isSaving = false;
      }
    },
    syncSelectedCookbook(cookbookId) {
      if (!this.showCookbookSelect) return;
      const targetId = cookbookId || this.form.cookbookId;
      if (targetId && this.selectedCookbook?.id === targetId) return;

      const match = this.cookbookOptions.find((cb) => cb.id === targetId);
      if (targetId && !match) {
        // Keep the id around until options load; don't overwrite with blank.
        return;
      }

      const fallback =
        this.cookbookOptions.find((cb) => cb.isDefault) ||
        this.cookbookOptions[0] ||
        null;

      this.selectedCookbook = match || fallback;
      this.form.cookbookId = this.selectedCookbook?.id || "";
    },
  },
};
</script>
