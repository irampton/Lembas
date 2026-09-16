<template>
  <div>
    <p>Welcome back</p>
    <h1>Sign in to Lembas</h1>
    <form @submit.prevent="handleLogin">
      <div>
        <label for="username">Username</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          autocomplete="username"
          required
        />
      </div>
      <div>
        <label for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <p v-if="error">{{ error }}</p>
      <button
        :disabled="auth.state.loading"
        type="submit"
      >
        <span v-if="auth.state.loading">Signing in…</span>
        <span v-else>Sign in</span>
      </button>
    </form>
    <p>
      Need an account?
      <RouterLink :to="{ name: 'signup' }">Create one</RouterLink>
    </p>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/authStore.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const form = reactive({ username: '', password: '' });
const error = computed(() => auth.state.error);

const handleLogin = async () => {
  try {
    await auth.login({ username: form.username, password: form.password });
    const redirectTo = route.query.redirect || '/';
    router.push(redirectTo);
  } catch (err) {
    console.error(err);
  }
};
</script>
