<script setup lang="ts">
defineOptions({
  name: 'CreditCardsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})
</script>

<template>
  <CreditCardsPageShell />
</template>
