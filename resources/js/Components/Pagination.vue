<script setup lang="ts">
import SelectField from './SelectField.vue';
import {Link,router} from '@inertiajs/vue3';
const props=defineProps<{records:any;asynchronous?:boolean}>();
const emit=defineEmits<{load:[url:string]}>();
function perPage(value:number){const url=new URL(props.asynchronous?(props.records.first_page_url||props.records.path):window.location.href,window.location.origin);url.searchParams.set('per_page',String(value));const pages:string[]=[];url.searchParams.forEach((_,key)=>{if(key==='page'||(key.endsWith('_page')&&key!=='per_page'))pages.push(key);});pages.forEach(key=>url.searchParams.delete(key));if(props.asynchronous)emit('load',url.pathname+url.search);else router.get(url.pathname+url.search);}
function label(value:string){return value.replace(/&laquo;|&raquo;/g,'').trim();}
</script>
<template><div v-if="records?.links" class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
 <div class="flex items-center gap-3"><span>{{records.from||0}}–{{records.to||0}} of {{records.total}}</span><label class="flex items-center gap-2 text-xs font-normal">Rows<SelectField :model-value="records.per_page" class="w-20!" trigger-class="py-1!" aria-label="Rows per page" @change="perPage" :options="[{value:10,label:'10'},{value:25,label:'25'},{value:50,label:'50'}]"/></label></div>
 <div class="flex gap-1"><template v-for="link in records.links" :key="link.label"><button v-if="link.url&&asynchronous" class="rounded px-3 py-1.5 hover:bg-zinc-50" :class="link.active?'bg-ink text-white':''" @click="emit('load',link.url)">{{label(link.label)}}</button><Link v-else-if="link.url" :href="link.url" class="rounded px-3 py-1.5 hover:bg-zinc-50" :class="link.active?'bg-ink text-white':''" preserve-scroll>{{label(link.label)}}</Link><span v-else class="px-3 py-1.5 opacity-40">{{label(link.label)}}</span></template></div>
</div></template>
