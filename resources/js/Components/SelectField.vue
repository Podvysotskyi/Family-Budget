<script setup lang="ts" generic="T extends string | number | null">
import {computed,nextTick,onBeforeUnmount,ref,useAttrs,useId,watch} from 'vue';
import {Check,ChevronDown,Search} from 'lucide-vue-next';
import FloatingPanel from './FloatingPanel.vue';
defineOptions({inheritAttrs:false});
const props=withDefaults(defineProps<{
 modelValue:T;options:{value:T;label:string;disabled?:boolean;indent?:boolean}[];
 id?:string;name?:string;disabled?:boolean;required?:boolean;searchable?:boolean;
 placeholder?:string;searchLabel?:string;emptyMessage?:string;triggerClass?:string;
}>(),{disabled:false,required:false,searchable:false,placeholder:'Choose an option',searchLabel:'Search options',emptyMessage:'No matching options.'});
const emit=defineEmits<{'update:modelValue':[value:T];change:[value:T]}>();
const attrs=useAttrs();const generatedId=useId();const triggerId=computed(()=>props.id||generatedId);
const panelId=generatedId+'-panel';const listId=generatedId+'-list';
const trigger=ref<HTMLButtonElement>();const searchInput=ref<HTMLInputElement>();const list=ref<HTMLElement>();
const open=ref(false),search=ref(''),active=ref(-1),invalid=ref(false);
const options=computed(()=>props.options.filter(option=>option.label.toLowerCase().includes(search.value.toLowerCase())));
const selected=computed(()=>props.options.find(option=>option.value===props.modelValue));
const enabled=computed(()=>options.value.map((option,index)=>option.disabled?-1:index).filter(index=>index>=0));
const activeId=computed(()=>open.value&&active.value>=0?listId+'-'+active.value:undefined);
const ariaInvalid=computed(()=>invalid.value?'true':attrs['aria-invalid'] as 'true'|'false'|'grammar'|'spelling'|undefined);
const describedBy=computed(()=>[attrs['aria-describedby'],invalid.value?generatedId+'-error':undefined].filter(Boolean).join(' ')||undefined);
const validationValue=computed(()=>selected.value&&props.modelValue!==null&&props.modelValue!==''?String(props.modelValue):'');
let typed='';let typeTimer:ReturnType<typeof setTimeout>;
function reveal(){nextTick(()=>{const option=list.value?.querySelectorAll<HTMLElement>('[role="option"]')[active.value];if(!option||!list.value)return;const item=option.getBoundingClientRect(),box=list.value.getBoundingClientRect();if(item.top<box.top)list.value.scrollTop-=box.top-item.top;else if(item.bottom>box.bottom)list.value.scrollTop+=item.bottom-box.bottom;});}
async function show(last=false){
 if(props.disabled||open.value)return;
 search.value='';const index=options.value.findIndex(option=>option.value===props.modelValue&&!option.disabled);
 active.value=index>=0?index:(last?enabled.value.at(-1):enabled.value[0])??-1;open.value=true;
 await nextTick();if(props.searchable)searchInput.value?.focus();reveal();
}
function close(restoreFocus=false){open.value=false;search.value='';typed='';clearTimeout(typeTimer);if(restoreFocus)trigger.value?.focus();}
function choose(index:number){const option=options.value[index];if(props.disabled||!option||option.disabled)return;invalid.value=false;emit('update:modelValue',option.value);if(option.value!==props.modelValue)emit('change',option.value);close(true);}
function toggle(){if(open.value)close();else show();}
function keyboard(event:KeyboardEvent){
 if(props.disabled)return;
 if(event.key==='Tab'){close(true);return;}
 if(event.key==='Escape'&&open.value){event.preventDefault();event.stopPropagation();close(true);return;}
 if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
  event.preventDefault();if(!open.value){show(event.key==='ArrowUp'||event.key==='End');return;}
  const index=enabled.value.indexOf(active.value);
  active.value=event.key==='Home'?enabled.value[0]??-1:event.key==='End'?enabled.value.at(-1)??-1:enabled.value[Math.max(0,Math.min(enabled.value.length-1,index+(event.key==='ArrowDown'?1:-1)))]??-1;reveal();return;
 }
 if(event.key==='Enter'||(event.key===' '&&event.target===trigger.value)){event.preventDefault();if(open.value)choose(active.value);else show();return;}
 if(!props.searchable&&event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
  event.preventDefault();if(!open.value)show();clearTimeout(typeTimer);typed+=event.key.toLowerCase();
  const match=enabled.value.find(index=>options.value[index].label.toLowerCase().startsWith(typed));if(match!==undefined){active.value=match;reveal();}
  typeTimer=setTimeout(()=>typed='',700);
 }
}
watch(search,()=>{active.value=enabled.value[0]??-1;});
watch(()=>props.disabled,value=>{if(value)close();});
watch(()=>props.modelValue,()=>invalid.value=false);
watch(options,()=>{if(!enabled.value.includes(active.value))active.value=enabled.value[0]??-1;});
onBeforeUnmount(()=>clearTimeout(typeTimer));
</script>
<template><div class="relative min-w-0" :class="attrs.class">
 <button v-bind="{...attrs,class:undefined}" :id="triggerId" ref="trigger" type="button" role="combobox" class="btn w-full justify-between text-left font-normal" :class="[triggerClass,invalid?'border-orange-600!':'']" :disabled="disabled" :aria-required="required||undefined" :aria-invalid="ariaInvalid" :aria-describedby="describedBy" :aria-expanded="open" aria-haspopup="listbox" :aria-controls="listId" :aria-activedescendant="activeId" :popovertarget="panelId" @click.prevent="toggle" @keydown="keyboard"><span class="min-w-0 truncate">{{selected?.label||placeholder}}</span><ChevronDown :size="16" class="shrink-0"/></button>
 <input v-if="required||name" class="sr-only" tabindex="-1" aria-hidden="true" :name="name" :value="validationValue" :required="required" :disabled="disabled" @invalid.prevent="invalid=true;trigger?.focus()"/>
 <p v-if="invalid" :id="generatedId+'-error'" class="help mt-1 text-orange-800" role="alert">Choose an option.</p>
 <FloatingPanel v-if="open" :id="panelId" :anchor="trigger" @close="close()" @keydown="keyboard">
  <div v-if="searchable" class="relative m-2 mb-1 shrink-0"><Search class="absolute left-2 top-3 text-muted" :size="15"/><input ref="searchInput" v-model="search" :aria-label="searchLabel" :placeholder="searchLabel" role="combobox" aria-expanded="true" aria-autocomplete="list" :aria-controls="listId" :aria-activedescendant="activeId" class="pl-8!"/></div>
  <div :id="listId" ref="list" role="listbox" :aria-labelledby="triggerId" class="m-2 min-h-0 max-h-60 overflow-auto" :class="searchable?'mt-0!':''">
   <button v-for="(option,index) in options" :id="listId+'-'+index" :key="index" type="button" role="option" tabindex="-1" :disabled="option.disabled" :aria-selected="modelValue===option.value" class="flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left hover:bg-zinc-50" :class="[index===active?'bg-zinc-100':'',option.indent?'pl-7!':'',option.disabled?'cursor-not-allowed!':'']" @click="choose(index)"><span>{{option.label}}</span><Check v-if="modelValue===option.value" :size="14" class="shrink-0"/></button>
   <p v-if="!options.length" class="help p-3">{{emptyMessage}}</p>
  </div>
 </FloatingPanel>
</div></template>
