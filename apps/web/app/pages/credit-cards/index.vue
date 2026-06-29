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
const householdStore = useHouseholdStore()
const creditCardsStore = useCreditCardsStore()

const isLoading = computed<boolean>(() => authStore.isLoading || householdStore.isLoading || creditCardsStore.isLoading)

async function refresh() {
  await creditCardsStore.fetchHouseholdCreditCards(householdStore.householdId)
}

await Promise.all([
  householdStore.fetchHousehold(),
  refresh()
])
</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="null"
      @refresh="refresh"
    />

    <CreditCardsPageList
      :credit-cards="creditCardsStore.householdCreditCards"
      :is-loading="isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
