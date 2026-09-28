<template>
  <div
    class="inline-flex rounded-full bg-gray-200 p-1"
    :class="$attrs.class"
    role="radiogroup"
    :aria-label="ariaLabel"
    @keydown="onKeydown"
  >
    <button
      v-for="option in options"
      :key="option.value"
      :ref="(element) => setButtonRef(option.value, element)"
      type="button"
      role="radio"
      class="h-8 rounded-full px-3 font-semibold transition-colors disabled:opacity-40"
      :class="option.value === modelValue ? selectedClasses[colorType] : 'text-base-dark hover:bg-white/70'"
      :aria-checked="option.value === modelValue"
      :tabindex="option.value === modelValue ? 0 : -1"
      :disabled="disabled"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  colorType: {
    type: String,
    default: 'action',
    validator: (value) => ['action', 'submit', 'cancel', 'cancelAlt', 'delete'].includes(value),
  },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Options' },
});

const emit = defineEmits(['update:modelValue', 'change']);
const buttonRefs = new Map();
const selectedClasses = {
  action: 'bg-primary text-white shadow-sm',
  submit: 'bg-accent text-white shadow-sm',
  cancel: 'bg-base-alt text-black shadow-sm',
  cancelAlt: 'bg-white text-black shadow-sm',
  delete: 'bg-error text-white shadow-sm',
};

const setButtonRef = (value, element) => {
  if (element) buttonRefs.set(value, element);
  else buttonRefs.delete(value);
};
const select = (value) => {
  if (props.disabled || value === props.modelValue) return;
  emit('update:modelValue', value);
  emit('change', value);
};
const onKeydown = (event) => {
  if (props.disabled || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const currentIndex = Math.max(0, props.options.findIndex((option) => option.value === props.modelValue));
  let nextIndex = currentIndex;
  if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = props.options.length - 1;
  else {
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    nextIndex = (currentIndex + direction + props.options.length) % props.options.length;
  }
  const value = props.options[nextIndex]?.value;
  select(value);
  buttonRefs.get(value)?.focus();
};
</script>
