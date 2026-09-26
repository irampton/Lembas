<template>
  <main class="flex min-h-screen items-center justify-center p-4 md:p-6">
    <section class="w-full max-w-md rounded-2xl bg-base-alt p-6 drop-shadow-lg md:p-8" aria-labelledby="signup-title">
      <h1 id="signup-title" class="mb-6 text-4xl font-bold text-base-dark">Create an account</h1>
      <form class="space-y-5" @submit.prevent="handleSignup">
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
            minlength="8"
            autocomplete="new-password"
            class="px-4 py-3"
            required
          />
        </div>
        <div>
          <label for="confirm-password" class="mb-1 block font-bold text-base-dark">Confirm password</label>
          <BaseTextInput
            id="confirm-password"
            v-model="form.confirmPassword"
            type="password"
            minlength="8"
            autocomplete="new-password"
            class="px-4 py-3"
            required
          />
        </div>
        <div>
          <label for="joinCode" class="mb-1 block font-bold text-base-dark">Join code</label>
          <div class="relative">
            <BaseTextInput
              id="joinCode"
              ref="joinInput"
              v-model="rawJoinCode"
              autocomplete="off"
              spellcheck="false"
              class="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
              aria-describedby="join-code-format"
            />
            <div
              class="flex justify-center gap-2 rounded-xl border border-light/40 bg-white px-3 py-3 font-mono text-xl font-bold tracking-wide text-base-dark transition focus-within:border-accent"
              @click="focusJoinInput"
            >
              <template v-for="(char, idx) in 7" :key="idx">
                <span class="inline-flex size-7 items-center justify-center border-b-2 border-accent">
                  {{ codeChars[idx] || '' }}
                </span>
                <span v-if="idx === 3" class="text-light">-</span>
              </template>
            </div>
          </div>
          <span id="join-code-format" class="sr-only">Seven letters or numbers</span>
        </div>
        <p v-if="displayError" role="alert" class="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{{ displayError }}</p>
        <BaseButton
          :disabled="auth.state.loading"
          native-type="submit"
          colorType="action"
          class="h-auto w-full py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ auth.state.loading ? 'Creating account…' : 'Sign up' }}
        </BaseButton>
      </form>
      <p class="mt-6 text-center text-sm text-light">
        Already have an account?
        <RouterLink :to="{ name: 'login' }" class="font-semibold text-accent hover:text-accent-alt hover:underline">Sign in</RouterLink>
      </p>
    </section>
  </main>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseTextInput from '../../baseComponents/BaseTextInput.vue';
import { useAuthStore } from '../../stores/authStore.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const form = reactive({ username: '', password: '', confirmPassword: '', joinCode: '' });
const rawJoinCode = ref('');
const joinInput = ref(null);
const validationError = ref('');
const error = computed(() => auth.state.error);
const displayError = computed(() => validationError.value || error.value);

const normalizedJoin = computed(() => rawJoinCode.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7));
const codeChars = computed(() => normalizedJoin.value.split(''));

watch(
  normalizedJoin,
  (val) => {
    form.joinCode = val;
  },
  { immediate: true }
);

const focusJoinInput = () => {
  joinInput.value?.focus();
};

const handleSignup = async () => {
  validationError.value = '';
  if (form.password !== form.confirmPassword) {
    validationError.value = 'Passwords do not match.';
    return;
  }

  try {
    await auth.signup({ username: form.username, password: form.password, joinCode: normalizedJoin.value });
    const redirectTo = route.query.redirect || '/';
    router.push(redirectTo);
  } catch (err) {
    console.error(err);
  }
};
</script>
