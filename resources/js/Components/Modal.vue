<script setup lang="ts">
import {ref,watch,nextTick,onBeforeUnmount} from 'vue';
import {X} from 'lucide-vue-next';
import ConfirmDialog from './ConfirmDialog.vue';
const props=withDefaults(defineProps<{open:boolean;title:string;subtitle?:string;size?:number;dirty?:boolean;busy?:boolean;headerDivider?:boolean}>(),{dirty:false,busy:false,size:600,headerDivider:true});
const emit=defineEmits<{close:[]}>();
const dialog=ref<HTMLDialogElement>();
const discard=ref(false);
let previousFocus:HTMLElement|null=null;
watch(()=>props.open,async open=>{
 await nextTick();
 if(open&&!dialog.value?.open){previousFocus=document.activeElement as HTMLElement;dialog.value?.showModal();}
 else if(!open&&dialog.value?.open){dialog.value.close();previousFocus?.focus();}
},{immediate:true});
function close(){if(props.busy)return;if(props.dirty){discard.value=true;return;}emit('close');}
defineExpose({close});
onBeforeUnmount(()=>{dialog.value?.close();previousFocus?.focus();});
</script>
<template>
 <dialog ref="dialog" :aria-label="title" :style="{width:'min('+size+'px, calc(100% - 32px))'}" @cancel.prevent="close" @click="event=>event.target===dialog&&close()">
  <div class="shrink-0 flex items-start justify-between gap-4 px-6 py-5" :class="{'border-b border-line':headerDivider}"><div><h2 class="text-[21px]!">{{title}}</h2><p v-if="subtitle" class="help mt-1.5">{{subtitle}}</p></div><button class="icon-btn" aria-label="Close dialog" type="button" @click="close" :disabled="busy"><X :size="18"/></button></div>
  <div class="modal-content min-h-0 overflow-y-auto"><slot/></div>
  <ConfirmDialog :open="discard" title="Discard unsaved changes?" @cancel="discard=false" @confirm="discard=false;emit('close')">Your edits have not been saved. Keep editing to return to this form.</ConfirmDialog>
 </dialog>
</template>
