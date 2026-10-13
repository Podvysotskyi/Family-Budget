<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue';
const props=defineProps<{loading:boolean;label?:string}>();
const visible=ref(false);let timer:ReturnType<typeof setTimeout>|undefined;
watch(()=>props.loading,(loading)=>{clearTimeout(timer);visible.value=false;if(loading)timer=setTimeout(()=>visible.value=true,300);},{immediate:true});
onBeforeUnmount(()=>clearTimeout(timer));
</script>
<template><div v-if="loading" role="status" :aria-label="label||'Loading'" class="min-h-32 p-6"><span class="sr-only">{{label||'Loading'}}</span><div v-if="visible" class="animate-pulse space-y-4" aria-hidden="true"><div class="h-5 w-1/3 rounded bg-zinc-100"/><div class="h-12 rounded bg-zinc-100"/><div class="h-5 w-2/3 rounded bg-zinc-100"/></div></div></template>
