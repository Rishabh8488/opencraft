import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from "@vueuse/core"; // Keep this if you use it directly for localStorage in this file

export interface ResourceStoreEntry {
    title: string
    // emoji: string // This line should be removed or commented out
}

export const useResourcesStore = defineStore('resources', () => { // Note: 'resources' was the name I used
    const resources =
        useLocalStorage<ResourceStoreEntry[]>('opencraft/resources', [
            // Initial base chemistry elements
            {title: 'Hydrogen'},
            {title: 'Oxygen'},
            {title: 'Carbon'},
            {title: 'Nitrogen'},
            {title: 'Sulfur'},
            {title: 'Iron'},
            {title: 'Sodium'},
            {title: 'Chlorine'},
        ]);

    function addResource(box: ResourceStoreEntry) {
        resources.value.push(box);
    }

    return { resources, addResource };
})