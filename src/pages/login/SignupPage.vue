<template>
  <div>
    <p>Join Lembas</p>
    <h1>Create your account</h1>
    <form @submit.prevent="handleSignup">
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
          minlength="8"
          autocomplete="new-password"
          required
        />
      </div>
      <div>
        <label for="joinCode">Join code</label>
        <div>
          <input
            id="joinCode"
            ref="joinInput"
            :value="rawJoinCode"
            type="text"
            autocomplete="off"
            spellcheck="false"
            @input="handleJoinInput"
            @paste="handleJoinInput"
          />
          <div
            @click="focusJoinInput"
          >
            <template v-for="(char, idx) in 7" :key="idx">
              <span>
                {{ codeChars[idx] || '' }}
              </span>
              <span v-if="idx === 3">-</span>
            </template>
          </div>
        </div>
        <p>Paste or type your invite (7 letters/numbers).</p>
      </div>
      <p v-if="error">{{ error }}</p>
      <button
        :disabled="auth.state.loading"
        type="submit"
      >
        <span v-if="auth.state.loading">Creating account…</span>
        <span v-else>Sign up</span>
      </button>
    </form>
    <p>
      Already have an account?
      <RouterLink :to="{ name: 'login' }">Sign in</RouterLink>
    </p>
  </div>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/authStore.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const form = reactive({ username: '', password: '', joinCode: '' });
const rawJoinCode = ref('');
const joinInput = ref(null);
const error = computed(() => auth.state.error);

const normalizedJoin = computed(() => rawJoinCode.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7));
const codeChars = computed(() => normalizedJoin.value.split(''));

watch(
  normalizedJoin,
  (val) => {
    form.joinCode = val;
  },
  { immediate: true }
);

const handleJoinInput = (event) => {
  rawJoinCode.value = event.target.value || '';
};

const focusJoinInput = () => {
  joinInput.value?.focus();
};

const handleSignup = async () => {
  try {
    await auth.signup({ username: form.username, password: form.password, joinCode: normalizedJoin.value });
    const redirectTo = route.query.redirect || '/';
    router.push(redirectTo);
  } catch (err) {
    console.error(err);
  }
};
</script>
