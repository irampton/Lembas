<template>
  <section>
    <div>
      <p>Welcome</p>
      <h1>Meet Lembas</h1>
      <p>
        Tuck your family staples and fresh experiments into one cozy spot. Tap the + to start a new recipe, or jump into the
        list on the left to keep cooking.
      </p>
    </div>
    <div>
      <div>
        <div>
          <p>Ready to cook?</p>
          <p>Start a fresh recipe and keep it with the rest of your collection.</p>
        </div>
        <RouterLink
          :to="{ name: 'recipe-new' }"
        >
          <PlusIcon />
          Create recipe
        </RouterLink>
      </div>
    </div>
    <div>
      <div>
        <p>Quick tips</p>
        <ul>
          <li>Add a title, a few tags, and who you got it from.</li>
          <li>Keep ingredients and steps tidy so everyone can follow along.</li>
          <li>Save as you go - Lembas remembers where you left off.</li>
        </ul>
      </div>
      <div>
        <p>How it works</p>
        <p>
          Pick a recipe from the sidebar to read or edit it. Use the pencil to make changes, or the + button to start something
          new. Your collection stays sorted so favorites are always easy to find.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import { PlusIcon } from '@heroicons/vue/24/outline';
</script>
