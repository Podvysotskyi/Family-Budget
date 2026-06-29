<script setup lang="ts">
import type { CreditCard } from '~/types/credit-cards'
import CreditCardCancelModal from '~/components/credit-cards/CreditCardCancelModal.vue'
import CreditCardCreateModal from '~/components/credit-cards/CreditCardCreateModal.vue'
import CreditCardEditModal from '~/components/credit-cards/CreditCardEditModal.vue'
import CreditCardUpdateBalanceModal from '~/components/credit-cards/CreditCardUpdateBalanceModal.vue'
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

const creditCardCancelModal = ref<InstanceType<typeof CreditCardCancelModal> | null>(null)
const creditCardCreateModal = ref<InstanceType<typeof CreditCardCreateModal> | null>(null)
const creditCardEditModal = ref<InstanceType<typeof CreditCardEditModal> | null>(null)
const creditCardUpdateBalanceModal = ref<InstanceType<typeof CreditCardUpdateBalanceModal> | null>(null)

await refresh()

async function refresh() {
  await creditCardsStore.fetchHouseholdCreditCards(householdStore.householdId)
}

function startCreatingCreditCard() {
  creditCardCreateModal.value?.open(null)
}

function startEditingCreditCard(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  creditCardEditModal.value?.open(creditCard)
}

function startDeletingCreditCard(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  creditCardCancelModal.value?.open(creditCard)
}

function startEditingCreditCardBalance(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  creditCardUpdateBalanceModal.value?.open(creditCard)
}

</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="null"
      @create-credit-card="startCreatingCreditCard"
    />

    <CreditCardsPageList
      :credit-cards="creditCardsStore.householdCreditCardList"
      :is-loading="creditCardsStore.isLoading"
      @update-balance="startEditingCreditCardBalance"
      @edit="startEditingCreditCard"
      @cancel="startDeletingCreditCard"
    />

    <CreditCardCreateModal
      ref="creditCardCreateModal"
      @created="refresh"
    />

    <CreditCardEditModal
      ref="creditCardEditModal"
      @saved="refresh"
    />

    <CreditCardUpdateBalanceModal
      ref="creditCardUpdateBalanceModal"
      @saved="refresh"
    />

    <CreditCardCancelModal
      ref="creditCardCancelModal"
      @saved="refresh"
    />
  </UContainer>
</template>
