<script setup lang="ts">
import SubscriptionsPageHeader from '~/components/subscriptions/SubscriptionsPageHeader.vue'
import SubscriptionsPageList from '~/components/subscriptions/SubscriptionsPageList.vue'

defineOptions({
  name: 'UserSubscriptionsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const route = useRoute()
const authStore = useAuthStore()
const householdStore = useHouseholdStore()
const subscriptionsStore = useSubscriptionsStore()

const routeUserId = computed<string>(() => String(route.params.id || '').trim())

const isLoading = computed<boolean>(() => authStore.isLoading || householdStore.isLoading || subscriptionsStore.isLoading)

async function refresh() {
  await subscriptionsStore.fetchUserSubscriptions(routeUserId.value)
}

watch(routeUserId, async () => {
  await refresh()
}, { immediate: true })

await Promise.all([
  householdStore.fetchHousehold()
])
</script>

<template>
  <UContainer class="py-6">
    <SubscriptionsPageHeader
      :user-id="routeUserId"
      @refresh="refresh"
    />

    <SubscriptionsPageList
      :subscriptions="subscriptionsStore.userSubscriptionList(routeUserId)"
      :is-loading="isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
