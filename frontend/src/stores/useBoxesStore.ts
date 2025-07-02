// src/stores/useBoxesStore.ts

import { defineStore } from 'pinia';

// Define the interface for a Box entry in the store
export interface BoxStoreEntry {
  id: string;
  top: number;
  left: number;
  title: string;
  loading?: boolean;
  isNew?: boolean; 
}

interface BoxesState {
  boxes: {
    [id: string]: BoxStoreEntry;
  };
}

export const useBoxesStore = defineStore('boxes', {
  state: (): BoxesState => ({
    boxes: {},
  }),
  actions: {
    addBox(box: BoxStoreEntry) {
      this.boxes[box.id] = box;
      console.log(`Store: Added box ${box.id} - ${box.title}`);
    },
    removeBox(id: string) {
      delete this.boxes[id];
      console.log(`Store: Removed box ${id}`);
    },
    markBoxAsOld(id: string) { 
      if (this.boxes[id]) {
        this.boxes[id].isNew = false;
        console.log(`Store: Marked box ${id} as old (isNew=false)`);
      }
    },
    setBoxLoading(id: string, isLoading: boolean) {
      if (this.boxes[id]) {
        this.boxes[id].loading = isLoading;
        console.log(`Store: Set box ${id} loading to ${isLoading}`);
      }
    },
    // New action to clear all boxes
    clearAllBoxes() {
      this.boxes = {}; // Reset the boxes object to an empty object
      console.log("Store: All boxes cleared from the board.");
    }
  },
});