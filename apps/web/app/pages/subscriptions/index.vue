<script setup lang="ts">
import SubscriptionsPageShell from '~/components/subscriptions/SubscriptionsPageShell.vue'

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
