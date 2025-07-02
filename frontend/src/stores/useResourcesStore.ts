// src/stores/useResourcesStore.ts
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

interface Resource {
  title: string;
}

const STORAGE_KEY = 'chemcraft_resources';

export const useResourcesStore = defineStore('resources', () => {
  // Try to load resources from localStorage, otherwise use default
  const storedResources = localStorage.getItem(STORAGE_KEY);
  const initialResources: Resource[] = storedResources
    ? JSON.parse(storedResources)
    : [
        // --- Most Popular/Common Elements ---
        { title: 'H' },  // Hydrogen
        { title: 'He' }, // Helium (common, though less reactive for crafting)
        { title: 'Li' }, // Lithium
        { title: 'B' },  // Boron
        { title: 'C' },  // Carbon
        { title: 'N' },  // Nitrogen
        { title: 'O' },  // Oxygen
        { title: 'F' },  // Fluorine
        { title: 'Ne' }, // Neon (common, though less reactive for crafting)
        { title: 'Na' }, // Sodium
        { title: 'Mg' }, // Magnesium
        { title: 'Al' }, // Aluminum
        { title: 'Si' }, // Silicon
        { title: 'P' },  // Phosphorus
        { title: 'S' },  // Sulfur
        { title: 'Cl' }, // Chlorine
        { title: 'Ar' }, // Argon (common, though less reactive for crafting)
        { title: 'K' },  // Potassium
        { title: 'Ca' }, // Calcium
        { title: 'Ti' }, // Titanium
        { title: 'Cr' }, // Chromium
        { title: 'Mn' }, // Manganese
        { title: 'Fe' }, // Iron
        { title: 'Ni' }, // Nickel
        { title: 'Cu' }, // Copper
        { title: 'Zn' }, // Zinc
        { title: 'Br' }, // Bromine
        { title: 'Ag' }, // Silver
        { title: 'I' },  // Iodine
        { title: 'Au' }, // Gold
        { title: 'Pb' }, // Lead
        // You can add or remove elements based on your game's needs
      ];

  const resources = ref<Resource[]>(initialResources);

  // Watch for changes in the 'resources' ref and save to localStorage
  watch(resources, (newResources) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newResources));
  }, { deep: true });

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