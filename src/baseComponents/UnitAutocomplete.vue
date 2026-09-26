<template>
  <BaseAutocomplete
    :model-value="modelValue"
    :options="unitOptions"
    @update:model-value="$emit('update:modelValue', $event)"
    @commit="normalize"
  />
</template>

<script setup>
import BaseAutocomplete from "./BaseAutocomplete.vue";
import { UNITS } from "../mixins/units.js";

defineProps({
  modelValue: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

const unitOptions = UNITS.map((unit) => ({
  label: unit.name,
  value: unit.name,
  keywords: [unit.abbreviation],
}));

const normalize = (value) => {
  const lowered = value.trim().toLowerCase();
  const match = UNITS.find((unit) =>
    [unit.name, unit.abbreviation]
      .some((candidate) => candidate.toLowerCase() === lowered),
  );
  emit("update:modelValue", match?.name || value);
};
</script>
