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
const selectedUserId = computed<string>(() => routeUserId.value)

const isLoading = computed<boolean>(() => authStore.isLoading || householdStore.isLoading || creditCardsStore.isLoading)

async function refresh() {
  await creditCardsStore.fetchUserCreditCards(selectedUserId.value)
}

watch(routeUserId, async () => {
  await refresh()
})

if (import.meta.client) {
  void householdStore.fetchHousehold()
  void refresh()
}
</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="selectedUserId"
      @refresh="refresh"
    />

    <CreditCardsPageList
      :credit-cards="creditCardsStore.userCreditCardList(selectedUserId)"
      :is-loading="isLoading"
      @refresh="refresh"
    />
  </UContainer>
</template>
