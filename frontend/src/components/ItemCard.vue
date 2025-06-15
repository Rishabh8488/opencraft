<script setup lang="ts">
import { useDrop } from "vue3-dnd";
import { ItemTypes } from "@/components/ItemTypes";
import { useBoxesStore } from "@/stores/useBoxesStore";
import axios from "axios";
import { useResourcesStore } from "@/stores/useResourcesStore";
import { storeToRefs } from "pinia";
import { twMerge } from "tailwind-merge";

interface LocalDragItem {
    id: string;
    title: string;
}

const props = defineProps<{
    title?: string;
    id?: string;
    size?: 'small' | 'large';
}>();

const store = useBoxesStore();
const { removeBox, addBox } = store;
const { resources } = storeToRefs(useResourcesStore());
const { addResource } = useResourcesStore();

const [, drop] = useDrop(() => ({
    accept: ItemTypes.BOX,
    async drop(item: LocalDragItem, monitor) {
        if (props.id && item.id !== props.id) {
            const droppedId = item?.id;
            const secondTitle = store.boxes[droppedId]?.title ?? item?.title;

            if (droppedId) {
                removeBox(droppedId);
            }
            if (props.id && store.boxes[props.id]) {
                store.boxes[props.id].loading = true;
            }


            const response = await axios.post('http://127.0.0.1:3000/', {
                first: props.title,
                second: secondTitle
            });

            const resultAnswer = response.data.result !== '' ? response.data.result : props.title;

            const newBoxId = Math.random().toString(36).substring(2, 7);

            addBox({
                id: newBoxId,
                title: resultAnswer,
                left: props.id && store.boxes[props.id] ? store.boxes[props.id].left : 0,
                top: props.id && store.boxes[props.id] ? store.boxes[props.id].top : 0
            });

            if (!resources.value.find((resource: { title: string; }) => resource.title === resultAnswer)) {
                addResource({
                    title: resultAnswer,
                });
            }
            if (props.id) {
                removeBox(props.id);
            }
        }
    },
}));

</script>
<template>
  <div :ref="drop"
       :class="twMerge(
         props.size === 'large' ? 'text-2xl space-x-2.5 py-2.5 px-4' : 'space-x-1.5 px-3 py-1',
         'border-gray-200 bg-white shadow hover:bg-gray-100 cursor-pointer transition inline-block font-medium border rounded-lg',
         'dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-700'
       )">
    <span>
      {{ title }}
    </span>
  </div>

</template>

<style scoped>

</style>