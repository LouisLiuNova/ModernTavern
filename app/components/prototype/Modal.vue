<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
  wide?: boolean;
  full?: boolean;
  returnFocusSelector?: string;
  canClose?: () => boolean;
}>();
const emit = defineEmits<{ "update:open": [value: boolean]; closed: [] }>();
let returnFocus: HTMLElement | null = null;
watch(
  () => props.open,
  (open) => {
    if (open) returnFocus = (props.returnFocusSelector
      ? document.querySelector<HTMLElement>(props.returnFocusSelector)
      : null) || document.activeElement as HTMLElement;
  },
);
function updateOpen(open: boolean) {
  if (!open && props.canClose && !props.canClose()) return;
  emit("update:open", open);
}
function restore(e: Event) {
  e.preventDefault();
  returnFocus?.focus();
  emit("closed");
}
</script>
<template>
  <Dialog :open="open" @update:open="updateOpen"
    ><DialogContent
      :class="['modal', { 'modal-wide': wide, 'modal-full': full }]"
      @close-auto-focus="restore"
      ><DialogHeader
        ><DialogTitle class="modal-title">{{ title }}</DialogTitle
        ><DialogDescription class="modal-description">{{
          description || "设置仅保存在当前浏览器。"
        }}</DialogDescription></DialogHeader
      >
      <div class="modal-body"><slot /></div></DialogContent
  ></Dialog>
</template>
