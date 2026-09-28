<template>
  <BasePopup :aria-label="cookbook ? 'Edit cookbook' : 'New cookbook'" :buttons="popupButtons" :confirm-disabled="saving || !name.trim()" :confirm-label="saving ? 'Saving…' : 'Save'" @close="$emit('close')" @delete="showDeleteConfirmation = true" @confirm="save">
    <form class="space-y-5" @submit.prevent="save">
      <h2 class="text-3xl font-bold text-base-dark">{{ cookbook ? 'Edit cookbook' : 'New cookbook' }}</h2>
      <label class="block">
        <span class="mb-2 block font-semibold text-base-dark">Name</span>
        <BaseTextInput ref="nameInput" v-model="name" required />
      </label>
      <label class="block">
        <span class="mb-2 block font-semibold text-base-dark">Color</span>
        <div class="flex flex-col" role="radiogroup" aria-label="Cookbook color">
          <div class="flex flex-row" v-for="row in colorRows" :key="row[0].name">
            <button
              v-for="option in row"
              :key="option.value"
              type="button"
              role="radio"
              class="mx-0.5 my-px size-7 rounded-full border border-black/20 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :class="color === option.value ? 'ring-2 ring-primary ring-offset-2' : ''"
              :style="{ backgroundColor: option.value }"
              :aria-label="option.name"
              :aria-checked="color === option.value"
              @click="color = option.value"
            />
          </div>
        </div>
      </label>
      <label class="block">
        <span class="mb-2 block font-semibold text-base-dark">Description</span>
        <BaseTextArea v-model="description" rows="2" />
      </label>
      <section v-if="canShare" class="border-t border-primary-alt/20 pt-4" aria-labelledby="cookbook-sharing-heading">
        <h3 id="cookbook-sharing-heading" class="mb-2 font-semibold text-base-dark">Share with a friend</h3>
        <BaseLoadingSpinner v-if="!sharesLoaded" class="py-6" label="Loading sharing settings…" show-label />
        <template v-else>
          <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <BaseDropdown v-model="selectedFriendId" :options="friendOptions" placeholder="Choose friend" aria-label="Friend" />
            <BaseDropdown v-model="selectedAccessLevel" :options="accessOptions" aria-label="Permission" />
            <BaseButton :disabled="!selectedFriendId" @click="addFriendShare">Add</BaseButton>
          </div>
          <div v-if="userShares.length" class="mt-3 space-y-2">
            <div v-for="share in userShares" :key="share.userId" class="flex items-center gap-2 rounded-xl bg-base-alt p-2">
              <div class="min-w-0 grow truncate font-semibold">{{ share.username }}</div>
              <div>
                <BaseDropdown
                  :model-value="share.accessLevel || (share.canEdit ? 'cookbook' : 'view')"
                  :options="accessOptions"
                  :aria-label="`Permission for ${share.username}`"
                  @update:model-value="updateShare(share, $event)"
                />
              </div>
              <button type="button" class="rounded-full p-2 text-error hover:bg-white" :aria-label="`Stop sharing with ${share.username}`" @click="removeShare(share)">
                <TrashIcon class="size-5" />
              </button>
            </div>
          </div>
          <p v-else class="mt-3 text-sm text-light">Not shared with anyone yet.</p>
        </template>
      </section>
      <p v-if="error" class="text-sm text-red-700" role="alert">{{ error }}</p>
    </form>
  </BasePopup>
  <CookbookDeletePopup v-if="showDeleteConfirmation" :cookbook="cookbook" :destination-cookbooks="destinationCookbooks" @close="showDeleteConfirmation = false" @confirm="remove" />
  <BaseLoadingPopup v-if="deleting" label="Deleting cookbook…" />
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { TrashIcon } from '@heroicons/vue/24/outline';
import BaseButton from '../baseComponents/BaseButton.vue';
import BaseDropdown from '../baseComponents/BaseDropdown.vue';
import BasePopup from '../baseComponents/BasePopup.vue';
import BaseLoadingPopup from '../baseComponents/BaseLoadingPopup.vue';
import BaseLoadingSpinner from '../baseComponents/BaseLoadingSpinner.vue';
import BaseTextArea from '../baseComponents/BaseTextArea.vue';
import BaseTextInput from '../baseComponents/BaseTextInput.vue';
import { useRecipeStore } from '../stores/recipeStore';
import { useAuthStore } from '../stores/authStore';
import { useFriendStore } from '../stores/friendStore';
import CookbookDeletePopup from './CookbookDeletePopup.vue';

