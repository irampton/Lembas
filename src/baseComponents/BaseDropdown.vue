<template>
  <div ref="root" class="relative w-full" :class="$attrs.class" :style="$attrs.style">
    <button
      ref="trigger"
      v-bind="buttonAttrs"
      type="button"
      :disabled="disabled"
      :class="['flex w-full items-center justify-between gap-2 text-left', dropdownInputClasses, dropdownStyles[colorStyle], triggerClass]"
      :style="triggerStyle"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="min-w-0 grow truncate">
        <slot name="selected" :option="selectedOption">
          {{ selectedOption?.label || placeholder }}
        </slot>
      </span>
      <svg class="size-4 shrink-0 transition-transform" :class="{ 'rotate-180': isOpen }" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      :id="listboxId"
      ref="listbox"
      class="absolute right-0 z-50 mt-1 max-h-64 min-w-full overflow-y-auto rounded-2xl bg-base-alt p-2 text-base-dark drop-shadow-lg"
      role="listbox"
      :aria-label="buttonAttrs['aria-label']"
      tabindex="-1"
      @keydown="onListboxKeydown"
    >
      <button
        v-for="(option, index) in normalizedOptions"
        :id="`${listboxId}-option-${index}`"
        :key="option.key ?? index"
        type="button"
        class="block w-full rounded-xl p-1 text-left transition-[filter] hover:brightness-110 focus:outline-none"
        :class="{ 'brightness-110': index === highlightedIndex, 'opacity-40': option.disabled }"
        role="option"
        :aria-selected="valuesEqual(option.value, modelValue)"
        :disabled="option.disabled"
        :tabindex="index === highlightedIndex ? 0 : -1"
        @mouseenter="highlightedIndex = index"
        @click="selectOption(option)"
      >
        <slot name="option" :option="option" :selected="valuesEqual(option.value, modelValue)">
          <span class="block truncate px-2 py-1">{{ option.label }}</span>
        </slot>
      </button>
    </div>
  </div>
</template>

<script setup>
import { Fragment, computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, useId, useSlots, watch } from 'vue';
import { baseInputClasses } from '../mixins/baseInputMixin.js';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: [String, Number, Object], default: '' },
  options: { type: Array, default: null },
  colorStyle: {
    type: String,
    default: 'white',
    validator: (value) => ['white', 'primary', 'accent', 'transparent'].includes(value),
  },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Select an option' },
  triggerClass: { type: [String, Array, Object], default: '' },
  triggerStyle: { type: [String, Array, Object], default: null },
});

const emit = defineEmits(['update:modelValue', 'change']);
const attrs = useAttrs();
const slots = useSlots();
const root = ref(null);
const trigger = ref(null);
const listbox = ref(null);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const listboxId = `dropdown-${useId().replaceAll(':', '')}`;
const dropdownInputClasses = baseInputClasses.replace('bg-white', '');
const dropdownStyles = {
  white: 'bg-white',
  primary: 'bg-primary text-white',
  accent: 'bg-accent text-white',
  transparent: 'bg-transparent',
};

const buttonAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([key]) => !['class', 'style'].includes(key)),
));

const textFromNode = (node) => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join('');
  return node?.children ? textFromNode(node.children) : '';
};

const optionsFromNodes = (nodes, result = []) => {
  for (const node of nodes || []) {
    if (!node) continue;
    if (node.type === Fragment || Array.isArray(node.children)) {
      optionsFromNodes(node.children, result);
      continue;
    }
    if (node.type === 'option') {
      const label = textFromNode(node.children).trim();
      result.push({ value: node.props?.value ?? label, label, disabled: Boolean(node.props?.disabled), key: node.key });
    }
  }
  return result;
};

const normalizedOptions = computed(() => {
  if (props.options) {
    return props.options.map((option, index) => (
      typeof option === 'object' && option !== null
        ? { ...option, label: option.label ?? String(option.value ?? ''), key: option.key ?? option.value ?? index }
        : { value: option, label: String(option), key: option }
    ));
  }
  return optionsFromNodes(slots.default?.());
});

const valuesEqual = (left, right) => Object.is(left, right) || String(left ?? '') === String(right ?? '');
const selectedOption = computed(() => normalizedOptions.value.find((option) => valuesEqual(option.value, props.modelValue)));
const selectedIndex = computed(() => normalizedOptions.value.findIndex((option) => valuesEqual(option.value, props.modelValue)));

const focusHighlighted = () => nextTick(() => {
  document.getElementById(`${listboxId}-option-${highlightedIndex.value}`)?.focus();
});
const open = () => {
  if (props.disabled) return;
  isOpen.value = true;
  highlightedIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0;
  focusHighlighted();
};
const close = ({ focusTrigger = false } = {}) => {
  isOpen.value = false;
  if (focusTrigger) nextTick(() => trigger.value?.focus());
};
const toggle = () => (isOpen.value ? close() : open());
const selectOption = (option) => {
  if (!option || option.disabled) return;
  emit('update:modelValue', option.value);
  emit('change', option.value);
  close({ focusTrigger: true });
};
const moveHighlight = (direction) => {
  if (!normalizedOptions.value.length) return;
  let index = highlightedIndex.value;
  do {
    index = (index + direction + normalizedOptions.value.length) % normalizedOptions.value.length;
  } while (normalizedOptions.value[index]?.disabled && index !== highlightedIndex.value);
  highlightedIndex.value = index;
  focusHighlighted();
};
const onTriggerKeydown = (event) => {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
    event.preventDefault();
    open();
  }
};
const onListboxKeydown = (event) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectOption(normalizedOptions.value[highlightedIndex.value]);
  } else if (event.key === 'Escape' || event.key === 'Tab') {
    close({ focusTrigger: event.key === 'Escape' });
  }
};
const onDocumentPointerDown = (event) => {
  if (isOpen.value && !root.value?.contains(event.target)) close();
};

watch(() => props.disabled, (disabled) => disabled && close());
onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown));
</script>
