<script setup lang="ts">
import {computed,nextTick,ref,useId,watch} from 'vue';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-vue-next';
import {iso,monthLabel} from '../lib/format';
import FloatingPanel from './FloatingPanel.vue';
const props=defineProps<{modelValue:string|null;label?:string;required?:boolean;id?:string}>();
const emit=defineEmits<{'update:modelValue':[value:string|null]}>();
const input=ref(''),open=ref(false);
const year=ref(Number((props.modelValue||iso(new Date())).slice(0,4)));
const typedInput=ref<HTMLInputElement>(),anchor=ref<HTMLDivElement>(),trigger=ref<HTMLButtonElement>(),grid=ref<HTMLDivElement>();
const inputId=props.id||useId();const panelId=useId();const activeMonth=ref(0);
watch(()=>props.modelValue,value=>{
 input.value=value?value.slice(5,7)+'/'+value.slice(0,4):'';
 typedInput.value?.setCustomValidity('');
 if(value)year.value=Number(value.slice(0,4));
},{immediate:true});
const months=computed(()=>Array.from({length:12},(_,index)=>{
 const value=String(year.value).padStart(4,'0')+'-'+String(index+1).padStart(2,'0');
 return {value,label:new Date(Date.UTC(2000,index,1)).toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}),name:monthLabel(value)};
}));
function parse(){
 typedInput.value?.setCustomValidity('');
 if(!input.value){emit('update:modelValue',null);return;}
 const match=input.value.match(/^(\d{1,2})\/(\d{4})$/);
 if(!match){typedInput.value?.setCustomValidity('Enter a valid month as MM/YYYY.');return;}
 if(Number(match[1])<1||Number(match[1])>12||Number(match[2])<1){typedInput.value?.setCustomValidity('Enter a real calendar month.');return;}
 emit('update:modelValue',match[2]+'-'+match[1].padStart(2,'0'));
}
function focusMonth(){nextTick(()=>grid.value?.querySelectorAll<HTMLButtonElement>('button')[activeMonth.value]?.focus());}
function close(){open.value=false;trigger.value?.focus();}
function toggle(){
 if(open.value){close();return;}
 year.value=Number((props.modelValue||iso(new Date())).slice(0,4));
 activeMonth.value=Number((props.modelValue||iso(new Date())).slice(5,7))-1;
 open.value=true;focusMonth();
}
function pick(value:string){
 typedInput.value?.setCustomValidity('');
 emit('update:modelValue',value);close();
}
function escape(event:KeyboardEvent){if(open.value){event.preventDefault();event.stopPropagation();close();}}
function keyboard(event:KeyboardEvent){
 const shifts:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3};
 if(event.key in shifts){event.preventDefault();activeMonth.value=Math.max(0,Math.min(11,activeMonth.value+shifts[event.key]));focusMonth();}
 else if(event.key==='Home'||event.key==='End'){event.preventDefault();activeMonth.value=event.key==='Home'?0:11;focusMonth();}
 else if(event.key==='PageUp'||event.key==='PageDown'){event.preventDefault();year.value=Math.max(1,Math.min(9999,year.value+(event.key==='PageUp'?-1:1)));focusMonth();}
}
</script>
<template><div class="relative" @keydown.esc="escape">
 <div ref="anchor" class="flex items-center"><input :id="inputId" ref="typedInput" v-model="input" :aria-label="label||'Month'" placeholder="MM/YYYY" inputmode="numeric" :required="required" class="pr-10!" @input="parse" @change="parse"/><button ref="trigger" class="icon-btn absolute right-1" type="button" :aria-expanded="open" :aria-controls="panelId" :popovertarget="panelId" aria-label="Choose month" @click.prevent="toggle"><CalendarDays :size="16"/></button></div>
 <FloatingPanel v-if="open" :id="panelId" :anchor="anchor" :width="288" role="group" aria-label="Month calendar" @close="open=false"><div class="p-3">
  <div class="flex items-center justify-between pb-2"><button class="icon-btn" type="button" aria-label="Previous year" :disabled="year<=1" @click="year--"><ChevronLeft :size="16"/></button><b aria-live="polite">{{year}}</b><button class="icon-btn" type="button" aria-label="Next year" :disabled="year>=9999" @click="year++"><ChevronRight :size="16"/></button></div>
  <div ref="grid" class="grid grid-cols-3 gap-1 text-center" @keydown="keyboard"><button v-for="(month,index) in months" :key="month.value" type="button" :tabindex="index===activeMonth?0:-1" class="rounded px-2 py-3 text-xs" :class="month.value===modelValue?'bg-ink text-white hover:bg-ink':'text-ink hover:bg-zinc-100'" :aria-label="month.name" :aria-pressed="month.value===modelValue" @focus="activeMonth=index" @click="pick(month.value)">{{month.label}}</button></div>
 </div></FloatingPanel>
</div></template>
