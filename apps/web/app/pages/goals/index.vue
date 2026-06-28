<script setup lang="ts">
import GoalsPageShell from '~/components/goals/GoalsPageShell.vue'

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
