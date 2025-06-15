export interface DragItem {
    type: string
    id: string
    top: number|null
    left: number|null
    // REMOVED emoji: string
    title: string
}