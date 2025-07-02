<script setup lang="ts">
import { useDrop } from "vue3-dnd";
import { ItemTypes } from "@/components/ItemTypes";
import { useBoxesStore } from "@/stores/useBoxesStore";
import axios from "axios";
import { useResourcesStore } from "@/stores/useResourcesStore";
import { storeToRefs } from "pinia";
import { twMerge } from "tailwind-merge";
import { onMounted, watch, ref } from 'vue';

interface LocalDragItem {
    id: string;
    title?: string;
}

const props = defineProps<{
    title?: string;
    id?: string;
    size?: 'small' | 'large';
    isNew?: boolean;
}>();

const store = useBoxesStore();
const { removeBox, addBox, markBoxAsOld } = store;
const { resources } = storeToRefs(useResourcesStore());
const { addResource } = useResourcesStore();

const showAnimation = ref(false); // Reactive state to control animation class

onMounted(() => {
  console.log(`[ItemCard] Mounted: ID=${props.id}, Title=${props.title}, Size=${props.size}, isNew=${props.isNew}`);
});

watch(() => props.isNew, (newValue) => {
  if (newValue) {
    showAnimation.value = true;
    console.log(`[ItemCard] Triggering animation for ID: ${props.id}`);
    setTimeout(() => {
      showAnimation.value = false;
      if (props.id) {
        markBoxAsOld(props.id);
      }
      console.log(`[ItemCard] Animation finished and state reset for ID: ${props.id}`);
    }, 600);
  }
}, { immediate: true });

const [, drop] = useDrop(() => ({
    accept: ItemTypes.BOX,
    drop: async (item: LocalDragItem, monitor) => {
        const didDrop = monitor.didDrop();
        console.log(`[ItemCard] Drop Handler: Item dropped ONTO this card. Target ID: ${props.id}, Dropped Item ID: ${item.id}, Did Drop on this target: ${didDrop}`);

        if (!didDrop) {
            console.log(`[ItemCard] Drop Handler: Not the primary drop target. Ignoring.`);
            return;
        }

        if (props.id && item.id !== props.id) {
            console.log(`[ItemCard] Combination attempt: target=${props.id}, dropped=${item.id}`);

            const droppedItemTitle = store.boxes[item.id]?.title ?? item.id;
            const targetBox = store.boxes[props.id]; // Get the target box for position

            if (!targetBox) {
                console.error(`[ItemCard] Target box not found for ID: ${props.id}`);
                return; // Prevent errors if target box somehow disappears
            }

            // Set target box to loading
            store.boxes[props.id].loading = true;
            console.log(`[ItemCard] Setting target box ${props.id} to loading.`);

            console.log(`[ItemCard] Axios Request: Combining '${props.title}' with '${droppedItemTitle}'`);
            const response = await axios.post('http://127.0.0.1:3000/', { // Ensure this URL is correct
                first: props.title,
                second: droppedItemTitle
            });

            // response.data.result will now be an array of strings
            const productTitles: string[] = response.data.result;
            console.log(`[ItemCard] Axios Response: Products='${productTitles.join(' + ')}'`);

            // Remove the two input boxes first, regardless of the output
            if (item.id && store.boxes[item.id]) {
                console.log(`[ItemCard] Removing dropped existing box: ${item.id}`);
                removeBox(item.id);
            }
            if (props.id && store.boxes[props.id]) {
                console.log(`[ItemCard] Removing target box: ${props.id}`);
                removeBox(props.id);
            }

            // --- Logic for adding new boxes for each product ---
            let offsetX = 0;
            let offsetY = 0;
            const offsetIncrement = 30; // Pixels to offset each new box for stacking effect

            // Check if it's a "No reaction" scenario
            if (productTitles.length === 1 && productTitles[0].toLowerCase() === "no reaction") {
                // If it's explicitly "No reaction", add a single box for it
                const newBoxId = Math.random().toString(36).substring(2, 7);
                 addBox({
                    id: newBoxId,
                    title: "No reaction",
                    left: targetBox.left,
                    top: targetBox.top,
                    isNew: true, // For animation
                });
            } else if (productTitles.length > 0) {
                // If there are actual products, iterate and add them
                productTitles.forEach((productTitle: string, index: number) => {
                    // Only add valid-looking products
                    if (/^(?:[A-Z][a-z]?\d*)+$/.test(productTitle)) {
                        const newBoxId = Math.random().toString(36).substring(2, 7);
                        console.log(`[ItemCard] Adding New Product Box: ID=${newBoxId}, Title='${productTitle}'`);

                        addBox({
                            id: newBoxId,
                            title: productTitle,
                            left: targetBox.left + offsetX,
                            top: targetBox.top + offsetY,
                            isNew: true, // Mark for animation
                        });

                        // Add to resources if not already present
                        if (!resources.value.find((resource: { title: string; }) => resource.title === productTitle)) {
                            addResource({
                                title: productTitle,
                            });
                        }

                        // Increment offset for next box
                        offsetX += offsetIncrement;
                        offsetY += offsetIncrement;
                    } else {
                        console.warn(`[ItemCard] Skipping invalid product title: ${productTitle}`);
                    }
                });
            } else {
                 // Fallback for unexpected empty or invalid results from API
                const newBoxId = Math.random().toString(36).substring(2, 7);
                 addBox({
                    id: newBoxId,
                    title: "???",
                    left: targetBox.left,
                    top: targetBox.top,
                    isNew: true,
                });
            }
            // --- End Logic for adding new boxes ---

        } else {
            console.log(`[ItemCard] Drop Handler: Not a combination or invalid target/item ID. Target: ${props.id}, Item: ${item.id}`);
        }
    },
}));

</script>
<template>
  <div :ref="drop"
       :class="twMerge(
         props.size === 'large' ? 'text-2xl space-x-2.5 py-2.5 px-4' : 'space-x-1.5 px-3 py-1',
         'border-gray-200 bg-white shadow hover:bg-gray-100 cursor-pointer transition inline-block font-medium border rounded-lg',
         showAnimation ? 'animate-celebrate-pop' : '',
         'dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-700'
       )">
    <span>
      {{ title }}
    </span>
  </div>

</template>

<style scoped>
/* Define the keyframes for the animation */
@keyframes celebrate-pop {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0px 0px rgba(0, 255, 255, 0);
  }
  25% {
    transform: scale(1.05); /* Slightly bigger pop */
    box-shadow: 0 0 15px 5px rgba(0, 255, 255, 0.7); /* Cyan glow */
  }
  50% {
    transform: scale(1);
    box-shadow: 0 0 10px 3px rgba(0, 255, 255, 0.5);
  }
  75% {
    transform: scale(1.02);
    box-shadow: 0 0 5px 1px rgba(0, 255, 255, 0.2);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0px 0px rgba(0, 255, 255, 0);
  }
}

/* Apply the animation */
.animate-celebrate-pop {
  animation: celebrate-pop 0.6s ease-out; /* 600ms duration, ease-out timing */
}
</style>