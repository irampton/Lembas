<template>
  <section class="recipe-form">
    <div class="recipe-form__main">
      <div class="recipe-form__header">
        <div class="recipe-form__heading">
          <p>{{ isEditing ? 'Edit' : 'Create' }} recipe</p>
          <h1>{{ isEditing ? 'Update your recipe' : 'Craft something new' }}</h1>
          <p>Fill in the details below and hit save when you are ready.</p>
        </div>
        <div class="recipe-form__header-actions">
          <RouterLink
            v-if="!isEditing && llmAvailable"
            :to="{ name: 'recipe-import' }"
          >
            <ArrowDownTrayIcon />
            Import via LLM
          </RouterLink>
          <RouterLink
            v-if="isShareEdit && shareToken"
            :to="{ name: 'recipe-share-view', params: { token: shareToken } }"
          >
            Cancel
          </RouterLink>
          <RouterLink
            v-else-if="isEditing && currentRecipe"
            :to="{ name: 'recipe-detail', params: { id: currentRecipe.id } }"
          >
            Cancel
          </RouterLink>
          <RouterLink
            v-else
            :to="{ name: 'home' }"
          >
            Cancel
          </RouterLink>
          <button
            type="button"
            :disabled="isSaving"
            @click="save"
          >
            <CheckIcon />
            {{ isSaving ? 'Saving…' : 'Save recipe' }}
          </button>
        </div>
      </div>
      <div v-if="store.state.error" class="recipe-form__error">
        {{ store.state.error }}
      </div>
      <div v-if="shareError" class="recipe-form__error">
        {{ shareError }}
      </div>
      <div class="recipe-form__fields">
        <label v-if="showCookbookSelect">
          <span>Cookbook</span>
          <select v-model="selectedCookbook" :disabled="cookbookReadonly">
            <option :value="null">Choose a cookbook</option>
            <option v-for="cookbook in cookbookOptions" :key="cookbook.id" :value="cookbook">{{ cookbook.name }}</option>
          </select>
        </label>
        <label>
          <span>Title</span>
          <input
            v-model="form.title"
            type="text"
            placeholder="Grilled Lemon Chicken"
          />
        </label>
        <label>
          <span>Author / Source</span>
          <input
            v-model="form.author"
            type="text"
            placeholder="Grandma June, Bon Appetit…"
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="A quick summary of flavor, notes, or when to serve."
          ></textarea>
        </label>
        <label>
          <span>Date created</span>
          <input
            v-model="form.createdAt"
            type="date"
          />
        </label>
        <label>
          <span>Tags (comma separated)</span>
          <input
            v-model="tagInput"
            type="text"
            placeholder="weeknight, vegetarian, pasta"
          />
        </label>
      </div>
    </div>

    <div class="recipe-form__section">
      <div class="recipe-form__section-heading">
        <h2>Ingredients</h2>
        <span>Add as many as you need</span>
      </div>

      <div class="recipe-form__ingredient-list">
        <div
          v-for="(ingredient, index) in form.ingredients"
          :key="ingredient.id"
          class="recipe-form__ingredient"
        >
          <label>
            Name
            <input
              v-model="ingredient.name"
              type="text"
              placeholder="Flour"
            />
          </label>
          <label>
            Quantity
            <input
              v-model="ingredient.quantity"
              type="text"
              placeholder="1 1/2"
            />
          </label>
          <label>
            Unit
            <select
              v-model="ingredient.unit"
            >
              <option value="">Select</option>
              <option v-for="unit in units" :key="unit.value" :value="unit.value">
                {{ unit.name }}<template v-if="unit.abbreviation !== unit.name.toLowerCase()"> ({{ unit.abbreviation }})</template>
              </option>
            </select>
          </label>
          <div class="recipe-form__remove">
            <button
              type="button"
              :disabled="form.ingredients.length === 1"
              @click="removeIngredient(index)"
            >
              <XMarkIcon />
              Remove
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="addIngredient"
      >
        <PlusIcon />
        Add ingredient
      </button>
    </div>

    <div class="recipe-form__section">
      <div class="recipe-form__section-heading">
        <h2>Steps</h2>
        <span>Add steps in order</span>
      </div>

      <div class="recipe-form__steps">
        <div
          v-for="(step, index) in form.steps"
          :key="index"
          class="recipe-form__step"
        >
          <span
          >
            {{ index + 1 }}
          </span>
          <textarea
            v-model="form.steps[index]"
            rows="2"
            placeholder="Write the step here"
          ></textarea>
          <button
            type="button"
            :disabled="form.steps.length === 1"
            @click="removeStep(index)"
          >
            <XMarkIcon />
          </button>
        </div>
      </div>

      <button
        type="button"
        @click="addStep"
      >
        <PlusIcon />
        Add another step
      </button>
    </div>

    <div class="recipe-form__details">
      <div class="recipe-form__section">
        <h2>Serving size</h2>
        <p>Optional details for how much this recipe yields.</p>
        <div class="recipe-form__servings">
          <label>
            Quantity
            <input
              v-model="form.servingsQuantity"
              type="text"
              placeholder="4"
            />
          </label>
          <label>
            Unit / label
            <input
              v-model="form.servingsUnit"
              type="text"
              placeholder="servings, slices, people..."
            />
          </label>
        </div>
      </div>
      <div class="recipe-form__section">
        <div class="recipe-form__section-heading">
          <h2>Notes</h2>
          <span>Optional</span>
        </div>
        <textarea
          v-model="form.notes"
          rows="5"
          placeholder="Finishing tips, substitutions, storage notes..."
        ></textarea>
      </div>
    </div>

    <div class="recipe-form__footer">
      <span>All set? Save your recipe when you're ready.</span>
      <button
        type="button"
        :disabled="isSaving || (isShareEdit && !sharedRecipe)"
        @click="save"
      >
        <CheckIcon />
        {{ isSaving ? 'Saving…' : 'Save recipe' }}
      </button>
    </div>
  </section>
