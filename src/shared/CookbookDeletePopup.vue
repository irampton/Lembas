<template>
  <BasePopup aria-label="Delete cookbook" :buttons="['cancel', 'delete']" @close="$emit('close')" @delete="confirmDelete">
    <div class="space-y-5">
      <h2 class="text-3xl font-bold text-base-dark">Delete cookbook?</h2>
      <p>Are you sure you want to delete <strong>{{ cookbook.name }}</strong>?</p>

      <fieldset class="space-y-3">
        <legend class="mb-2 font-semibold text-base-dark">What should happen to its recipes?</legend>
        <label class="flex items-start gap-2">
          <input v-model="mode" type="radio" value="move" class="mt-1">
          <span class="grow">
            <span class="block">Move them to another cookbook</span>
            <BaseDropdown v-model="targetCookbookId" class="mt-2" aria-label="Destination cookbook" :disabled="mode !== 'move'">
              <option v-for="option in destinationCookbooks" :key="option.id" :value="option.id">{{ option.name }}</option>
            </BaseDropdown>
          </span>
        </label>
        <label class="flex items-center gap-2 text-error">
          <input v-model="mode" type="radio" value="delete">
          <span>Delete all recipes in this cookbook</span>
        </label>
      </fieldset>
    </div>
  </BasePopup>
</template>

<script setup>
import { ref } from 'vue';
import BaseDropdown from '../baseComponents/BaseDropdown.vue';
import BasePopup from '../baseComponents/BasePopup.vue';

const props = defineProps({
  cookbook: { type: Object, required: true },
  destinationCookbooks: { type: Array, required: true },
});

const emit = defineEmits(['close', 'confirm']);
const mode = ref('move');
const preferredDestination = props.destinationCookbooks.find((cookbook) => cookbook.isDefault) || props.destinationCookbooks[0];
const targetCookbookId = ref(preferredDestination?.id || '');

const confirmDelete = () => {
  emit('confirm', {
    deleteRecipes: mode.value === 'delete',
    targetCookbookId: mode.value === 'move' ? targetCookbookId.value : '',
  });
};
</script>
