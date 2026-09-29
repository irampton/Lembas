<template>
  <section class="mx-auto w-full max-w-5xl p-4 lg:p-6">
    <form class="flex flex-col gap-6" @submit.prevent="submit">
      <header class="flex items-center justify-between gap-4 lg:mx-5">
        <h1 class="text-3xl font-bold text-base-dark lg:text-4xl">Import recipe</h1>
        <RouterLink :to="newRecipeRoute" class="rounded-xl p-2 text-accent hover:bg-base-alt" aria-label="Back to new recipe" title="Back">
          <ArrowLeftIcon class="size-6 lg:size-8" aria-hidden="true" />
        </RouterLink>
      </header>

      <p v-if="settingsLoading" role="status" class="rounded-lg bg-base-alt p-3 text-light">Loading…</p>
      <p v-else-if="settingsReady && !llmAvailable" role="alert" class="rounded-lg bg-red-50 p-3 text-red-700">
        LLM import is unavailable.
      </p>

      <div class="flex flex-col gap-4 rounded-2xl bg-base-alt p-4 drop-shadow-lg lg:m-2 lg:p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-3xl font-bold text-base-dark">Recipe</h2>
          <button v-if="visionCapable && imageData" type="button" class="rounded-lg p-2 text-accent hover:bg-white" aria-label="Remove image" title="Remove image" @click="clearImage">
            <XMarkIcon class="size-6" />
          </button>
        </div>

        <label
          v-if="visionCapable"
          class="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors"
          :class="isDragging ? 'border-primary bg-primary/10' : 'border-accent-alt/50 hover:bg-white'"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <input ref="fileInput" class="sr-only" type="file" accept="image/*" :disabled="controlsDisabled" @change="onImageChange" />
          <PhotoIcon class="size-9 text-accent" aria-hidden="true" />
          <span class="font-bold text-accent">{{ imageName || 'Add image' }}</span>
        </label>

        <img v-if="visionCapable && imageData" :src="imageData" alt="Selected recipe" class="max-h-72 w-full rounded-xl object-contain" />

        <BaseTextArea v-model="text" rows="12" placeholder="Paste recipe" aria-label="Recipe text" :disabled="controlsDisabled" />
      </div>

      <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-red-700">{{ error }}</p>

      <div class="flex justify-end gap-2 lg:mx-5">
        <BaseButton color-type="cancel" @click="$router.push(newRecipeRoute)">Cancel</BaseButton>
        <BaseButton native-type="submit" color-type="submit" :disabled="controlsDisabled">
          <span class="flex items-center gap-2">
            <ArrowPathIcon v-if="loading" class="size-5 animate-spin" />
            <ArrowDownTrayIcon v-else class="size-5" />
            {{ loading ? 'Importing…' : 'Import' }}
          </span>
        </BaseButton>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowDownTrayIcon, ArrowLeftIcon, ArrowPathIcon, PhotoIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseTextArea from '../../baseComponents/BaseTextArea.vue';
import { importRecipeFromText } from '../../services/importer.js';
import { useRecipeStore } from '../../stores/recipeStore.js';
import { useSettingsStore } from '../../stores/settingsStore.js';

const route = useRoute();
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
const visionCapable = computed(() => Boolean(settingsStore.getLlmSettings().visionCapable));
const settingsReady = computed(() => settingsStore.state.ready);
const settingsLoading = computed(() => settingsStore.state.loading && !settingsStore.state.ready);
const controlsDisabled = computed(() => loading.value || !llmAvailable.value || !settingsReady.value);
const cookbookId = computed(() => route.query.cookbookId?.toString() || '');
const newRecipeRoute = computed(() => ({ name: 'recipe-new', query: cookbookId.value ? { cookbookId: cookbookId.value } : {} }));

const clearImage = () => {
  imageData.value = '';
  imageName.value = '';
  if (fileInput.value) fileInput.value.value = '';
};
const processFile = (file) => {
  error.value = null;
  if (!file) return clearImage();
  if (!file.type.startsWith('image/')) {
    error.value = 'Choose an image file.';
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
    error.value = 'Unable to read image.';
    clearImage();
  };
  reader.readAsDataURL(file);
};
const onImageChange = (event) => processFile(event.target?.files?.[0]);
const onDragOver = () => { if (!controlsDisabled.value) isDragging.value = true; };
const onDragLeave = () => { isDragging.value = false; };
const onDrop = (event) => {
  isDragging.value = false;
  if (!controlsDisabled.value) processFile(event.dataTransfer?.files?.[0]);
};

const submit = async () => {
  if (!settingsReady.value || !llmAvailable.value) {
    error.value = 'LLM import is unavailable.';
    return;
  }
  if (!text.value.trim() && !(visionCapable.value && imageData.value)) {
    error.value = visionCapable.value ? 'Add recipe text or an image.' : 'Add recipe text.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const recipe = await importRecipeFromText({
      text: text.value,
      imageBase64: visionCapable.value ? imageData.value || undefined : undefined,
    });
    store.setImportedDraft({ ...recipe, cookbookId: cookbookId.value || recipe.cookbookId || '' });
    await router.push(newRecipeRoute.value);
  } catch (err) {
    error.value = err?.message || 'Unable to import recipe.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => settingsStore.loadSettings());
</script>
