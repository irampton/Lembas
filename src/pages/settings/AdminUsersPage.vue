<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 lg:p-6 lg:flex-row lg:items-start">
    <SettingsSidebar />
    <section class="min-w-0 flex-1" aria-labelledby="users-title">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
         <div>
            <div class="text-accent text-md font-bold uppercase">Admin</div>
            <div class="text-3xl font-bold lg:text-4xl">Users</div>
        </div>
        <BaseButton
          colorType="cancel" 
          class="self-start bg-base-alt text-sm shadow-sm sm:self-auto"
          :disabled="state.loading" 
          @click="loadData">
          <span class="flex items-center gap-2 mt-1">
            <ArrowPathIcon class="size-4" :class="state.loading && 'animate-spin'" />
          </span>
        </BaseButton>
      </header>
      <p v-if="state.error" role="alert" class="mb-5 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{{
        state.error }}</p>

      <article class="mb-5 rounded-2xl bg-base-alt p-5 drop-shadow-lg lg:p-6">
        <div class="mb-5 flex items-start gap-3">
          <div>
            <h2 class="text-xl font-bold">Create Join Code</h2>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label class="block"><span class="mb-1 block text-sm font-bold">Maximum uses</span>
            <BaseNumberInput v-model.number="state.maxUses" min="1" max="50" />
          </label>
          <label class="block"><span class="mb-1 block text-sm font-bold">Expiration date <span
                class="font-normal text-light">(optional)</span></span>
            <BaseTextInput v-model="state.expiresAt" type="date" />
          </label>
          <BaseButton :disabled="state.generating" @click="generateCode('user')"><span
              class="flex items-center justify-center gap-2">
              <PlusIcon class="size-5" />{{ state.generating ? 'Creating…' : 'Create code' }}
            </span></BaseButton>
        </div>
      </article>

      <div class="grid gap-5 xl:grid-cols-2">
        <article class="overflow-hidden rounded-2xl bg-base-alt drop-shadow-lg">
          <div class="flex items-center justify-between gap-3 p-5 pb-4 lg:px-6">
            <div>
              <h2 class="text-xl font-bold">Members</h2>
            </div>
            <span class="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              {{ state.users.length }} total
              </span>
          </div>
          <p v-if="state.loading" role="status" class="px-6 py-8 text-center text-light">Loading users…</p>
          <ul v-else-if="state.users.length" class="divide-y divide-accent-alt/15 border-t border-accent-alt/15">
            <li v-for="user in state.users" :key="user.id"
              class="flex items-center justify-between gap-3 bg-white/30 px-5 py-4 lg:px-6">
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
                  {{ user.username.charAt(0).toUpperCase() }}</div>
                <div class="min-w-0">
                  <p class="truncate font-bold">{{ user.username }}</p>
                  <p class="text-xs capitalize text-light">{{ user.role }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <BaseDropdown v-if="isOwner && user.role !== 'owner'" v-model="userRoles[user.id]"
                  class="min-w-24 text-sm capitalize" @change="updateRole(user.id, userRoles[user.id])">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </BaseDropdown>
                <span v-else-if="user.role === 'owner'"
                  class="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">Owner</span>
                <button v-if="user.role !== 'owner'" type="button"
                  class="rounded-lg p-2 text-light hover:bg-red-50 hover:text-error"
                  :aria-label="`Remove ${user.username}`" @click="openDeleteDialog(user)">
                  <TrashIcon class="size-5" />
                </button>
              </div>
            </li>
          </ul>
          <p v-else class="px-6 py-8 text-center text-light">No users found.</p>
        </article>

        <article class="overflow-hidden rounded-2xl bg-base-alt drop-shadow-lg">
          <div class="flex items-center justify-between gap-3 p-5 pb-4 lg:px-6">
            <div>
              <h2 class="text-xl font-bold">Active Join Codes</h2>
            </div>
          </div>
          <p v-if="state.loading" role="status" class="px-6 py-8 text-center text-light">Loading codes…</p>
          <ul v-else-if="state.joinCodes.length" class="divide-y divide-accent-alt/15 border-t border-accent-alt/15">
            <li v-for="code in state.joinCodes" :key="code.code"
              class="flex items-center justify-between gap-3 bg-white/30 px-5 py-4 lg:px-6">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><button type="button"
                    class="rounded px-1 font-bold tracking-wider text-base-dark hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    :aria-label="`${state.copiedCode === code.code ? 'Copied' : 'Copy'} join code ${printableCode(code.code)}`"
                    :title="state.copiedCode === code.code ? 'Copied' : 'Copy join code'" @click="copyJoinCode(code.code)"><code>{{ printableCode(code.code) }}</code><span
                      v-if="state.copiedCode === code.code" class="ml-1 text-xs font-normal text-primary">Copied</span></button><span
                    class="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold capitalize text-primary">{{
                    code.role }}</span></div>
                <p class="mt-1 text-xs text-light">{{ code.usedCount }} / {{ code.maxUses }} used · {{ code.expiresAt ?
                  `Expires ${formatDate(code.expiresAt)}` : 'Never expires' }}</p>
              </div>
              <button type="button" class="rounded-lg p-2 text-light hover:bg-red-50 hover:text-error"
                :aria-label="`Delete join code ${printableCode(code.code)}`" @click="removeCode(code.code)">
                <TrashIcon class="size-5" />
              </button>
            </li>
          </ul>
          <div v-else class="px-6 py-10 text-center">
            <p class="font-semibold">No active codes</p>
          </div>
        </article>
      </div>
    </section>

    <BasePopup v-if="deleteDialog.open" aria-label="Remove user" :buttons="['cancel', 'delete']"
      :delete-disabled="deleteDialog.deleting" @close="closeDeleteDialog" @delete="confirmRemove">
      <div class="text-center">
        <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 text-error">
          <TrashIcon class="size-6" />
        </div>
        <h2 class="text-xl font-bold">Remove {{ deleteDialog.user?.username || 'this user' }}?</h2>
        <p class="mt-2 text-light">This permanently removes their access to this server.</p>
      </div>
    </BasePopup>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { ArrowPathIcon, PlusIcon, TicketIcon, TrashIcon } from '@heroicons/vue/24/outline';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseDropdown from '../../baseComponents/BaseDropdown.vue';
import BaseNumberInput from '../../baseComponents/BaseNumberInput.vue';
import BasePopup from '../../baseComponents/BasePopup.vue';
import BaseTextInput from '../../baseComponents/BaseTextInput.vue';
import SettingsSidebar from '../../shared/SettingsSidebar.vue';
import { useAuthStore } from '../../stores/authStore';

const auth = useAuthStore();
const state = reactive({
  users: [],
  joinCodes: [],
  userRoles: {},
  maxUses: 1,
  expiresAt: '',
  loading: false,
  generating: false,
  copiedCode: '',
  error: null,
});

const userRoles = state.userRoles;
const isOwner = computed(() => auth.isOwner());
const deleteDialog = reactive({
  open: false,
  user: null,
  deleting: false,
});

const loadData = async () => {
  state.loading = true;
  state.error = null;
  try {
    const [usersRes, codesRes] = await Promise.all([
      fetch('/api/users', { credentials: 'include' }),
      fetch('/api/join-codes', { credentials: 'include' }),
    ]);
    const usersData = await usersRes.json();
    const codesData = await codesRes.json();
    if (!usersRes.ok || !usersData.success) throw new Error(usersData?.error || 'Unable to load users.');
    if (!codesRes.ok || !codesData.success) throw new Error(codesData?.error || 'Unable to load join codes.');
    state.users = usersData.users || [];
    state.joinCodes = codesData.joinCodes || [];
    state.users.forEach((u) => {
      userRoles[u.id] = u.role;
    });
  } catch (error) {
    state.error = error.message || 'Unable to load admin data.';
  } finally {
    state.loading = false;
  }
};

const generateCode = async (role) => {
  state.generating = true;
  state.error = null;
  try {
    const res = await fetch('/api/join-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role, expiresAt: state.expiresAt || null, maxUses: state.maxUses || 1 }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to create join code.');
    state.joinCodes.unshift({
      code: data.code,
      role,
      usedBy: null,
      usedCount: 0,
      maxUses: state.maxUses || 1,
      expiresAt: state.expiresAt || null,
    });
  } catch (error) {
    state.error = error.message || 'Unable to create join code.';
  } finally {
    state.generating = false;
  }
};

const openDeleteDialog = (user) => {
  deleteDialog.user = user;
  deleteDialog.open = true;
  state.error = null;
};

const closeDeleteDialog = () => {
  deleteDialog.open = false;
  deleteDialog.user = null;
};

const confirmRemove = async () => {
  if (!deleteDialog.user || deleteDialog.deleting) return;
  deleteDialog.deleting = true;
  try {
    const res = await fetch(`/api/users/${deleteDialog.user.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to remove user.');
    state.users = state.users.filter((u) => u.id !== deleteDialog.user.id);
    closeDeleteDialog();
  } catch (error) {
    state.error = error.message || 'Unable to remove user.';
  } finally {
    deleteDialog.deleting = false;
  }
};

const updateRole = async (id, role) => {
  if (!isOwner.value) return;
  try {
    const res = await fetch(`/api/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to update role.');
  } catch (error) {
    state.error = error.message || 'Unable to update role.';
  }
};

onMounted(() => {
  loadData();
});

const printableCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;
const formatDate = (value) => new Date(value).toLocaleDateString();

const copyJoinCode = async (code) => {
  const value = printableCode(code);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const input = document.createElement('textarea');
      input.value = value;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      if (!copied) throw new Error('Clipboard access is unavailable.');
    }
    state.copiedCode = code;
    window.setTimeout(() => {
      if (state.copiedCode === code) state.copiedCode = '';
    }, 2000);
  } catch (error) {
    state.error = error.message || 'Unable to copy join code.';
  }
};

const removeCode = async (code) => {
  if (!window.confirm('Delete this code?')) return;
  try {
    const res = await fetch(`/api/join-codes/${code}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to delete code.');
    state.joinCodes = state.joinCodes.filter((c) => c.code !== code);
  } catch (error) {
    state.error = error.message || 'Unable to delete code.';
  }
};
</script>
