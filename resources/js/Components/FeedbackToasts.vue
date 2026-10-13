<script setup lang="ts">
import {ref,watch,onMounted,onBeforeUnmount} from 'vue';import {usePage} from '@inertiajs/vue3';
const page=usePage<any>();const toasts=ref<{id:number;message:string;error:boolean}[]>([]);let sequence=0;const timers:ReturnType<typeof setTimeout>[]=[];
const offline=ref(false);function connection(){offline.value=!navigator.onLine;}
function dismiss(id:number){toasts.value=toasts.value.filter(t=>t.id!==id);}
watch(()=>page.props.flash,(flash)=>{for(const [key,error] of [['success',false],['error',true]] as const){const message=flash?.[key];if(!message)continue;const id=++sequence;toasts.value=[...toasts.value,{id,message,error}].slice(-3);if(!error)timers.push(setTimeout(()=>dismiss(id),5000));}},{immediate:true});
onMounted(()=>{connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);});
onBeforeUnmount(()=>{timers.forEach(clearTimeout);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);});
</script>
<template><div><div v-if="offline" role="alert" class="border-b border-orange-200 bg-orange-50 px-5 py-3 text-warning">You’re offline. Keep this page open; unsaved form values stay here. Reconnect before saving.</div><div class="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2" aria-live="polite"><div v-for="toast in [...toasts].reverse()" :key="toast.id" :role="toast.error?'alert':'status'" class="flex items-start gap-4 rounded-lg border p-4 shadow-lg" :class="toast.error?'border-orange-200 border-l-4 border-l-orange-500 bg-white text-warning':'border-ink bg-ink text-white'"><p>{{toast.message}}</p><button class="shrink-0 text-xs underline" :aria-label="'Dismiss '+(toast.error?'error':'success')+' message'" @click="dismiss(toast.id)">Dismiss</button></div></div></div></template>
