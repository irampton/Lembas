<template>
  <main class="flex min-h-screen items-center justify-center p-4 md:p-6">
    <section class="w-full max-w-md rounded-2xl bg-base-alt p-6 drop-shadow-lg md:p-8" aria-labelledby="login-title">
      <h1 id="login-title" class="mb-6 text-4xl font-bold text-base-dark">Sign in</h1>
      <form class="space-y-5" @submit.prevent="handleLogin">
        <div>
          <label for="username" class="mb-1 block font-bold text-base-dark">Username</label>
          <BaseTextInput
            id="username"
            v-model="form.username"
            autocomplete="username"
            class="px-4 py-3"
            required
          />
        </div>
        <div>
          <label for="password" class="mb-1 block font-bold text-base-dark">Password</label>
          <BaseTextInput
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            class="px-4 py-3"
            required
          />
        </div>
        <p v-if="error" role="alert" class="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{{ error }}</p>
        <BaseButton
          :disabled="auth.state.loading"
          native-type="submit"
          class="h-auto w-full py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ auth.state.loading ? 'Signing in…' : 'Sign in' }}
        </BaseButton>
      </form>
      <p class="mt-6 text-center text-sm text-light">
        Need an account?
        <RouterLink :to="{ name: 'signup' }" class="font-semibold text-accent hover:text-accent-alt hover:underline">Create one</RouterLink>
      </p>
    </section>
  </main>
</template>

<script setup>
import { reactive, computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseTextInput from '../../baseComponents/BaseTextInput.vue';
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
