import {nextTick,onBeforeUnmount,ref} from 'vue';
import {router} from '@inertiajs/vue3';

export function useDraftGuard(isDirty:()=>boolean,isBusy:()=>boolean,reset:()=>void){
 const discard=ref(false);let pending:(()=>void)|undefined;
 function runAction(action:()=>void){if(isBusy())return;if(isDirty()){pending=action;discard.value=true;}else action();}
 function cancel(){discard.value=false;pending=undefined;}
 async function confirm(){const action=pending;pending=undefined;reset();discard.value=false;await nextTick();action?.();}
 const stop=router.on('before',event=>{if(!isDirty()||isBusy())return;event.preventDefault();const visit=event.detail.visit;runAction(()=>router.visit(visit.url,visit));});
 function beforeUnload(event:BeforeUnloadEvent){if(isDirty()){event.preventDefault();event.returnValue='';}}
 window.addEventListener('beforeunload',beforeUnload);
 onBeforeUnmount(()=>{stop();window.removeEventListener('beforeunload',beforeUnload);});
 return {discard,runAction,cancel,confirm};
}
