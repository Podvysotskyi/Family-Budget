<script setup lang="ts">
import SubscriptionsPageShell from '~/components/subscriptions/SubscriptionsPageShell.vue'

defineOptions({
  name: 'UserSubscriptionsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const route = useRoute()
const subscriptionUserId = computed(() => String(route.params.id))
</script>

<template>
  <SubscriptionsPageShell :subscription-user-id="subscriptionUserId" />
</template>
