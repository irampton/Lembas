<template>
  <section>
    <div>
      <div>
        <p>Import</p>
        <h1>Import a recipe via LLM</h1>
        <p>Paste recipe text or upload a photo. We will extract the text and ask the LLM to build a recipe.</p>
      </div>
      <RouterLink
        :to="{ name: 'recipe-new' }"
      >
        Back to create form
      </RouterLink>
    </div>

    <div
      v-if="settingsLoading"
    >
      Checking LLM import availability…
    </div>
    <div
      v-else-if="settingsReady && !llmAvailable"
    >
      LLM import is currently disabled or not configured. Ask an admin to enable it in Server settings.
    </div>

    <form @submit.prevent="submit">
      <div>
        <div>
          <h2>Paste recipe content</h2>
          <p>We will ask for structured JSON with title, tags, ingredients, steps, serving size, and notes.</p>
        </div>
        <span v-if="loading">
          <ArrowPathIcon />
          Importing…
        </span>
      </div>

      <div>
        <div>
          <div>
            <span>Recipe image (optional)</span>
            <button
              v-if="imageData"
              type="button"
              @click="clearImage"
            >
              Remove
            </button>
          </div>
          <label
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              :disabled="loading || !llmAvailable || !settingsReady"
              @change="onImageChange"
            />
            <div>
              <span>+</span>
            </div>
            <div>
              <p>Upload or drop a photo of the recipe</p>
              <p>Clear shots of cards or magazines work best. JPG, PNG, or WEBP.</p>
            </div>
            <p v-if="imageName">Selected: {{ imageName }}</p>
            <p v-else>Drag & drop an image</p>
          </label>

          <div
            v-if="imageData"
          >
            <img :src="imageData" alt="Selected recipe" />
          </div>
        </div>

        <label>
          <span>Raw recipe text</span>
          <textarea
            v-model="text"
            rows="12"
            placeholder="Paste any recipe text, article, or notes here... (optional if you upload a photo)"
            :disabled="loading || !llmAvailable || !settingsReady"
          ></textarea>
        </label>
      </div>

      <div>
        <div>
          <p>What we ask the model</p>
          <ul>
            <li>Extract title, description, author/source, tags</li>
            <li>Build ingredients with quantity + unit where possible</li>
            <li>Return ordered steps as short instructions</li>
            <li>Collect serving size (quantity + unit text) and any cook's notes</li>
          </ul>
        </div>
        <div>
          <p>Tips</p>
          <ul>
            <li>Include the full ingredients and directions text if you paste</li>
            <li>Upload a sharp, well-lit image for better OCR results</li>
            <li>Add any personal notes — they will populate notes</li>
            <li>Nothing is saved until you review and click Save</li>
          </ul>
        </div>
      </div>

      <div v-if="error">
        {{ error }}
      </div>

      <div>
        <p>We will return to the create form with the extracted details filled in.</p>
        <button
          type="submit"
          :disabled="loading || !llmAvailable || !settingsReady"
        >
          <ArrowDownTrayIcon v-if="!loading" />
          <ArrowPathIcon v-else />
          {{ loading ? 'Importing…' : 'Import via LLM' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';
import { importRecipeFromText } from '../../services/importer.js';
import { useRecipeStore } from '../../stores/recipeStore.js';
import { useSettingsStore } from '../../stores/settingsStore.js';

const router = useRouter();
const store = useRecipeStore();
const settingsStore = useSettingsStore();

const text = ref('');
const imageData = ref('');
const imageName = ref('');
const fileInput = ref(null);
const isDragging = ref(false);
const loading = ref(false);
const error = ref(null);
const llmAvailable = computed(() => settingsStore.isLlmEnabled());
const settingsReady = computed(() => settingsStore.state.ready);
const settingsLoading = computed(() => settingsStore.state.loading && !settingsStore.state.ready);

const processFile = (file) => {
  error.value = null;
  if (!file) {
    imageData.value = '';
    imageName.value = '';
    return;
  }

  if (!file.type.startsWith('image/')) {
    error.value = 'Please choose an image file.';
    if (fileInput.value) fileInput.value.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    imageData.value = reader.result?.toString() || '';
    imageName.value = file.name;
    if (fileInput.value) fileInput.value.value = '';
  };
  reader.onerror = () => {
    error.value = 'We could not read that image file.';
    imageData.value = '';
    imageName.value = '';
    if (fileInput.value) fileInput.value.value = '';
  };
  reader.readAsDataURL(file);
};

const onImageChange = (event) => {
  const file = event.target?.files?.[0];
  if (!file) {
    imageData.value = '';
    imageName.value = '';
    return;
  }
  processFile(file);
};

const onDragOver = () => {
  if (loading.value || !llmAvailable.value || !settingsReady.value) return;
  isDragging.value = true;
};

const onDragLeave = () => {
  isDragging.value = false;
};

const onDrop = (event) => {
  isDragging.value = false;
  if (loading.value || !llmAvailable.value || !settingsReady.value) return;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  processFile(file);
};

const clearImage = () => {
  imageData.value = '';
  imageName.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const submit = async () => {
  if (!settingsReady.value) {
    error.value = 'Still loading settings. Please try again.';
    return;
  }

  if (!llmAvailable.value) {
    error.value = 'LLM import is disabled right now.';
    return;
  }

  if (!text.value.trim() && !imageData.value) {
    error.value = 'Please paste some recipe text or upload a photo.';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const recipe = await importRecipeFromText({
      text: text.value,
      imageBase64: imageData.value || undefined,
    });
    store.setImportedDraft(recipe);
    router.push({ name: 'recipe-new' });
  } catch (err) {
    error.value = err?.message || 'Something went wrong while importing.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  settingsStore.loadSettings();
});
</script>
