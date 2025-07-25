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
  
  let defaultResources: Resource[] = [
    { title: 'H2' },    // Hydrogen (updated from H)
    { title: 'He' },    // Helium
    { title: 'Li' },    // Lithium
    { title: 'B' },     // Boron
    { title: 'C' },     // Carbon
    { title: 'N2' },    // Nitrogen (already N2)
    { title: 'O2' },    // Oxygen (already O2)
    { title: 'F2' },    // Fluorine (updated from F)
    { title: 'Ne' },    // Neon
    { title: 'Na' },    // Sodium
    { title: 'Mg' },    // Magnesium
    { title: 'Al' },    // Aluminum
    { title: 'Si' },    // Silicon
    { title: 'P' },     // Phosphorus
    { title: 'S' },     // Sulfur
    { title: 'Cl2' },   // Chlorine (already Cl2)
    { title: 'Ar' },    // Argon
    { title: 'K' },     // Potassium
    { title: 'Ca' },    // Calcium
    { title: 'Ti' },    // Titanium
    { title: 'Cr' },    // Chromium
    { title: 'Mn' },    // Manganese
    { title: 'Fe' },    // Iron
    { title: 'Ni' },    // Nickel
    { title: 'Cu' },    // Copper
    { title: 'Zn' },    // Zinc
    { title: 'Br2' },   // Bromine (updated from Br)
    { title: 'Ag' },    // Silver
    { title: 'I2' },    // Iodine (updated from I)
    { title: 'Au' },    // Gold
    { title: 'Pb' }     // Lead
  ];

  // Sort the default resources alphabetically by their title
  defaultResources.sort((a, b) => a.title.localeCompare(b.title));

  const initialResources: Resource[] = storedResources
    ? JSON.parse(storedResources)
    : defaultResources; // Use the sorted default resources

  const resources = ref<Resource[]>(initialResources);

  // Watch for changes in the 'resources' ref and save to localStorage
  watch(resources, (newResources) => {
    // Sort resources before saving to localStorage to maintain alphabetical order on reload
    const sortedNewResources = [...newResources].sort((a, b) => a.title.localeCompare(b.title));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedNewResources));
  }, { deep: true });

  function addResource(resource: Resource) {
    if (!resources.value.some(r => r.title === resource.title)) {
      resources.value.push(resource);
      // Re-sort the array after adding a new resource
      resources.value.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  function removeResource(title: string) {
    const index = resources.value.findIndex(r => r.title === title);
    if (index !== -1) {
      resources.value.splice(index, 1);
      // No need to sort after removal, as remaining elements maintain order
    }
  }

  return {
    resources,
    addResource,
    removeResource
  };
});