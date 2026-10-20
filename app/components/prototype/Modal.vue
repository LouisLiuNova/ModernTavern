<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
const props=defineProps<{open:boolean;title:string;description?:string;wide?:boolean;full?:boolean}>()
const emit=defineEmits<{ 'update:open':[value:boolean] }>()
let returnFocus:HTMLElement|null=null
watch(()=>props.open,open=>{if(open)returnFocus=document.activeElement as HTMLElement})
function restore(e:Event){e.preventDefault();returnFocus?.focus()}
</script>
<template><Dialog :open="open" @update:open="emit('update:open',$event)"><DialogContent :class="['modal',{'modal-wide':wide,'modal-full':full}]" @close-auto-focus="restore"><DialogHeader><DialogTitle class="modal-title">{{title}}</DialogTitle><DialogDescription class="modal-description">{{description||'设置仅保存在当前浏览器。'}}</DialogDescription></DialogHeader><div class="modal-body"><slot/></div></DialogContent></Dialog></template>
