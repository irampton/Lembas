<template>
  <BasePopup noclose :aria-label="step === 1 ? 'Welcome' : 'Create your first cookbook'">
    <form v-if="step === 1" @submit.prevent="next">
      <h2 class="text-3xl font-bold text-base-dark">Welcome to Lembas!</h2>
      <p class="mt-2 text-light">What should we call you?</p>
      <label class="mt-6 block" for="welcome-display-name">
        <span class="mb-2 block font-semibold text-base-dark">Display name</span>
        <BaseTextInput id="welcome-display-name" ref="displayNameInput" v-model="displayName" autocomplete="name" maxlength="24" required />
      </label>
      <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <div class="mt-6 flex justify-end">
        <BaseButton color-type="submit" native-type="submit">Next</BaseButton>
      </div>
    </form>

    <form v-else @submit.prevent="finish">
      <h2 class="text-3xl font-bold text-base-dark">Create your first cookbook</h2>
      <p class="mt-2 text-light">You can always change these details later.</p>
      <label class="mt-6 block" for="welcome-cookbook-name">
        <span class="mb-2 block font-semibold text-base-dark">Cookbook name</span>
        <BaseTextInput id="welcome-cookbook-name" ref="cookbookNameInput" v-model="cookbookName" maxlength="80" required />
      </label>
      <fieldset class="mt-5">
        <legend class="mb-2 font-semibold text-base-dark">Color</legend>
        <div class="flex flex-col" role="radiogroup" aria-label="Cookbook color">
          <div v-for="row in colorRows" :key="row[0].name" class="flex flex-row">
            <button v-for="option in row" :key="option.value" type="button" role="radio" class="mx-0.5 my-px size-7 rounded-full border border-black/20 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :class="color === option.value ? 'ring-2 ring-primary ring-offset-2' : ''" :style="{ backgroundColor: option.value }" :aria-label="option.name" :aria-checked="color === option.value" @click="color = option.value" />
          </div>
        </div>
      </fieldset>
      <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <div class="mt-6 flex justify-end">
        <BaseButton native-type="submit" :disabled="saving">{{ saving ? 'Getting ready…' : 'Start Cooking' }}</BaseButton>
      </div>
    </form>
  </BasePopup>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue';
import BaseButton from '../baseComponents/BaseButton.vue';
import BasePopup from '../baseComponents/BasePopup.vue';
import BaseTextInput from '../baseComponents/BaseTextInput.vue';
import { useAuthStore } from '../stores/authStore.js';
import { useRecipeStore } from '../stores/recipeStore.js';

const auth = useAuthStore();
const recipes = useRecipeStore();
const step = ref(1);
const displayName = ref(auth.state.user?.displayName || auth.state.user?.username || '');
const cookbookName = ref('');
const color = ref('#0080FF');
const error = ref('');
const saving = ref(false);
const displayNameInput = ref(null);
const cookbookNameInput = ref(null);

const colorRows = [
  [
    { name: 'White', value: '#FFFFFF' }, { name: 'Light red', value: '#FFABAB' },
    { name: 'Light orange', value: '#FFD5AB' }, { name: 'Light yellow', value: '#FFFFAB' },
    { name: 'Light green', value: '#AAFFD3' }, { name: 'Light cyan', value: '#ABF1FF' },
    { name: 'Light blue', value: '#ABD5FF' }, { name: 'Light purple', value: '#D5ABFF' },
    { name: 'Light magenta', value: '#FFABFF' }, { name: 'Dark grey', value: '#666666' },
  ],
  [
    { name: 'Light grey', value: '#BBBBBB' }, { name: 'Red', value: '#D90000' },
    { name: 'Orange', value: '#FF8000' }, { name: 'Yellow', value: '#FFFF00' },
    { name: 'Green', value: '#00C45D' }, { name: 'Cyan', value: '#03D5FF' },
    { name: 'Blue', value: '#0080FF' }, { name: 'Purple', value: '#8000FF' },
    { name: 'Magenta', value: '#FF00FF' }, { name: 'Black', value: '#101010' },
  ],
];

const next = async () => {
  const name = displayName.value.trim();
  if (!name || Array.from(name).length > 24) {
    error.value = 'Display name must be between 1 and 24 characters.';
    return;
  }
  displayName.value = name;
  cookbookName.value = `${name}'s Cookbook`;
  error.value = '';
  step.value = 2;
  await nextTick();
  cookbookNameInput.value?.focus();
};

const finish = async () => {
  const name = cookbookName.value.trim();
  if (!name || name.length > 80 || saving.value) {
    if (!saving.value) error.value = 'Cookbook name must be between 1 and 80 characters.';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await auth.completeOnboarding({ displayName: displayName.value, cookbookName: name, color: color.value });
    recipes.loadLibrary();
  } catch (err) {
    error.value = err.message || 'Unable to finish setup.';
  } finally {
    saving.value = false;
  }
};

onMounted(() => nextTick(() => displayNameInput.value?.focus()));
</script>
