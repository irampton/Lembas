<template>
  <div class="relative" data-user-autocomplete>
    <div class="flex items-center gap-2" @click="handleWrapperClick">
      <input
        v-model="query"
        type="text"
        class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100"
        :placeholder="placeholder"
        @focus="open = true"
        @keydown.down.prevent="highlight(+1)"
        @keydown.up.prevent="highlight(-1)"
        @keydown.enter.prevent="selectHighlighted"
      />
      <button
        v-if="dropdown"
        type="button"
        class="text-slate-400 hover:text-orange-600"
        @click="open = !open"
        aria-label="Toggle options"
      >
        ▾
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="text-xs font-semibold text-slate-500 hover:text-rose-600"
        @click="clearSelection"
      >
        Clear
      </button>
    </div>
    <div v-if="shouldShowResults" class="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      <button
        v-for="(option, idx) in results"
        :key="option.id"
        type="button"
        class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition hover:bg-orange-50"
        :class="{ 'bg-orange-50': idx === highlighted }"
        @click="select(option)"
      >
        <div class="flex flex-col">
          <span class="font-semibold text-slate-800">{{ getLabel(option) }}</span>
          <span v-if="getSecondary(option)" class="text-xs text-slate-500">{{ getSecondary(option) }}</span>
        </div>
      </button>
    </div>
    <p v-if="modelValue" class="mt-1 text-xs text-slate-600">
      Selected: <span class="font-semibold text-slate-800">{{ getLabel(modelValue) }}</span>
    </p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  friendsOnly: {
    type: Boolean,
    default: false,
  },
  dropdown: {
    type: Boolean,
    default: false,
  },
  items: {
    type: Array,
    default: null,
  },
  placeholder: {
    type: String,
    default: 'Search by username',
  },
  labelKey: {
    type: String,
    default: 'username',
  },
  secondaryKey: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const query = ref('');
const results = ref([]);
const open = ref(false);
const highlighted = ref(-1);
let debounceId = null;

const isStatic = computed(() => Array.isArray(props.items));

const getLabel = (item) => (item?.[props.labelKey] ? item[props.labelKey] : item?.username || item?.name || '');
const getSecondary = (item) => (props.secondaryKey && item?.[props.secondaryKey]) || item?.ownerUsername || '';

const shouldShowResults = computed(() => (props.dropdown ? true : open.value) && results.value.length > 0);

const searchStatic = (value) => {
  const term = (value || '').trim().toLowerCase();
  const source = props.items || [];
  if (!term) {
    results.value = [...source];
  } else {
    results.value = source.filter((item) => {
      const label = getLabel(item).toLowerCase();
      const secondary = (getSecondary(item) || '').toLowerCase();
      return label.includes(term) || secondary.includes(term);
    });
  }
  highlighted.value = results.value.length ? 0 : -1;
};

const fetchUsers = async (value) => {
  if (!value || !value.trim()) {
    results.value = [];
    return;
  }
  try {
    const scope = props.friendsOnly ? '&scope=friends' : '';
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(value.trim())}${scope}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok && data.success) {
      results.value = data.users || [];
      highlighted.value = results.value.length ? 0 : -1;
    } else {
      results.value = [];
    }
  } catch {
    results.value = [];
  }
};

watch(
  () => query.value,
  (value) => {
    if (debounceId) clearTimeout(debounceId);
    if (isStatic.value) {
      debounceId = setTimeout(() => searchStatic(value), 100);
    } else {
      debounceId = setTimeout(() => fetchUsers(value), 200);
    }
  }
);

watch(
  () => props.items,
  () => {
    if (isStatic.value) searchStatic(query.value);
  },
  { immediate: true }
);

const select = (option) => {
  emit('update:modelValue', option);
  query.value = getLabel(option);
  open.value = !props.dropdown;
};

const clearSelection = () => {
  emit('update:modelValue', null);
  query.value = '';
  results.value = [];
};

const highlight = (delta) => {
  if (!results.value.length) return;
  highlighted.value = (highlighted.value + delta + results.value.length) % results.value.length;
};

const selectHighlighted = () => {
  if (highlighted.value >= 0 && highlighted.value < results.value.length) {
    select(results.value[highlighted.value]);
  }
};

const handleWrapperClick = () => {
  if (props.dropdown) {
    open.value = true;
    if (isStatic.value) searchStatic(query.value);
  }
};

const handleClick = (event) => {
  if (!(event.target.closest && event.target.closest('[data-user-autocomplete]'))) {
    open.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClick);
  if (isStatic.value) {
    searchStatic('');
  }
  if (props.dropdown && isStatic.value) {
    open.value = true;
  }
});

onBeforeUnmount(() => {
  if (debounceId) clearTimeout(debounceId);
  document.removeEventListener('click', handleClick);
});
</script>
