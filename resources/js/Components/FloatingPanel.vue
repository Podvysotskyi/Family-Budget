<script setup lang="ts">
import {onMounted,onUpdated,onBeforeUnmount,ref} from 'vue';
const props=defineProps<{anchor:HTMLElement|undefined;id:string;width?:number}>();
const emit=defineEmits<{close:[]}>();
const panel=ref<HTMLElement>();
let observer:ResizeObserver|undefined;
function position(){
 const element=panel.value;if(!element||!props.anchor)return;
 const anchor=props.anchor.getBoundingClientRect();const margin=8;const gap=8;
 const width=Math.min(props.width||anchor.width,window.innerWidth-margin*2);
 element.style.width=width+'px';element.style.maxHeight='none';
 const height=element.getBoundingClientRect().height;
 const below=Math.max(0,window.innerHeight-anchor.bottom-gap-margin);const above=Math.max(0,anchor.top-gap-margin);
 const upward=height>below&&above>below;const available=upward?above:below;
 element.style.maxHeight=available+'px';
 element.style.left=Math.max(margin,Math.min(anchor.left,window.innerWidth-width-margin))+'px';
 element.style.top=Math.max(margin,upward?anchor.top-gap-Math.min(height,available):anchor.bottom+gap)+'px';
}
function scroll(event:Event){if(!panel.value?.contains(event.target as Node))position();}
function toggle(event:Event){if((event as ToggleEvent).newState==='closed')emit('close');}
onMounted(()=>{
 panel.value?.showPopover?.();position();
 window.addEventListener('resize',position);document.addEventListener('scroll',scroll,true);
 if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(position);if(props.anchor)observer.observe(props.anchor);}
});
onUpdated(position);
onBeforeUnmount(()=>{observer?.disconnect();window.removeEventListener('resize',position);document.removeEventListener('scroll',scroll,true);panel.value?.hidePopover?.();});
</script>
<template><div :id="id" ref="panel" popover="auto" class="floating-panel rounded-lg border border-line bg-white text-ink shadow-lg" @toggle="toggle"><slot/></div></template>
<style scoped>
.floating-panel { position:fixed; inset:auto; margin:0; padding:0; overflow:auto; }
.floating-panel:popover-open { display:flex; flex-direction:column; }
</style>
