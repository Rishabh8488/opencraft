<script setup lang="ts">
import { useDrag } from 'vue3-dnd'
import { ItemTypes } from './ItemTypes'
import { toRefs } from '@vueuse/core'
import ItemCard from "@/components/ItemCard.vue";

const props = defineProps<{
  // REMOVED emoji: string
  title: string
}>()

const [collect, drag] = useDrag(() => ({
  type: ItemTypes.BOX,
  // REMOVED emoji from the item object
  item: { title: props.title },
  collect: monitor => ({
    isDragging: monitor.isDragging(),
  }),
}))
const { isDragging } = toRefs(collect) // isDragging still relies on collect, which is fine
</script>

<template>
  <div
      class="inline-block"
      :ref="drag"
      role="Box"
      data-testid="box"
  >
    <ItemCard :title="title"></ItemCard>
  </div>
</template>

<style scoped>

</style>