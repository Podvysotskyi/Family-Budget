<script setup lang="ts">
import {computed} from 'vue';
import SelectField from './SelectField.vue';
const props=defineProps<{modelValue:string|null;categories:any[];kind?:string;id?:string;required?:boolean}>();
const emit=defineEmits<{'update:modelValue':[value:string|null]}>();
function path(category:any){const parent=props.categories.find(c=>c.id===category.parent_id);return (parent?parent.name+' › ':'')+category.name;}
const options=computed(()=>[{value:null,label:props.required?'Choose a category':'Uncategorized'},...props.categories.filter(category=>!props.kind||category.kind===props.kind).sort((a,b)=>path(a).localeCompare(path(b))).map(category=>({value:category.id as string,label:path(category),indent:Boolean(category.parent_id)}))]);
</script>
<template><SelectField :id="id" :required="required" :model-value="modelValue" :options="options" :placeholder="required?'Choose a category':'Uncategorized'" searchable search-label="Search categories" empty-message="No matching categories." @update:model-value="emit('update:modelValue',$event)"/></template>
