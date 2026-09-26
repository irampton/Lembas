<template>
  <div class="relative w-full">
    <textarea ref="textarea" v-bind="$attrs" :value="modelValue" :class="['w-full min-h-10 resize-none pr-7', baseInputClasses]" :style="textareaStyle" @input="handleInput" />
    <div class="absolute inset-x-2 bottom-0 h-4 cursor-ns-resize touch-none" aria-label="Resize text area" role="separator" @pointerdown="startResize" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { baseInputClasses } from '../mixins/baseInputMixin.js';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);
const textarea = ref(null);
const height = ref(null);
const textareaStyle = computed(() => height.value ? { height: `${height.value}px` } : undefined);

const autoResize = () => {
  if (!textarea.value) return;
  height.value = null;
  requestAnimationFrame(() => {
    if (textarea.value) height.value = Math.max(40, textarea.value.scrollHeight);
  });
};

const handleInput = (event) => {
  emit('update:modelValue', event.target.value);
  nextTick(autoResize);
};

const startResize = (event) => {
  const startY = event.clientY;
  const startHeight = textarea.value?.offsetHeight || 40;
  const resize = (moveEvent) => {
    height.value = Math.max(40, startHeight + moveEvent.clientY - startY);
  };
  const stopResize = () => {
    window.removeEventListener('pointermove', resize);
    window.removeEventListener('pointerup', stopResize);
  };

  event.preventDefault();
  window.addEventListener('pointermove', resize);
  window.addEventListener('pointerup', stopResize, { once: true });
};

onMounted(autoResize);
watch(() => props.modelValue, () => nextTick(autoResize));
</script>
