<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:flex-row lg:items-start">
    <SettingsSidebar />

    <section class="min-w-0 flex-1" aria-labelledby="friends-title">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 id="friends-title" class="text-3xl font-bold text-base-dark md:text-4xl">Friends</h1>
        <BaseButton colorType="cancel" class="self-start bg-base-alt text-sm shadow-sm sm:self-auto"
          :disabled="friendStore.state.loading" @click="refresh">
          <span class="flex items-center gap-2 mt-1">
            <ArrowPathIcon class="size-4" :class="friendStore.state.loading && 'animate-spin'" />
          </span>
        </BaseButton>
      </header>

      <p v-if="pageError" role="alert" class="mb-5 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{{ pageError }}
      </p>

      <div class="flex flex-col gap-4 md:flex-row md:items-start">
        <article class="h-min grow rounded-2xl bg-base-alt p-5 drop-shadow-lg md:p-6">
          <div class="mb-5 flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold">Add Friend</h2>
            <MagnifyingGlassIcon class="size-6 text-accent" />
          </div>
          <label for="friend-search" class="sr-only">Search by name</label>
          <BaseTextInput id="friend-search" v-model="searchQuery" type="search" inputmode="search"
            placeholder="Search by name" />
          <p v-if="searchError" role="alert" class="mt-3 text-sm text-red-700">{{ searchError }}</p>
          <p v-if="searchLoading" role="status" class="mt-4 text-sm text-light">Searching…</p>
          <p v-else-if="!searchResults.length && searchQuery.trim()"
            class="mt-4 rounded-xl bg-white/60 p-4 text-sm text-light">No users found.</p>
          <ul v-else-if="searchResults.length" class="mt-4 divide-y divide-accent-alt/15">
            <li v-for="user in searchResults" :key="user.id"
              class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div class="min-w-0">
                <p class="truncate text-lg font-bold">{{ user.displayName || user.username }}</p>
                <p class="truncate text-xs font-semibold lowercase tracking-wider text-light">{{ user.username }}</p>
              </div>
              <span v-if="user.isFriend"
                class="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">Friends</span>
              <div v-else-if="user.incomingRequest" class="flex gap-2">
                <button class="text-sm font-bold text-primary hover:underline disabled:opacity-50"
                  :disabled="actionBusy === user.id" @click="acceptIncoming(user.id)">Accept</button>
                <button class="text-sm font-semibold text-light hover:text-error disabled:opacity-50"
                  :disabled="actionBusy === user.id" @click="rejectIncoming(user.id)">Reject</button>
              </div>
              <span v-else-if="user.outgoingRequest"
                class="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">Pending</span>
              <BaseButton v-else class="shrink-0 text-sm" :disabled="actionBusy === user.id"
                @click="sendRequest(user.id)">Add friend</BaseButton>
            </li>
          </ul>
        </article>

        <article class="h-min grow rounded-2xl bg-base-alt p-5 drop-shadow-lg md:p-6">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold">Your friends</h2>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                {{ friends.length }} total
              </span>
              <span class="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                {{ incomingRequests.length }} pending
              </span>
            </div>
          </div>
          <p v-if="friendStore.state.loading && !friendStore.state.ready" role="status"
            class="py-6 text-center text-light">Loading friends…</p>
          <ul v-else-if="friends.length || incomingRequests.length" class="flex flex-col gap-3">
            <li v-for="friend in friends" :key="`friend-${friend.userId}`"
              class="flex items-center justify-between gap-3 rounded-xl bg-white/70 p-4">
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                  {{ friend.username.charAt(0).toUpperCase() }}</div>
                <div class="min-w-0">
                  <p class="truncate font-bold">{{ friend.displayName || friend.username }}</p>
                  <p class="truncate text-xs font-semibold lowercase tracking-wider text-light">{{ friend.username }}</p>
                </div>
              </div>
              <button type="button"
                class="rounded-lg px-2 py-1 text-sm font-semibold text-light hover:bg-red-50 hover:text-error disabled:opacity-50"
                :disabled="actionBusy === friend.userId" @click="remove(friend)">Remove</button>
            </li>
            <li v-for="request in incomingRequests" :key="`request-${request.id}`"
              class="flex items-center justify-between gap-3 rounded-xl bg-white/70 p-4">
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
                  {{ request.username.charAt(0).toUpperCase() }}</div>
                <div class="min-w-0">
                  <p class="truncate font-bold">{{ request.displayName || request.username }}</p>
                  <p class="truncate text-xs font-semibold lowercase tracking-wider text-light">{{ request.username }}</p>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <button type="button" class="text-sm font-bold text-primary hover:underline disabled:opacity-50"
                  :disabled="actionBusy === request.id" @click="accept(request.id)">Accept</button>
                <button type="button" class="text-sm font-semibold text-light hover:text-error disabled:opacity-50"
                  :disabled="actionBusy === request.id" @click="reject(request.id)">Reject</button>
              </div>
            </li>
          </ul>
          <div v-else class="rounded-xl bg-white/60 p-8 text-center">
            <UserGroupIcon class="mx-auto mb-3 size-9 text-accent" />
            <p class="font-bold">No friends yet</p>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ArrowPathIcon, MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/vue/24/outline';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseTextInput from '../../baseComponents/BaseTextInput.vue';
