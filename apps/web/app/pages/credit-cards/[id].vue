<script setup lang="ts">
import type { CreditCard } from '~/types/credit-cards'
import CreditCardCancelModal from '~/components/credit-cards/CreditCardCancelModal.vue'
import CreditCardCreateModal from '~/components/credit-cards/CreditCardCreateModal.vue'
import CreditCardEditModal from '~/components/credit-cards/CreditCardEditModal.vue'
import CreditCardUpdateBalanceModal from '~/components/credit-cards/CreditCardUpdateBalanceModal.vue'
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

const creditCardCancelModal = ref<InstanceType<typeof CreditCardCancelModal> | null>(null)
const creditCardCreateModal = ref<InstanceType<typeof CreditCardCreateModal> | null>(null)
const creditCardEditModal = ref<InstanceType<typeof CreditCardEditModal> | null>(null)
const creditCardUpdateBalanceModal = ref<InstanceType<typeof CreditCardUpdateBalanceModal> | null>(null)

const isLoading = computed<boolean>(() => authStore.isLoading || householdStore.isLoading || creditCardsStore.isLoading)

async function refresh() {
  await creditCardsStore.fetchUserCreditCards(selectedUserId.value)
}

function createCreditCard() {
  creditCardCreateModal.value?.open(selectedUserId.value)
}

function editCreditCard(creditCard: CreditCard) {
  creditCardEditModal.value?.open(creditCard)
}

function deleteCreditCard(creditCard: CreditCard) {
  creditCardCancelModal.value?.open(creditCard)
}

function editCreditCardBalance(creditCard: CreditCard) {
  creditCardUpdateBalanceModal.value?.open(creditCard)
}

watch(routeUserId, async () => {
  await refresh()
}, { immediate: true })

if (import.meta.client) {
  void householdStore.fetchHousehold()
}
</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="selectedUserId"
      @create-credit-card="createCreditCard"
    />

    <CreditCardsPageList
      :credit-cards="creditCardsStore.userCreditCardList(selectedUserId)"
      :is-loading="isLoading"
      @update-balance="editCreditCardBalance"
      @edit="editCreditCard"
      @cancel="deleteCreditCard"
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
