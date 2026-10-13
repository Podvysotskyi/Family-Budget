<script setup lang="ts">
defineProps<{modelValue:string;options:{value:string;label:string;description?:string}[];label:string}>();
defineEmits<{'update:modelValue':[value:string]}>();
</script>
<template><fieldset class="min-w-0"><legend class="mb-2 text-sm font-medium">{{label}}</legend><div class="flex flex-col gap-2"><label v-for="option in options" :key="option.value" class="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal" :class="modelValue===option.value?'border-ink ring-1 ring-ink':'border-line'"><input type="radio" :name="label" :value="option.value" :checked="modelValue===option.value" class="mt-0.5 accent-ink" @change="$emit('update:modelValue',option.value)"/><span><span class="block font-medium">{{option.label}}</span><span v-if="option.description" class="help mt-1 block">{{option.description}}</span></span></label></div></fieldset></template>