const props = defineProps({ cookbook: { type: Object, default: null } });
const emit = defineEmits(['close']);
const store = useRecipeStore();
const auth = useAuthStore();
const friendStore = useFriendStore();
const nameInput = ref(null);
const name = ref(props.cookbook?.name || '');
const color = ref(props.cookbook?.color || '#0080FF');
const description = ref(props.cookbook?.description || '');
const error = ref('');
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirmation = ref(false);
const userShares = ref([]);
const initialShares = ref([]);
const sharesLoaded = ref(false);
const selectedFriendId = ref('');
const selectedAccessLevel = ref('view');
const canDelete = computed(() => props.cookbook?.ownerId === auth.state.user?.id);
const canShare = computed(() => Boolean(props.cookbook?.id && canDelete.value));
const destinationCookbooks = computed(() => store.state.cookbooks.filter((item) => item.id !== props.cookbook?.id));
const popupButtons = computed(() => canDelete.value && destinationCookbooks.value.length
  ? ['cancel', 'delete', 'confirm']
  : ['cancel', 'confirm']);
const accessOptions = [
  { value: 'view', label: 'View' },
  { value: 'recipes', label: 'Edit Recipes' },
  { value: 'cookbook', label: 'Edit Cookbook' },
];
const friendOptions = computed(() => (friendStore.state.friends || [])
  .filter((friend) => !userShares.value.some((share) => share.userId === friend.userId))
  .map((friend) => ({ value: friend.userId, label: friend.displayName || friend.username })));
const colorRows = [
  [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Light red', value: '#FFABAB' },
    { name: 'Light orange', value: '#FFD5AB' },
    { name: 'Light yellow', value: '#FFFFAB' },
    { name: 'Light green', value: '#AAFFD3' },
    { name: 'Light cyan', value: '#ABF1FF' },
    { name: 'Light blue', value: '#ABD5FF' },
    { name: 'Light purple', value: '#D5ABFF' },
    { name: 'Light magenta', value: '#FFABFF' },
    { name: 'Dark Grey', value: '#666666' },
  ],
  [
    { name: 'Light Grey', value: '#BBBBBB' },
    { name: 'Red', value: '#D90000' },
    { name: 'Orange', value: '#FF8000' },
    { name: 'Yellow', value: '#FFFF00' },
    { name: 'Green', value: '#00C45D' },
    { name: 'Cyan', value: '#03D5FF' },
    { name: 'Blue', value: '#0080FF' },
    { name: 'Purple', value: '#8000FF' },
    { name: 'Magenta', value: '#FF00FF' },
    { name: 'Black', value: '#101010' },
  ],
];

const save = async () => {
  if (!name.value.trim() || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await store.saveCookbook({ id: props.cookbook?.id, name: name.value.trim(), color: color.value, description: description.value.trim() });
    if (canShare.value) await saveShares();
    emit('close');
  } catch (err) {
    error.value = err.message || 'Unable to save cookbook.';
  } finally {
    saving.value = false;
  }
};

const remove = async (options) => {
  if (!props.cookbook?.id || deleting.value) return;
  showDeleteConfirmation.value = false;
  deleting.value = true;
  error.value = '';
  try {
    await store.deleteCookbook(props.cookbook.id, options);
    emit('close');
  } catch (err) {
    error.value = err.message || 'Unable to delete cookbook.';
  } finally {
    deleting.value = false;
  }
};

const loadShares = async () => {
  if (!canShare.value) return;
  try {
    await friendStore.loadFriends();
    const res = await fetch(`/api/cookbooks/${props.cookbook.id}/shares`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to load sharing settings.');
    userShares.value = data.shares?.userShares || [];
    initialShares.value = userShares.value.map((share) => ({ ...share }));
  } catch (err) {
    error.value = err.message || 'Unable to load sharing settings.';
  } finally {
    sharesLoaded.value = true;
  }
};

const persistShare = async (userId, accessLevel) => {
    const res = await fetch(`/api/cookbooks/${props.cookbook.id}/share/user`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ userId, accessLevel }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to share cookbook.');
    return data.share;
};

const addFriendShare = () => {
  if (!selectedFriendId.value) return;
  const friend = friendStore.state.friends.find((item) => item.userId === selectedFriendId.value);
  userShares.value.push({
    userId: selectedFriendId.value,
    username: friend?.displayName || friend?.username || 'Friend',
    accessLevel: selectedAccessLevel.value,
  });
  selectedFriendId.value = '';
};
const updateShare = (share, accessLevel) => {
  share.accessLevel = accessLevel;
};
const removeShare = (share) => {
  userShares.value = userShares.value.filter((item) => item.userId !== share.userId);
};

const saveShares = async () => {
  const desiredIds = new Set(userShares.value.map((share) => share.userId));
  const removed = initialShares.value.filter((share) => !desiredIds.has(share.userId));
  await Promise.all(removed.map(async (share) => {
    const res = await fetch(`/api/cookbooks/${props.cookbook.id}/share/user/${share.userId}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to stop sharing cookbook.');
  }));
  await Promise.all(userShares.value.map((share) => persistShare(
    share.userId,
    share.accessLevel || (share.canEdit ? 'cookbook' : 'view'),
  )));
};

onMounted(() => {
  nextTick(() => nameInput.value?.focus());
  loadShares();
});
</script>
