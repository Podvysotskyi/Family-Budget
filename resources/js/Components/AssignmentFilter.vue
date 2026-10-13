<script setup lang="ts">
import {computed,useId} from 'vue';
import SelectField from './SelectField.vue';
const props=defineProps<{modelValue:string;members:{id:string;nickname:string}[]}>();
const emit=defineEmits<{'update:modelValue':[value:string];change:[]}>();
const id=useId();
const options=computed(()=>[{value:'',label:'All assignments'},{value:'household',label:'Household'},...props.members.map(member=>({value:member.id,label:member.nickname}))]);
</script>
<template><div class="flex max-w-full flex-wrap items-center gap-2"><label :for="id">Assignment</label><SelectField :id="id" :model-value="modelValue" :options="options" searchable class="w-52! max-w-full" search-label="Search household members" @update:model-value="value=>emit('update:modelValue',value)" @change="emit('change')"/></div></template>
