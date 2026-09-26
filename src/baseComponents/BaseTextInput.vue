<template>
  <input
    :value="modelValue"
    :placeholder="placeholder"
    type="text"
    :class="['w-full', baseInputClasses, { 'text-xl': xl }]"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
import { baseInputClasses } from '../mixins/baseInputMixin.js';

defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  xl: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["update:modelValue"]);
</script>
