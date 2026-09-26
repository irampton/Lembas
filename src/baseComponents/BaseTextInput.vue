<template>
  <input
    ref="input"
    :value="modelValue"
    :placeholder="placeholder"
    :type="type"
    :class="['w-full', baseInputClasses, { 'text-xl': xl }]"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
import { ref } from "vue";
import { baseInputClasses } from '../mixins/baseInputMixin.js';

const input = ref(null);

defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "text",
  },
  xl: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["update:modelValue"]);

defineExpose({
  focus: () => input.value?.focus(),
});
</script>