import SettingsSidebar from '../../shared/SettingsSidebar.vue';
import { useFriendStore } from '../../stores/friendStore.js';

const friendStore = useFriendStore();

const friends = computed(() => friendStore.state.friends || []);
const incomingRequests = computed(() => friendStore.state.incoming || []);
const outgoingRequests = computed(() => friendStore.state.outgoing || []);

const searchQuery = ref('');
const rawResults = ref([]);
const searchLoading = ref(false);
const searchError = ref(null);
const pageError = ref(null);
const actionBusy = ref(null);
let debounceId = null;

const mergedResults = computed(() =>
  rawResults.value.map((user) => {
    const isFriend = friends.value.some((f) => f.userId === user.id) || user.isFriend;
    const incomingRequest =
      incomingRequests.value.some((req) => req.fromUserId === user.id) || Boolean(user.incomingRequest);
    const outgoingRequest =
      outgoingRequests.value.some((req) => req.toUserId === user.id) || Boolean(user.outgoingRequest);
    return { ...user, isFriend, incomingRequest, outgoingRequest };
  })
);

const searchResults = computed(() => mergedResults.value.filter((user) => !user.isFriend));

const refresh = async () => {
  pageError.value = null;
  try {
    await friendStore.loadFriends(true);
    if (searchQuery.value.trim()) {
      await runSearch(searchQuery.value);
    }
  } catch (error) {
    pageError.value = error.message || 'Unable to refresh friends.';
  }
};

const runSearch = async (value) => {
  const query = value.trim();
  if (!query) {
    rawResults.value = [];
    searchError.value = null;
    return;
  }
  searchLoading.value = true;
  searchError.value = null;
  try {
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to search users.');
    rawResults.value = data.users || [];
  } catch (error) {
    searchError.value = error.message || 'Unable to search users.';
  } finally {
    searchLoading.value = false;
  }
};

watch(
  () => searchQuery.value,
  (value) => {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => runSearch(value), 200);
  }
);

const sendRequest = async (userId) => {
  pageError.value = null;
  actionBusy.value = userId;
  try {
    await friendStore.sendRequest(userId);
    await refresh();
  } catch (error) {
    pageError.value = error.message || 'Unable to send request.';
  } finally {
    actionBusy.value = null;
  }
};

const accept = async (requestId) => {
  pageError.value = null;
  actionBusy.value = requestId;
  try {
    await friendStore.acceptRequest(requestId);
    await refresh();
  } catch (error) {
    pageError.value = error.message || 'Unable to accept request.';
  } finally {
    actionBusy.value = null;
  }
};

const reject = async (requestId) => {
  pageError.value = null;
  actionBusy.value = requestId;
  try {
    await friendStore.rejectRequest(requestId);
    await refresh();
  } catch (error) {
    pageError.value = error.message || 'Unable to reject request.';
  } finally {
    actionBusy.value = null;
  }
};

const acceptIncoming = async (userId) => {
  const req = incomingRequests.value.find((r) => r.fromUserId === userId);
  if (!req) return;
  await accept(req.id);
};

const rejectIncoming = async (userId) => {
  const req = incomingRequests.value.find((r) => r.fromUserId === userId);
  if (!req) return;
  await reject(req.id);
};

const remove = async (friend) => {
  if (!friend) return;
  if (!window.confirm(`Remove ${friend.username} from your friends?`)) return;
  pageError.value = null;
  actionBusy.value = friend.userId;
  try {
    await friendStore.removeFriend(friend.userId);
    await refresh();
  } catch (error) {
    pageError.value = error.message || 'Unable to remove friend.';
  } finally {
    actionBusy.value = null;
  }
};

onMounted(() => {
  friendStore.loadFriends();
});
</script>
