<script setup lang="ts">
import type { CreditCard } from '~/types/credit-cards'
import {useAuthStore} from "~/stores/auth";

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
  cancel: [creditCard: CreditCard]
  edit: [creditCard: CreditCard]
  updateBalance: [creditCard: CreditCard]
}>()

const canEditCreditCard = computed<boolean>(() => props.creditCard.userId === null || props.creditCard.userId === authStore.userId)

const assignmentLabel = computed<string>(() => {
  if (!props.creditCard.user) {
    return 'Household'
  }

  return props.creditCard.user.name || props.creditCard.user.email
})
</script>

<template>
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

    <div class="flex items-center gap-1" v-if="canEditCreditCard">
      <UButton
        v-if="!creditCard.endDate"
        icon="i-lucide-wallet"
        color="neutral"
        variant="ghost"
        aria-label="Update credit card balance"
        @click="emit('updateBalance', props.creditCard)"
      />
      <UButton
        v-if="!creditCard.endDate"
        icon="i-lucide-pencil"
        color="neutral"
        variant="ghost"
        aria-label="Edit credit card"
        @click="emit('edit', props.creditCard)"
      />
      <UButton
        v-if="!creditCard.endDate"
        icon="i-lucide-ban"
        color="warning"
        variant="ghost"
        aria-label="Cancel credit card"
        @click="emit('cancel', props.creditCard)"
      />
    </div>
  </div>
</template>
