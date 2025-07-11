<script setup lang="ts">
import Box from '@/components/Box.vue'
import ItemCard from '@/components/ItemCard.vue'
import { useBoxesStore } from '@/stores/useBoxesStore'
import { useDrop } from 'vue3-dnd'
import { ItemTypes } from '@/components/ItemTypes'
import { ref } from 'vue'
import AvailableResources from '@/components/AvailableResources.vue'

const store = useBoxesStore()
const { boxes, removeBox, addBox } = store

const containerElement = ref<HTMLElement | null>(null)

const [, drop] = useDrop(() => ({
  accept: ItemTypes.BOX,
  drop: (item: { id: string }, monitor) => {
    const delta = monitor.getDifferenceFromInitialOffset() as { x: number; y: number }

    console.log('Container Drop Handler: Dropped Item ID:', item.id, 'Delta:', delta);


    if (item.id && store.boxes[item.id]) {
      const left = Math.round(store.boxes[item.id].left + delta.x)
      const top = Math.round(store.boxes[item.id].top + delta.y)
      store.boxes[item.id].left = left
      store.boxes[item.id].top = top
      console.log(`Container: Moved existing box <span class="math-inline">\{item\.id\} to L\:</span>{left}, T:${top}`);
    } else {
      const clientOffset = monitor.getClientOffset()
      if (containerElement.value && clientOffset) {
        const containerRect = containerElement.value.getBoundingClientRect()
        const newLeft = clientOffset.x - containerRect.left
        const newTop = clientOffset.y - containerRect.top

        const newId = Math.random().toString(36).substring(2, 7);
        console.log(`Container: Adding new box from sidebar. ID:<span class="math-inline">\{newId\}, Title\:</span>{item.id}, Pos: L:<span class="math-inline">\{newLeft\}, T\:</span>{newTop}`);
        addBox({
          id: newId,
          top: newTop,
          left: newLeft,
          title: item.id // This 'item.id' is the title from AvailableResources
        })
      }
    }
    return undefined
  },
}))
</script>

<template>
  <div ref="containerElement">
    <main class="flex gap-x-3">
      <div class="w-3/4">
        <div :ref="drop"
             class="container bg-gray-200 dark:bg-black">
          <Box
            v-for="(value, key) in boxes"
            :id="value.id"
            :key="value.id"
            :left="value.left"
            :top="value.top"
            :loading="value.loading"
          >
            {{ console.log(`Rendering Box: ID=<span class="math-inline">\{value\.id\}, Title\=</span>{value.title}`) }}
            <ItemCard size="large" :id="value.id" :title="value.title"/>
          </Box>
        </div>
      </div>
      <div class="w-1/4 bg-white shadow px-4 py-3 border-gray-200 border rounded-lg overflow-y-scroll max-h-[80vh]
                  dark:bg-black dark:border-gray-700 dark:text-gray-100">
        <h2 class="font-semibold text-gray-800 dark:text-gray-100">Resources</h2>
        <AvailableResources></AvailableResources>
      </div>
    </main>
  </div>
</template>

<style scoped>
.container {
  min-height: 80vh;
  border: 1px solid #ccc;
  position: relative;
  border-radius: 8px;
}
</style>