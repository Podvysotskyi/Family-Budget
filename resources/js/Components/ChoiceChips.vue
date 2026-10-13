<script setup lang="ts">
defineProps<{modelValue:string;options:{value:string;label:string}[];label:string}>();
defineEmits<{'update:modelValue':[value:string]}>();
</script>
<template><div role="radiogroup" :aria-label="label" class="flex flex-wrap gap-1.5"><button v-for="option in options" :key="option.value" type="button" role="radio" :aria-checked="modelValue===option.value" class="rounded-md border px-3 py-2 text-xs font-medium" :class="modelValue===option.value?'border-ink bg-ink text-white':'border-control bg-white hover:bg-ground'" @click="$emit('update:modelValue',option.value)" @keydown.right.prevent="$emit('update:modelValue',options[(options.findIndex(o=>o.value===modelValue)+1)%options.length].value)" @keydown.left.prevent="$emit('update:modelValue',options[(options.findIndex(o=>o.value===modelValue)+options.length-1)%options.length].value)">{{option.label}}</button></div></template>
