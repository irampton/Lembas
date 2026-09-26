<template>
  <div ref="root" :class="['relative', $attrs.class]">
    <input
      ref="input"
      v-bind="$attrs"
      :value="modelValue"
      type="text"
      role="combobox"
      autocomplete="off"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :aria-activedescendant="activeOptionId"
      :class="['w-full', baseInputClasses]"
      @focus="open"
      @input="onInput"
      @keydown.down.prevent="moveActive(1)"
      @keydown.up.prevent="moveActive(-1)"
      @keydown.enter.prevent="selectActive"
      @keydown.escape="close"
      @blur="onBlur"
    />
    <ul
      v-if="isOpen && filteredOptions.length"
      :id="listboxId"
      role="listbox"
      class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-accent-alt/20 bg-white py-1 text-base-dark shadow-lg"
    >
      <li
        v-for="(option, index) in filteredOptions"
        :id="optionId(index)"
        :key="option.value"
        role="option"
        :aria-selected="index === activeIndex"
        :class="[
          'cursor-pointer px-3 py-2',
          index === activeIndex ? 'bg-base-alt' : 'hover:bg-base-alt',
        ]"
        @mousedown.prevent="selectOption(option)"
        @mouseenter="activeIndex = index"
      >
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { baseInputClasses } from "../mixins/baseInputMixin.js";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue", "commit"]);
const root = ref(null);
const input = ref(null);
const isOpen = ref(false);
const activeIndex = ref(-1);
const suppressBlurCommit = ref(false);
const listboxId = `autocomplete-${Math.random().toString(36).slice(2)}`;

const filteredOptions = computed(() => {
  const query = props.modelValue.trim().toLowerCase();
  if (!query) return props.options;
  return props.options.filter((option) =>
    [option.label, option.value, ...(option.keywords || [])]
      .some((term) => term?.toString().toLowerCase().includes(query)),
  );
});

const activeOptionId = computed(() =>
  isOpen.value && activeIndex.value >= 0
    ? optionId(activeIndex.value)
    : undefined,
);

const optionId = (index) => `${listboxId}-option-${index}`;

const open = () => {
  isOpen.value = true;
  activeIndex.value = -1;
};

const close = () => {
  isOpen.value = false;
  activeIndex.value = -1;
};

const commit = () => {
  emit("commit", props.modelValue);
  close();
};

const onInput = (event) => {
  emit("update:modelValue", event.target.value);
  isOpen.value = true;
  activeIndex.value = -1;
};

const selectOption = (option) => {
  emit("update:modelValue", option.value);
  emit("commit", option.value);
  close();
  nextTick(() => input.value?.focus());
};

const moveActive = (direction) => {
  if (!isOpen.value) {
    open();
  }
  const count = filteredOptions.value.length;
  if (!count) return;
  activeIndex.value = (activeIndex.value + direction + count) % count;
};

const selectActive = () => {
  const option = filteredOptions.value[activeIndex.value];
  if (option) {
    selectOption(option);
  } else {
    commit();
  }
};

const onBlur = (event) => {
  if (suppressBlurCommit.value) {
    suppressBlurCommit.value = false;
    return;
  }
  if (!root.value?.contains(event.relatedTarget)) commit();
};

const onPointerDown = (event) => {
  if (isOpen.value && !root.value?.contains(event.target)) {
    suppressBlurCommit.value = true;
    commit();
    window.setTimeout(() => {
      suppressBlurCommit.value = false;
    }, 0);
  }
};

onMounted(() => document.addEventListener("pointerdown", onPointerDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onPointerDown));
</script>
