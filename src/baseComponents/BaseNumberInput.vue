<template>
  <input
    :value="modelValue"
    :placeholder="placeholder"
    type="number"
    :class="['w-full', baseInputClasses]"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
import { baseInputClasses } from '../mixins/baseInputMixin.js';

defineProps({
  modelValue: {
    type: [Number, String],
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
});

defineEmits(["update:modelValue"]);
</script>
