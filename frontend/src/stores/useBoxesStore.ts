// useBoxesStore.ts (CRITICAL REVISION - ENSURE THESE ARE APPLIED)

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {reactive} from "vue";

export interface BoxStoreEntry {
    top: number
    left: number
    id: string; // Keep id as required string
    title?: string; // THIS MUST BE OPTIONAL (string | undefined)
    // REMOVED: emoji: string; // THIS MUST BE REMOVED COMPLETELY
    loading?: boolean
}

export const useBoxesStore = defineStore('boxes', () => { // Confirm 'boxes' as store name
  const boxes = reactive<{
    [key: string]: BoxStoreEntry
  }>({
    'a': {id: 'a', top: 20, left: 80, title: 'Hydrogen'}, // Example initial box
  })

  function addBox(box: BoxStoreEntry) {
    boxes[box.id] = box;
  }

  function removeBox(id: string) {
    delete boxes[id]
  }

  return { boxes , removeBox, addBox}
})