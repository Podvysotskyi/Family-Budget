<script setup lang="ts">
import SubscriptionsPageHeader from '~/components/subscriptions/SubscriptionsPageHeader.vue'
import SubscriptionsPageList from '~/components/subscriptions/SubscriptionsPageList.vue'

defineOptions({
  name: 'SubscriptionsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const authStore = useAuthStore()
const householdStore = useHouseholdStore()
const subscriptionsStore = useSubscriptionsStore()

const isLoading = computed<boolean>(() => authStore.isLoading || householdStore.isLoading || subscriptionsStore.isLoading)

async function refresh() {
  await subscriptionsStore.fetchHouseholdSubscriptions(householdStore.householdId)
}

await householdStore.fetchHousehold()
await refresh()
</script>

<template>
  <UContainer class="py-6">
    <SubscriptionsPageHeader
      :user-id="null"
      @refresh="refresh"
    />

    <SubscriptionsPageList
      :subscriptions="subscriptionsStore.householdSubscriptions"
      :is-loading="isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
