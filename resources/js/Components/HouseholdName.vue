<script setup lang="ts">
import {ref,watch} from 'vue';import ConfirmDialog from './ConfirmDialog.vue';import {useDraftGuard} from '../lib/useDraftGuard';
import {useForm} from '@inertiajs/vue3';
const props=defineProps<{household:any}>();
const form=useForm({name:props.household.name,lock_version:props.household.data_version||1,command_key:crypto.randomUUID()});
watch(()=>props.household,household=>{if(!form.isDirty){form.name=household.name;form.lock_version=household.data_version;form.defaults();}});
const saving=ref(false);const draft=useDraftGuard(()=>form.isDirty,()=>form.processing||saving.value,()=>form.reset());
function save(){saving.value=true;form.command_key=crypto.randomUUID();form.patch('/household',{preserveScroll:true,onFinish:()=>saving.value=false,onSuccess:()=>{form.lock_version=props.household.data_version;form.defaults();},onNetworkError:()=>{form.setError('name','Could not save. Your name is still here; try again.');return false;},onHttpException:response=>{form.setError('name',response.status===409?'The household name changed. Reload before saving.':'The name could not be saved.');return false;}});}
</script>
<template><div><form class="panel p-5" @submit.prevent="save"><div class="flex items-start justify-between"><h2>{{household.name}}</h2><span class="help">{{household.owner?'You are the owner':'You are a member'}}</span></div><div class="mt-4 field max-w-lg"><label for="household-name">Household name</label><div class="flex gap-2"><input id="household-name" v-model="form.name" required maxlength="100"/><button class="btn" :disabled="form.processing">{{form.processing?'Saving…':'Save'}}</button></div><p v-if="form.errors.name" role="alert" class="help text-warning">{{form.errors.name}}</p></div></form><ConfirmDialog :open="draft.discard.value" title="Discard unsaved changes?" @cancel="draft.cancel" @confirm="draft.confirm">Your changes have not been saved.</ConfirmDialog></div></template>
