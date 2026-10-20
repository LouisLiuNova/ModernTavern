<script setup lang="ts">
import { ArrowUp, Maximize2, Minimize2, Square, Feather, LoaderCircle } from 'lucide-vue-next'
import { Button } from '../ui/button'
import Modal from './Modal.vue'
const props=defineProps<{modelValue:string;locked:boolean;accepting:boolean;hasMessages:boolean;lastRole?:string}>()
const emit=defineEmits<{'update:modelValue':[text:string];send:[];generate:[];stop:[]}>()
const expanded=ref(false),composing=ref(false),field=ref<HTMLTextAreaElement>()
const mobile=ref(false)
onMounted(()=>{const q=matchMedia('(pointer: coarse), (max-width: 640px)');mobile.value=q.matches;const update=()=>mobile.value=q.matches;q.addEventListener('change',update);onUnmounted(()=>q.removeEventListener('change',update))})
function keydown(e:KeyboardEvent){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!composing.value&&e.keyCode!==229&&!mobile.value){e.preventDefault();if(!props.locked&&!props.accepting)emit('send')}}
function resize(){nextTick(()=>{if(field.value){field.value.style.height='auto';field.value.style.height=`${Math.min(160,Math.max(48,field.value.scrollHeight))}px`}})}
watch(()=>props.modelValue,resize)
function update(e:Event){emit('update:modelValue',(e.target as HTMLTextAreaElement).value);resize()}
</script>
<template>
<div class="composer-wrap"><div class="composer" :class="{expanded}"><textarea ref="field" :value="modelValue" aria-label="消息输入" placeholder="写下你的下一步，让故事继续……" rows="1" @input="update" @keydown="keydown" @compositionstart="composing=true" @compositionend="composing=false"/><div class="composer-actions"><span class="composer-hint"><Feather :size="13"/>{{locked?'生成中，你可以先写下一段':'留一点想象，给下一页'}}</span><Button variant="ghost" size="icon-sm" aria-label="全屏写作" @click="expanded=true"><Maximize2/></Button><Button v-if="locked" class="send-button" size="icon" aria-label="停止生成" @click="emit('stop')"><Square :size="15" fill="currentColor"/></Button><Button v-else class="send-button" size="icon" aria-label="发送消息" :disabled="accepting||!modelValue.trim()" @click="emit('send')"><LoaderCircle v-if="accepting" class="spin"/><ArrowUp v-else/></Button></div></div><div class="composer-bottom"><span>{{mobile?'回车换行，点击发送':'Enter 发送 · Shift + Enter 换行'}}</span><Button v-if="hasMessages" variant="ghost" size="sm" :disabled="locked||accepting" @click="emit('generate')">{{lastRole==='assistant'?'继续故事':'生成回复'}} <ArrowUp :size="12"/></Button></div></div>
<Modal v-model:open="expanded" title="把想法慢慢写下来" description="草稿实时保存在当前浏览器，收起后可继续编辑。" full><textarea :value="modelValue" class="full-writing" aria-label="全屏写作正文" placeholder="在这里展开你的故事……" @input="update" @compositionstart="composing=true" @compositionend="composing=false"/><div class="row end"><span class="muted">{{modelValue.length}} 字符</span><Button variant="outline" @click="expanded=false"><Minimize2/>收起写作</Button><Button :disabled="locked||accepting||!modelValue.trim()" @click="emit('send');expanded=false"><ArrowUp/>发送消息</Button></div></Modal>
</template>
