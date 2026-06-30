<script setup lang="ts">
defineOptions({
  name: 'HouseholdSubscriptionsRedirectPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

await navigateTo('/subscriptions')
</script>

<template>
  <div />
</template>
