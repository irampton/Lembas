<template>
  <div class="relative" data-cookbook-select>
    <div class="flex items-center gap-2" @click="openList">
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100"
        :placeholder="placeholder"
        :disabled="disabled"
        @focus="openList"
        @keydown.down.prevent="highlight(+1)"
        @keydown.up.prevent="highlight(-1)"
        @keydown.enter.prevent="selectHighlighted"
      />
      <button
        type="button"
        class="text-slate-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled"
        @click.stop="toggleList"
        aria-label="Toggle list"
      >
        ▾
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="text-xs font-semibold text-slate-500 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled"
        @click.stop="clearSelection"
      >
        Clear
      </button>
    </div>
    <div v-if="open && filteredItems.length" class="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      <button
        v-for="(item, idx) in filteredItems"
        :key="item.id"
        type="button"
        class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition hover:bg-orange-50"
        :class="{ 'bg-orange-50': idx === highlighted }"
        @click="select(item)"
      >
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: item.color || '#fb923c' }"></span>
          <span class="font-semibold text-slate-800">{{ item.name }}</span>
        </div>
        <span class="text-xs text-slate-500">{{ item.ownerUsername || 'You' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  items: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Choose a cookbook',
  },
});

const emit = defineEmits(['update:modelValue']);

const query = ref('');
const open = ref(false);
const highlighted = ref(-1);
const inputRef = ref(null);

const filteredItems = computed(() => {
  const term = query.value.trim().toLowerCase();
  const list = props.items || [];
  if (!term) return list;
  return list.filter((item) => {
    const name = (item.name || '').toLowerCase();
    const owner = (item.ownerUsername || '').toLowerCase();
    return name.includes(term) || owner.includes(term);
  });
});

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      query.value = val.name || '';
    }
  },
  { immediate: true }
);

watch(
  () => props.items,
  () => {
    if (!props.modelValue && props.items?.length && !query.value) {
      query.value = props.items[0].name || '';
    }
  }
);

const select = (item) => {
  if (props.disabled) return;
  emit('update:modelValue', item);
  query.value = item?.name || '';
  open.value = false;
};

const clearSelection = () => {
  emit('update:modelValue', null);
  query.value = '';
  highlighted.value = -1;
};

const highlight = (delta) => {
  if (props.disabled || !filteredItems.value.length) return;
  highlighted.value = (highlighted.value + delta + filteredItems.value.length) % filteredItems.value.length;
};

const selectHighlighted = () => {
  if (highlighted.value >= 0 && highlighted.value < filteredItems.value.length) {
    select(filteredItems.value[highlighted.value]);
  }
};

const openList = () => {
  if (props.disabled) return;
  open.value = true;
  highlighted.value = filteredItems.value.length ? 0 : -1;
};

const toggleList = () => {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value && inputRef.value) {
    inputRef.value.focus();
    if (!query.value) {
      highlighted.value = filteredItems.value.length ? 0 : -1;
    }
  }
};

const handleClickOutside = (event) => {
  if (!(event.target.closest && event.target.closest('[data-cookbook-select]'))) {
    open.value = false;
    if (props.modelValue) {
      query.value = props.modelValue.name || '';
    }
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
