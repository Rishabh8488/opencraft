// src/stores/useBoxesStore.ts
import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';

interface BoxStoreEntry {
  id: string;
  top: number;
  left: number;
  title: string;
  loading?: boolean;
  isNew?: boolean; // <-- ADDED THIS LINE: Makes 'isNew' an optional boolean property
}

const STORAGE_KEY = 'chemcraft_boxes';

export const useBoxesStore = defineStore('boxes', () => {
  const storedBoxes = localStorage.getItem(STORAGE_KEY);
  const boxes = reactive<{ [id: string]: BoxStoreEntry }>(
    storedBoxes ? JSON.parse(storedBoxes) : {}
  );

  watch(boxes, (newBoxes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoxes));
  }, { deep: true });

  function addBox(box: BoxStoreEntry) {
    // Ensure loading is false when added, and isNew defaults to false if not provided
    boxes[box.id] = { ...box, loading: false, isNew: box.isNew ?? false };
  }

  function removeBox(id: string) {
    if (boxes[id]) {
      delete boxes[id];
    }
  }

  // <-- ADDED THIS FUNCTION: Sets the isNew flag to false for a specific box
  function markBoxAsOld(id: string) {
    if (boxes[id]) {
      boxes[id].isNew = false;
    }
  }

  return {
    boxes,
    addBox,
    removeBox,
    markBoxAsOld // <-- ADDED THIS LINE: Exposes the new function from the store
  };
});