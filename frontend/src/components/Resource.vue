<script setup lang="ts">
import { useDrag } from 'vue3-dnd';
import { ItemTypes } from '@/components/ItemTypes'; // Ensure ItemTypes is imported

const props = defineProps<{
  title: string; // Resource title is required
}>();

const [, drag] = useDrag(() => ({
  type: ItemTypes.BOX,
  item: { id: props.title }, // <-- THIS IS THE CRITICAL LINE
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  }),
}));

</script>

<template>
  <div :ref="drag"
       class="bg-gray-200 text-gray-800 px-3 py-1 rounded-lg border border-gray-300
              cursor-grab inline-block font-medium shadow-sm transition hover:bg-gray-300
              dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600">
    <span>
      {{ title }}
    </span>
  </div>
</template>

<style scoped>
/* Your existing styles here */
</style>