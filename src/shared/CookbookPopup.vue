<template>
  <BasePopup :aria-label="cookbook ? 'Edit cookbook' : 'New cookbook'" :buttons="popupButtons" :confirm-disabled="saving || !name.trim()" :confirm-label="saving ? 'Saving…' : 'Save'" @close="$emit('close')" @delete="showDeleteConfirmation = true" @confirm="save">
    <form class="space-y-5" @submit.prevent="save">
      <h2 class="text-3xl font-bold text-base-dark">{{ cookbook ? 'Edit cookbook' : 'New cookbook' }}</h2>
      <label class="block">
        <span class="mb-2 block font-semibold text-base-dark">Name</span>
        <BaseTextInput ref="nameInput" v-model="name" required />
      </label>
      <label class="block">
        <span class="mb-2 block font-semibold text-base-dark">Color</span>
        <div class="flex flex-col" role="radiogroup" aria-label="Cookbook color">
          <div class="flex flex-row" v-for="row in colorRows" :key="row[0].name">
            <button
              v-for="option in row"
              :key="option.value"
              type="button"
              role="radio"
              class="mx-0.5 my-px size-7 rounded-full border border-black/20 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :class="color === option.value ? 'ring-2 ring-primary ring-offset-2' : ''"
              :style="{ backgroundColor: option.value }"
              :aria-label="option.name"
              :aria-checked="color === option.value"
              @click="color = option.value"
            />
          </div>
        </div>
      </label>
      <label class="block">
        <span class="mb-2 block font-semibold text-base-dark">Description</span>
        <BaseTextArea v-model="description" rows="4" />
      </label>
      <p v-if="error" class="text-sm text-red-700" role="alert">{{ error }}</p>
    </form>
  </BasePopup>
  <CookbookDeletePopup v-if="showDeleteConfirmation" :cookbook="cookbook" :destination-cookbooks="destinationCookbooks" @close="showDeleteConfirmation = false" @confirm="remove" />
  <BaseLoadingPopup v-if="deleting" label="Deleting cookbook…" />
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import BasePopup from '../baseComponents/BasePopup.vue';
import BaseLoadingPopup from '../baseComponents/BaseLoadingPopup.vue';
import BaseTextArea from '../baseComponents/BaseTextArea.vue';
import BaseTextInput from '../baseComponents/BaseTextInput.vue';
import { useRecipeStore } from '../stores/recipeStore';
import CookbookDeletePopup from './CookbookDeletePopup.vue';

const props = defineProps({ cookbook: { type: Object, default: null } });
const emit = defineEmits(['close']);
const store = useRecipeStore();
const nameInput = ref(null);
const name = ref(props.cookbook?.name || '');
const color = ref(props.cookbook?.color || '#0080FF');
const description = ref(props.cookbook?.description || '');
const error = ref('');
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirmation = ref(false);
const destinationCookbooks = computed(() => store.state.cookbooks.filter((item) => item.id !== props.cookbook?.id));
const popupButtons = computed(() => props.cookbook && destinationCookbooks.value.length
  ? ['cancel', 'delete', 'confirm']
  : ['cancel', 'confirm']);
const colorRows = [
  [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Light red', value: '#FFABAB' },
    { name: 'Light orange', value: '#FFD5AB' },
    { name: 'Light yellow', value: '#FFFFAB' },
    { name: 'Light green', value: '#AAFFD3' },
    { name: 'Light cyan', value: '#ABF1FF' },
    { name: 'Light blue', value: '#ABD5FF' },
    { name: 'Light purple', value: '#D5ABFF' },
    { name: 'Light magenta', value: '#FFABFF' },
    { name: 'Dark Grey', value: '#666666' },
  ],
  [
    { name: 'Light Grey', value: '#BBBBBB' },
    { name: 'Red', value: '#D90000' },
    { name: 'Orange', value: '#FF8000' },
    { name: 'Yellow', value: '#FFFF00' },
    { name: 'Green', value: '#00C45D' },
    { name: 'Cyan', value: '#03D5FF' },
    { name: 'Blue', value: '#0080FF' },
    { name: 'Purple', value: '#8000FF' },
    { name: 'Magenta', value: '#FF00FF' },
    { name: 'Black', value: '#101010' },
  ],
];

const save = async () => {
  if (!name.value.trim() || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await store.saveCookbook({ id: props.cookbook?.id, name: name.value.trim(), color: color.value, description: description.value.trim() });
    emit('close');
  } catch (err) {
    error.value = err.message || 'Unable to save cookbook.';
  } finally {
    saving.value = false;
  }
};

const remove = async (options) => {
  if (!props.cookbook?.id || deleting.value) return;
  showDeleteConfirmation.value = false;
  deleting.value = true;
  error.value = '';
  try {
    await store.deleteCookbook(props.cookbook.id, options);
    emit('close');
  } catch (err) {
    error.value = err.message || 'Unable to delete cookbook.';
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  nextTick(() => nameInput.value?.focus());
});
</script>