</template>

<script>
import { ArrowDownTrayIcon, CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { RouterLink } from 'vue-router';
import { useRecipeStore } from '../../stores/recipeStore.js';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import unitsMixin from '../../mixins/units.js';

const today = new Date().toISOString().slice(0, 10);
const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const blankIngredient = () => ({
  id: makeId(),
  name: '',
  quantity: '',
  unit: '',
});

export default {
  name: 'RecipeFormPage',
  mixins: [unitsMixin],
  components: {
    RouterLink,
    ArrowDownTrayIcon,
    CheckIcon,
    PlusIcon,
    XMarkIcon,
  },
  data() {
    return {
      store: useRecipeStore(),
      settingsStore: useSettingsStore(),
      auth: useAuthStore(),
      form: {
        title: '',
        description: '',
        author: '',
        createdAt: today,
        ingredients: [blankIngredient()],
        steps: [''],
        notes: '',
        servingsQuantity: '',
        servingsUnit: '',
        cookbookId: '',
      },
      tagInput: '',
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
      return this.$route.name === 'recipe-share-edit';
    },
    currentRecipe() {
      return this.isShareEdit ? this.sharedRecipe : this.store.getRecipeById(this.$route.params.id);
    },
    isEditing() {
      return Boolean(this.$route.params.id) || this.isShareEdit;
    },
    isShareOwner() {
      return this.sharedRecipe && this.auth.state.user?.id === this.sharedRecipe.ownerId;
    },
    showCookbookSelect() {
      return !this.isShareEdit || Boolean(this.isShareOwner);
    },
    cookbookReadonly() {
      if (!this.isEditing) return false;
      const ownerId = this.currentRecipe?.ownerId || '';
      return Boolean(ownerId && this.auth.state.user?.id && ownerId !== this.auth.state.user.id);
    },
    cookbookOptions() {
      const owned = (this.store.state.cookbooks || []).map((cb) => ({ ...cb, ownerUsername: 'You' }));
      const editableShared = (this.store.state.sharedCookbooks || []).filter((cb) => cb.canEdit);
      return [...owned, ...editableShared];
    },
    llmAvailable() {
      return this.settingsStore.isLlmEnabled();
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
    'store.state.importedDraft': {
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
      this.form.cookbookId = cb?.id || '';
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
          this.form[key] = value ?? '';
        }
      };

      setField('title', data.title);
      setField('description', data.description);
      setField('author', data.author);
      if (replaceExisting && data.createdAt) {
        this.form.createdAt = new Date(data.createdAt).toISOString().slice(0, 10);
      }
      setField('notes', data.notes);
      setField('servingsQuantity', data.servingsQuantity);
      setField('servingsUnit', data.servingsUnit);
      setField('cookbookId', data.cookbookId);

      const nextIngredients = (data.ingredients || []).map((item) => ({
        id: item.id || makeId(),
        name: item.name || '',
        quantity: item.quantity ?? '',
        unit: item.unit || '',
      }));
      if (replaceExisting || nextIngredients.length) {
        this.form.ingredients = nextIngredients.length ? nextIngredients : [blankIngredient()];
      }

      const nextSteps = (data.steps && data.steps.length ? [...data.steps] : ['']).map((step) => step || '');
      if (replaceExisting || (data.steps && data.steps.length)) {
        this.form.steps = nextSteps;
      }

      if (replaceExisting || (data.tags && data.tags.length)) {
        this.tagInput = (data.tags || []).join(', ');
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
        const res = await fetch(`/api/share/${this.shareToken}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to load shared recipe.');
        this.sharedRecipe = data.recipe;
        this.applyDraft(data.recipe, { replaceExisting: true });
        this.syncSelectedCookbook(data.recipe.cookbookId);
      } catch (err) {
        this.shareError = err.message || 'Unable to load shared recipe.';
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
      this.form.steps.push('');
    },
    removeStep(index) {
      if (this.form.steps.length === 1) return;
      this.form.steps.splice(index, 1);
    },
    buildPayload() {
      const tags = this.tagInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

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
        ...(this.isEditing && this.currentRecipe ? { id: this.currentRecipe.id } : {}),
        title: this.form.title,
        description: this.form.description,
        author: this.form.author,
        createdAt: this.form.createdAt ? new Date(this.form.createdAt).toISOString() : new Date().toISOString(),
        tags,
        ingredients,
        steps,
        notes: this.form.notes,
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
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to save recipe.');
          this.$router.push({ name: 'recipe-share-view', params: { token: this.shareToken } });
        } else {
          const saved = await this.store.saveRecipe(payload);
          this.$router.push({ name: 'recipe-detail', params: { id: saved.id } });
        }
      } catch (error) {
        console.error(error);
        if (this.isShareEdit) {
          this.shareError = error.message || 'Unable to save recipe.';
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
      this.form.cookbookId = this.selectedCookbook?.id || '';
    },
  },
};
</script>

<style scoped>
.recipe-form {
  display: grid;
  gap: 1.5rem;
  max-width: 58rem;
  margin: 0 auto;
  padding: 1.5rem;
}

.recipe-form__main,
.recipe-form__section,
.recipe-form__footer {
  padding: 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}

.recipe-form__header,
.recipe-form__section-heading,
.recipe-form__footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.recipe-form__header {
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.recipe-form__heading > p:first-child,
.recipe-form__section-heading span,
.recipe-form__footer > span {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.recipe-form h1,
.recipe-form h2 {
  margin: 0;
}

.recipe-form__heading > p:last-child,
.recipe-form__section p {
  margin: 0.5rem 0 0;
  color: #4b5563;
}

.recipe-form__header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.recipe-form__header-actions a,
.recipe-form button {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid #9ca3af;
  border-radius: 0.375rem;
  background: #fff;
  color: inherit;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.recipe-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recipe-form svg {
  width: 1.1rem;
  height: 1.1rem;
}

.recipe-form__error {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #9ca3af;
  border-radius: 0.375rem;
  background: #f3f4f6;
}

.recipe-form__fields,
.recipe-form__ingredient-list,
.recipe-form__steps {
  display: grid;
  gap: 1rem;
}

.recipe-form label {
  display: grid;
  gap: 0.4rem;
  font-weight: 600;
}

.recipe-form input,
.recipe-form select,
.recipe-form textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #9ca3af;
  border-radius: 0.375rem;
  background: #fff;
  color: inherit;
  font: inherit;
  font-weight: 400;
}

.recipe-form textarea {
  resize: vertical;
}

.recipe-form input:focus,
.recipe-form select:focus,
.recipe-form textarea:focus,
.recipe-form button:focus-visible,
.recipe-form a:focus-visible {
  outline: 2px solid #4b5563;
  outline-offset: 2px;
}

.recipe-form__section {
  display: grid;
  gap: 1.25rem;
}

.recipe-form__ingredient {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(7rem, 1fr) minmax(7rem, 1fr) auto;
  gap: 0.75rem;
  align-items: end;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #f9fafb;
}

.recipe-form__remove button {
  width: 100%;
}

.recipe-form__step {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.recipe-form__step > span {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 50%;
  background: #e5e7eb;
  font-weight: 700;
}

.recipe-form__step button {
  padding: 0.5rem;
}

.recipe-form__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.recipe-form__servings {
  display: grid;
  grid-template-columns: minmax(6rem, 1fr) minmax(0, 2fr);
  gap: 0.75rem;
  margin-top: 1rem;
}

@media (max-width: 42rem) {
  .recipe-form {
    padding: 1rem;
  }

  .recipe-form__header,
  .recipe-form__section-heading,
  .recipe-form__footer,
  .recipe-form__details {
    grid-template-columns: 1fr;
    display: grid;
  }

  .recipe-form__ingredient,
  .recipe-form__servings {
    grid-template-columns: 1fr;
  }

  .recipe-form__header-actions,
  .recipe-form__footer button {
    width: 100%;
  }
}
</style>
