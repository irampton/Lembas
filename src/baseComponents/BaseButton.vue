<template>
  <button :type="nativeType" :class="buttonClasses">
    <div class="-mt-1">
      <slot />
    </div>
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  colorType: {
    type: String,
    default: "action",
    validator: (value) => ["action", "submit", "cancel"].includes(value),
  },
  nativeType: {
    type: String,
    default: "button",
  },
});

const buttonClasses = computed(() => {
  const typeClasses = {
    action: "bg-primary text-white hover:bg-primary/80",
    submit: "bg-accent text-white hover:bg-accent-alt",
    cancel: "text-black hover:bg-base-alt",
  };

  return [
    "rounded-full px-4 py-2 font-semibold transition-colors h-10",
    typeClasses[props.colorType],
  ];
});
</script>
