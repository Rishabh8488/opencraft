<script setup lang="ts">
import {RouterLink, RouterView} from 'vue-router'
import { useThemeStore } from '@/stores/useThemeStore';
import { storeToRefs } from 'pinia';

const themeStore = useThemeStore();
const { isDarkMode } = storeToRefs(themeStore);
const { toggleDarkMode } = themeStore;
</script>

<template>
  <header class="border-b border-gray-300 py-4 px-4 fixed z-20 w-full bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700">
    <div class="flex w-full px-4 mx-auto justify-between items-center">
      <div class="flex items-center space-x-3">
        <div class="border-2 border-gray-200 shadow-sm px-2.5 rounded-lg py-1 text-gray-500 text-xl font-semibold dark:border-gray-700 dark:text-gray-200">
          <span
              class="text-sky-400">Open</span>Craft
        </div>
      </div>
      <nav class="flex space-x-5">
        <RouterLink class="text-gray-500 transition hover:text-gray-600 font-semibold dark:text-gray-300 dark:hover:text-gray-100" to="/">Home</RouterLink>
        <RouterLink class="text-gray-500 transition hover:text-gray-600 font-semibold dark:text-gray-300 dark:hover:text-gray-100" to="/about">About</RouterLink>
      </nav>

      <button
        @click="toggleDarkMode"
        class="absolute top-1/2 -translate-y-1/2 right-4 px-3 py-1 rounded-md text-sm font-medium transition-colors z-30"
        :class="isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'"
      >
        {{ isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode' }}
      </button>

    </div>
  </header>
  <div class="bg-gray-50 min-h-screen pt-24 px-4 dark:bg-black dark:text-gray-100">
    <div class="">
      <RouterView/>
    </div>
  </div>

</template>

<style scoped>
/* Keep your existing styles here */
</style>