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
const selectedUserId = computed<string | null>(() => {
  return householdStore.membersCount === 1 ? householdStore.members[0]?.userId || authStore.userId || null : null
})
const subscriptions = computed(() => {
  return selectedUserId.value ? subscriptionsStore.userSubscriptionList(selectedUserId.value) : subscriptionsStore.householdSubscriptions
})

async function refresh() {
  if (selectedUserId.value) {
    await subscriptionsStore.fetchUserSubscriptions(selectedUserId.value)
    return
  }

  await subscriptionsStore.fetchHouseholdSubscriptions(householdStore.householdId)
}

await householdStore.fetchHousehold()
await refresh()
</script>

<template>
  <UContainer class="py-6">
    <SubscriptionsPageHeader
      :user-id="selectedUserId"
      @refresh="refresh"
    />

    <SubscriptionsPageList
      :subscriptions="subscriptions"
      :is-loading="isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
