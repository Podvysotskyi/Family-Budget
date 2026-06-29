<script setup lang="ts">
import CreditCardsPageHeader from '~/components/credit-cards/CreditCardsPageHeader.vue'
import CreditCardsPageList from '~/components/credit-cards/CreditCardsPageList.vue'

defineOptions({
  name: 'UserCreditCardsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const route = useRoute()
const authStore = useAuthStore()
const householdStore = useHouseholdStore()
const creditCardsStore = useCreditCardsStore()

const routeUserId = computed<string>(() => String(route.params.id || '').trim())

const isLoading = computed<boolean>(() => authStore.isLoading || householdStore.isLoading || creditCardsStore.isLoading)

async function refresh() {
  await creditCardsStore.fetchUserCreditCards(routeUserId.value)
}

watch(routeUserId, async () => {
  await refresh()
}, {immediate: true})

await Promise.all([
  householdStore.fetchHousehold(),
])
</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="routeUserId"
      @refresh="refresh"
    />

    <CreditCardsPageList
      :credit-cards="creditCardsStore.userCreditCardList(routeUserId)"
      :is-loading="isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
