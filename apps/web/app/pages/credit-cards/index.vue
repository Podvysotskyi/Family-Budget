<script setup lang="ts">
import CreditCardsPageHeader from '~/components/credit-cards/CreditCardsPageHeader.vue'
import CreditCardsPageList from '~/components/credit-cards/CreditCardsPageList.vue'

defineOptions({
  name: 'CreditCardsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const authStore = useAuthStore()
const creditCardsStore = useCreditCardsStore()
const householdStore = useHouseholdStore()
await Promise.all([
  authStore.checkSession(),
  householdStore.isLoaded ? Promise.resolve() : householdStore.fetchHousehold()
])

await refresh()

async function refresh() {
  await creditCardsStore.fetchHouseholdCreditCards(householdStore.householdId)
}
</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="null"
      @refresh="refresh"
    />

    <CreditCardsPageList
      :credit-cards="creditCardsStore.householdCreditCardList"
      :is-loading="creditCardsStore.isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
