<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" @click.self="$emit('close')">
      <section class="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 pt-14 shadow-2xl" role="dialog" aria-modal="true" :aria-label="ariaLabel" @keydown.esc="$emit('close')">
        <button v-if="closable" ref="closeButton" type="button" class="absolute left-4 top-4 rounded-full p-1 text-light hover:bg-base-alt hover:text-base-dark" aria-label="Close" @click="$emit('close')">
          <XMarkIcon class="size-6" />
        </button>
        <slot />
        <div v-if="buttons.length" class="mt-6 flex justify-end gap-2">
          <BaseButton
            v-for="button in buttons"
            :key="button"
            :colorType="buttonType(button)"
            :disabled="button === 'confirm' ? confirmDisabled : button === 'delete' ? deleteDisabled : false"
            @click="$emit(button === 'cancel' ? 'close' : button)"
          >
            {{ button === 'confirm' ? confirmLabel : buttonLabel(button) }}
          </BaseButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import BaseButton from './BaseButton.vue';

defineProps({
  ariaLabel: { type: String, default: 'Popup' },
  closable: { type: Boolean, default: true },
  buttons: {
    type: Array,
    default: () => [],
    validator: (value) => value.every((button) => ['cancel', 'delete', 'confirm'].includes(button)),
  },
  confirmDisabled: { type: Boolean, default: false },
  deleteDisabled: { type: Boolean, default: false },
  confirmLabel: { type: String, default: 'Save' },
});

defineEmits(['close', 'delete', 'confirm']);
const closeButton = ref(null);
const buttonType = (button) => ({ cancel: 'cancel', delete: 'delete', confirm: 'submit' })[button];
const buttonLabel = (button) => button === 'confirm' ? 'Save' : `${button.charAt(0).toUpperCase()}${button.slice(1)}`;

onMounted(() => {
  nextTick(() => closeButton.value?.focus());
});
</script>
