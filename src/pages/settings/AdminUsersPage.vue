<template>
  <section>
    <div>
      <div>
        <p>Admin</p>
        <h1>Users</h1>
        <p>Manage users, roles, and issue join codes.</p>
      </div>
      <div>
        <label>
          Max uses
          <input
            v-model.number="state.maxUses"
            type="number"
            min="1"
            max="50"
          />
        </label>
        <label>
          Expires
          <input
            v-model="state.expiresAt"
            type="date"
          />
        </label>
        <button
          type="button"
          :disabled="state.loading"
          @click="loadData"
        >
          Refresh
        </button>
        <button
          type="button"
          :disabled="state.generating"
          @click="generateCode('user')"
        >
          New join code
        </button>
      </div>
    </div>

    <div>
      <div>
        <div>
          <p>Users</p>
          <span>{{ state.users.length }} total</span>
        </div>
        <div v-if="state.loading">Loading users…</div>
        <div v-else>
          <div
            v-for="user in state.users"
            :key="user.id"
          >
            <div>
              <p>{{ user.username }}</p>
              <p>{{ user.role }}</p>
            </div>
            <div>
              <select
                v-if="isOwner && user.role !== 'owner'"
                v-model="userRoles[user.id]"
                @change="updateRole(user.id, userRoles[user.id])"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                v-if="user.role !== 'owner'"
                type="button"
                @click="openDeleteDialog(user)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div>
          <p>Join codes</p>
          <span>Share with care</span>
        </div>
        <div v-if="state.loading">Loading codes…</div>
        <div v-else>
          <div
            v-for="code in state.joinCodes"
            :key="code.code"
          >
            <div>
              <p>{{ printableCode(code.code) }}</p>
              <p>{{ code.role }}</p>
            </div>
            <div>
              <div>
                <p>{{ code.usedCount }} / {{ code.maxUses }} used</p>
                <p v-if="code.expiresAt">Expires {{ formatDate(code.expiresAt) }}</p>
                <p v-else>Never expires</p>
              </div>
              <button
                type="button"
                @click="removeCode(code.code)"
              >
                Delete
              </button>
            </div>
          </div>
          <p v-if="!state.joinCodes.length">No codes yet.</p>
        </div>
      </div>
    </div>

    <p v-if="state.error">{{ state.error }}</p>

    <div v-if="deleteDialog.open">
      <p>Remove {{ deleteDialog.user?.username || 'this user' }}?</p>
      <p>This permanently removes their access.</p>
      <button type="button" @click="confirmRemove">Remove</button>
      <button type="button" @click="closeDeleteDialog">Cancel</button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
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
