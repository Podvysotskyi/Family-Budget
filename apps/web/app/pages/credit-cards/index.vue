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
const selectedUserId = computed<string | null>(() => {
  return householdStore.membersCount === 1 ? householdStore.members[0]?.userId || authStore.userId || null : null
})
const creditCards = computed(() => {
  return selectedUserId.value ? creditCardsStore.userCreditCardList(selectedUserId.value) : creditCardsStore.householdCreditCards
})

async function refresh() {
  if (selectedUserId.value) {
    await creditCardsStore.fetchUserCreditCards(selectedUserId.value)
    return
  }

  await creditCardsStore.fetchHouseholdCreditCards(householdStore.householdId)
}

await householdStore.fetchHousehold()
await refresh()
</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="selectedUserId"
      @refresh="refresh"
    />

    <CreditCardsPageList
      :credit-cards="creditCards"
      :is-loading="isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
