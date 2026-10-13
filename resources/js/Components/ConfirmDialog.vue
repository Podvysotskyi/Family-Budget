<script setup lang="ts">
import {ref,watch,nextTick,onBeforeUnmount} from 'vue';
const props=withDefaults(defineProps<{open:boolean;title:string;confirmLabel?:string}>(),{confirmLabel:'Discard changes'});const emit=defineEmits<{confirm:[];cancel:[]}>();const dialog=ref<HTMLDialogElement>();let previousFocus:HTMLElement|null=null;
watch(()=>props.open,async(open)=>{await nextTick();if(open&&!dialog.value?.open){previousFocus=document.activeElement as HTMLElement;dialog.value?.showModal();dialog.value?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();}else if(!open&&dialog.value?.open){dialog.value.close();previousFocus?.focus();}},{immediate:true});
onBeforeUnmount(()=>{dialog.value?.close();previousFocus?.focus();});
</script>
<template><dialog ref="dialog" :aria-label="title" @cancel.prevent="emit('cancel')"><div class="p-6"><h2>{{title}}</h2><div class="mt-4 leading-relaxed text-muted"><slot/></div></div><div class="flex justify-end gap-2 border-t border-line p-4"><button data-cancel type="button" class="btn" @click="emit('cancel')">Keep editing</button><button type="button" class="btn-danger btn-destructive" @click="emit('confirm')">{{confirmLabel}}</button></div></dialog></template>
