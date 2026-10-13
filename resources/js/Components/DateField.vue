<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-vue-next';
import {iso,shiftMonth,monthLabel} from '../lib/format';
import FloatingPanel from './FloatingPanel.vue';
const props=defineProps<{modelValue:string|null;label?:string;required?:boolean;id?:string}>();
const emit=defineEmits<{'update:modelValue':[value:string|null]}>();
const input=ref('');const typedInput=ref<HTMLInputElement>();const open=ref(false);const month=ref((props.modelValue||iso(new Date())).slice(0,7));
const anchor=ref<HTMLDivElement>();const trigger=ref<HTMLButtonElement>();const panelId=useId();
watch(()=>props.modelValue,value=>{input.value=value?value.slice(5,7)+'/'+value.slice(8,10)+'/'+value.slice(0,4):'';if(value)month.value=value.slice(0,7);},{immediate:true});
const days=computed(()=>{const d=new Date(month.value+'-01T12:00:00Z');const offset=(d.getUTCDay()+6)%7;d.setUTCDate(1-offset);return Array.from({length:42},(_,i)=>{const day=new Date(d);day.setUTCDate(d.getUTCDate()+i);return iso(day);});});
function parse(){typedInput.value?.setCustomValidity('');if(!input.value){emit('update:modelValue',null);return;}const m=input.value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m){typedInput.value?.setCustomValidity('Enter a valid date as MM/DD/YYYY.');return;}const value=m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');const d=new Date(value+'T12:00:00Z');if(!isNaN(d.getTime())&&iso(d)===value)emit('update:modelValue',value);else typedInput.value?.setCustomValidity('Enter a real calendar date.');}
function close(){open.value=false;trigger.value?.focus();}
function pick(day:string){emit('update:modelValue',day);close();}
</script>
<template><div class="relative">
 <div ref="anchor" class="flex items-center"><input :id="id" ref="typedInput" v-model="input" :aria-label="label||'Date'" placeholder="MM/DD/YYYY" inputmode="numeric" :required="required" @input="parse" @change="parse" @keydown.escape="open=false"/><button ref="trigger" class="icon-btn absolute right-1" type="button" :aria-expanded="open" :aria-controls="panelId" :popovertarget="panelId" aria-label="Choose date" @click.prevent="open=!open"><CalendarDays :size="16"/></button></div>
 <FloatingPanel v-if="open" :id="panelId" :anchor="anchor" :width="288" role="group" aria-label="Calendar" @close="open=false" @keydown.escape.stop.prevent="close"><div class="p-3">
  <div class="flex items-center justify-between pb-2"><button class="icon-btn" type="button" aria-label="Previous month" @click="month=shiftMonth(month,-1)"><ChevronLeft :size="16"/></button><b>{{monthLabel(month)}}</b><button class="icon-btn" type="button" aria-label="Next month" @click="month=shiftMonth(month,1)"><ChevronRight :size="16"/></button></div>
  <div class="grid grid-cols-7 text-center"><span v-for="day in ['M','T','W','T','F','S','S']" class="py-1 text-xs text-muted">{{day}}</span><button v-for="day in days" :key="day" type="button" class="rounded p-2 text-xs hover:bg-zinc-100" :class="[day===modelValue?'bg-ink text-white':day.startsWith(month)?'text-ink':'text-zinc-400']" :aria-label="day" @click="pick(day)">{{Number(day.slice(8))}}</button></div>
 </div></FloatingPanel>
</div></template>
