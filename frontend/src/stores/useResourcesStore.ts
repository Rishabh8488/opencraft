// src/stores/useResourcesStore.ts
import { defineStore } from 'pinia';
import { ref, watch } from 'vue'; // Import 'watch'

interface Resource {
  title: string;
}

const STORAGE_KEY = 'chemcraft_resources'; // Define a unique key for localStorage

export const useResourcesStore = defineStore('resources', () => {
  // Try to load resources from localStorage, otherwise use default
  const storedResources = localStorage.getItem(STORAGE_KEY);
  const initialResources: Resource[] = storedResources
    ? JSON.parse(storedResources)
    : [
        { title: 'H' },  // Hydrogen
        { title: 'O' },  // Oxygen
        { title: 'C' },  // Carbon
        { title: 'N' },  // Nitrogen
        { title: 'Fe' }, // Iron
        { title: 'Cl' }, // Chlorine
        { title: 'Na' }, // Sodium
        { title: 'S' },  // Sulfur
        { title: 'K' },  // Potassium
        { title: 'Ca' }, // Calcium
        // Add more initial elements if needed
      ];

  const resources = ref<Resource[]>(initialResources);

  // Watch for changes in the 'resources' ref and save to localStorage
  watch(resources, (newResources) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newResources));
  }, { deep: true }); // Use deep: true to watch for changes within the array elements

  function addResource(resource: Resource) {
    if (!resources.value.some(r => r.title === resource.title)) {
      resources.value.push(resource);
    }
  }

  function removeResource(title: string) {
    const index = resources.value.findIndex(r => r.title === title);
    if (index !== -1) {
      resources.value.splice(index, 1);
    }
  }

  return {
    resources,
    addResource,
    removeResource
  };
});