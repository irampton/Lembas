<template>
  <select
    :value="modelValue"
    :class="['w-full', dropdownInputClasses, dropdownStyles[colorStyle]]"
    @change="updateValue"
  >
    <slot />
  </select>
</template>

<script setup>
import { baseInputClasses } from '../mixins/baseInputMixin.js';

defineProps({
  modelValue: {
    type: [String, Number, Object],
    default: '',
  },
  colorStyle: {
    type: String,
    default: 'white',
    validator: (value) =>
      ['white', 'primary', 'accent', 'transparent'].includes(value),
  },
});

const dropdownInputClasses = baseInputClasses.replace('bg-white', '');
const dropdownStyles = {
  white: 'bg-white',
  primary: 'bg-primary text-white',
  accent: 'bg-accent text-white',
  transparent: 'bg-transparent',
};

const emit = defineEmits(['update:modelValue']);

const updateValue = (event) => {
  const option = event.target.selectedOptions[0];
  emit('update:modelValue', option?._value ?? event.target.value);
};
</script>
