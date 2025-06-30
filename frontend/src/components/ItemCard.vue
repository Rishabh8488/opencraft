<script setup lang="ts">
import { useDrop } from "vue3-dnd";
import { ItemTypes } from "@/components/ItemTypes";
import { useBoxesStore } from "@/stores/useBoxesStore";
import axios from "axios";
import { useResourcesStore } from "@/stores/useResourcesStore";
import { storeToRefs } from "pinia";
import { twMerge } from "tailwind-merge";
import { onMounted, watch } from 'vue';

interface LocalDragItem {
    id: string; // For existing boxes, this is the unique ID; for new resources, this is the title
    title?: string; // Explicitly add title here for consistency, though item.id often serves this for new resources
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

// --- DEBUGGING CONSOLE LOGS START ---
onMounted(() => {
  console.log(`ItemCard Mounted: ID=${props.id}, Title=${props.title}, Size=${props.size}`);
});

watch(() => props.title, (newTitle) => {
  console.log(`ItemCard Title Changed: ID=${props.id}, New Title=${newTitle}`);
});

watch(() => props.size, (newSize) => {
  console.log(`ItemCard Size Changed: ID=${props.id}, New Size=${newSize}`);
});
// --- DEBUGGING CONSOLE LOGS END ---


const [, drop] = useDrop(() => ({
    accept: ItemTypes.BOX,
    async drop(item: LocalDragItem, monitor) {
        console.log('ItemCard Drop Handler: Item dropped ONTO this card.', { targetCardId: props.id, targetCardTitle: props.title, droppedItemId: item.id, droppedItemType: monitor.getItemType() }); // Added droppedItemType for more info

        // Check if the dragged item is different from the target item AND is not null/undefined
        if (props.id && item.id !== props.id) {
            // Determine the title of the item being dropped.
            // If it's an existing box, get its title from the store.
            // If it's a new resource from the sidebar, its 'id' property *is* its title.
            const droppedItemTitle = store.boxes[item.id]?.title ?? item.id; // Corrected logic here

            if (item.id) { // Ensure item.id is valid before attempting removal for existing boxes
                // If the dropped item IS an existing box (has a store.boxes entry), remove it.
                // Otherwise, it's a new resource from the sidebar, so don't try to remove it from boxes yet.
                if (store.boxes[item.id]) {
                    removeBox(item.id);
                }
            }
            if (props.id && store.boxes[props.id]) {
                store.boxes[props.id].loading = true;
            }

            console.log(`Axios Request: Combining '${props.title}' with '${droppedItemTitle}'`);
            const response = await axios.post('https://opencraft-production.up.railway.app/', {
                first: props.title,
                second: droppedItemTitle // Use the correctly determined title here
            });

            const resultAnswer = response.data.result !== '' ? response.data.result : props.title;
            console.log(`Axios Response: Result='${response.data.result}', Final Title='${resultAnswer}'`);


            const newBoxId = Math.random().toString(36).substring(2, 7);

            console.log(`Adding New Combined Box: ID=${newBoxId}, Title='${resultAnswer}'`);
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
                removeBox(props.id); // Remove the target box
            }
        } else {
            console.log("ItemCard Drop Handler: Dropped item is the same as target, or target ID is missing, or item ID is missing.");
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