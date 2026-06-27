<script setup lang="ts">
defineOptions({
  name: 'CurrentUserSubscriptionsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})
</script>

<template>
  <SubscriptionsPageShell />
</template>
