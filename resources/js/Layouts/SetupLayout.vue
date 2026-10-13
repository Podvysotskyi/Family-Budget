<script setup lang="ts">
import AppHeader from '../Components/AppHeader.vue';
withDefaults(defineProps<{narrow?:boolean}>(),{narrow:false});
</script>
<template><div class="min-h-dvh bg-ground"><AppHeader setup/><main class="mx-auto px-6 py-10" :class="narrow?'max-w-xl':'max-w-3xl'"><slot/></main></div></template>
