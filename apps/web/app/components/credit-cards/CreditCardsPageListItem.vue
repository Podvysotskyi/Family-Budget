<script setup lang="ts">
import type { CreditCard } from '~/types/credit-cards'
import CreditCardCancelModal from '~/components/credit-cards/CreditCardCancelModal.vue'
import CreditCardEditModal from '~/components/credit-cards/CreditCardEditModal.vue'
import CreditCardUpdateBalanceModal from '~/components/credit-cards/CreditCardUpdateBalanceModal.vue'
import { useAuthStore } from '~/stores/auth'

defineOptions({
  name: 'CreditCardsPageListItem'
})

const authStore = useAuthStore()
const { formatCurrency } = useCurrencyUtils()
const { formatDateString } = useDateUtils()

const props = defineProps<{
  creditCard: CreditCard
}>()

const emit = defineEmits<{
  refresh: []
}>()

const creditCardCancelModal = ref<InstanceType<typeof CreditCardCancelModal> | null>(null)
const creditCardEditModal = ref<InstanceType<typeof CreditCardEditModal> | null>(null)
const creditCardUpdateBalanceModal = ref<InstanceType<typeof CreditCardUpdateBalanceModal> | null>(null)

const canEditCreditCard = computed<boolean>(() => !props.creditCard.user || props.creditCard.user.userId === authStore.userId)
const canUpdateCreditCard = computed<boolean>(() => canEditCreditCard.value && !props.creditCard.endDate)

const assignmentLabel = computed<string>(() => {
  if (!props.creditCard.user) {
    return 'Household'
  }

  return props.creditCard.user.name
})

function updateBalance() {
  if (!canUpdateCreditCard.value) {
    return
  }

  creditCardUpdateBalanceModal.value?.open(props.creditCard)
}

function editCreditCard() {
  if (!canUpdateCreditCard.value) {
    return
  }

  creditCardEditModal.value?.open(props.creditCard)
}

function cancelCreditCard() {
  if (!canUpdateCreditCard.value) {
    return
  }

  creditCardCancelModal.value?.open(props.creditCard)
}
</script>

<template>
  <div>
    <div class="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ creditCard.name }}
          </p>
          <UBadge
            color="neutral"
            variant="subtle"
            :label="assignmentLabel"
          />
          <UBadge
            v-if="creditCard.endDate"
            color="warning"
            variant="subtle"
            label="Canceled"
          />
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ formatCurrency(creditCard.currentLimit, 'No Limit') }} · Due {{ formatDateString(creditCard.dueDate, 'No end date') }}
        </p>
        <p
          v-if="creditCard.endDate"
          class="mt-1 text-sm text-muted"
        >
          Canceled {{ formatDateString(creditCard.endDate, 'No end date') }}
        </p>
      </div>

      <div class="min-w-0 md:text-right">
        <p class="text-xs font-medium uppercase text-muted">
          Balance
        </p>
        <p class="mt-1 text-sm font-medium text-highlighted">
          {{ formatCurrency(creditCard.currentBalance, 'No balance') }}
        </p>
      </div>

      <div
        v-if="canUpdateCreditCard"
        class="flex items-center gap-1"
      >
        <UButton
          icon="i-lucide-wallet"
          color="neutral"
          variant="ghost"
          aria-label="Update credit card balance"
          @click="updateBalance"
        />
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          aria-label="Edit credit card"
          @click="editCreditCard"
        />
        <UButton
          icon="i-lucide-ban"
          color="warning"
          variant="ghost"
          aria-label="Cancel credit card"
          @click="cancelCreditCard"
        />
      </div>
    </div>

    <CreditCardEditModal
      ref="creditCardEditModal"
      @saved="emit('refresh')"
    />

    <CreditCardUpdateBalanceModal
      ref="creditCardUpdateBalanceModal"
      @saved="emit('refresh')"
    />

    <CreditCardCancelModal
      ref="creditCardCancelModal"
      @saved="emit('refresh')"
    />
  </div>
</template>
