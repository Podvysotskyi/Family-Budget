<script setup lang="ts">
defineOptions({
  name: 'GoalsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})
</script>

<template>
  <GoalsPageShell />
</template>
