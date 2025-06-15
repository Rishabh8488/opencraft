// src/stores/useThemeStore.ts

import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core'; // This is a useful library for local storage integration
import { watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  // Use localStorage to persist the dark mode state.
  // 'opencraft/darkMode' is the key in localStorage.
  // `false` is the default value if no setting is found.
  const isDarkMode = useLocalStorage('opencraft/darkMode', false);

  // 'watch' is a Vue function that observes a reactive property (isDarkMode.value)
  // and runs a callback function whenever it changes.
  watch(isDarkMode, (newValue) => {
    if (newValue) {
      // If dark mode is true, add the 'dark' class to the HTML root element.
      document.documentElement.classList.add('dark');
    } else {
      // If dark mode is false, remove the 'dark' class from the HTML root element.
      document.documentElement.classList.remove('dark');
    }
  }, { immediate: true }); // `immediate: true` means the watcher runs once immediately after component setup
                           // to apply the initial theme based on localStorage.

  // This function will be called by your toggle button to switch the theme.
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value; // Toggles the boolean value
  }

  // Return the state and actions that other components can use.
  return {
    isDarkMode, // The reactive state for dark mode status
    toggleDarkMode, // The function to change the dark mode status
  };
});