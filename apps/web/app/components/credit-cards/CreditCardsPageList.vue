<script setup lang="ts">
import type { CreditCard } from '~/types/credit-cards'
import CreditCardsPageListItem from '~/components/credit-cards/CreditCardsPageListItem.vue'

defineOptions({
  name: 'CreditCardsPageList'
})

const props = defineProps<{
  creditCards: CreditCard[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const showOnlyActiveCreditCards = ref<boolean>(true)

const filteredCreditCards = computed<CreditCard[]>(() => {
  return props.creditCards.filter(creditCard => !showOnlyActiveCreditCards.value || !creditCard.endDate)
})
</script>

<template>
  <section class="rounded-lg border border-default bg-default">
    <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-3">
      <h2 class="text-sm font-medium text-highlighted">
        Cards
      </h2>

      <USwitch
        v-model="showOnlyActiveCreditCards"
        label="Active only"
        :disabled="isLoading"
      />
    </div>

    <div
      v-if="isLoading"
      class="space-y-3 p-5"
    >
      <USkeleton class="h-16 w-full" />
      <USkeleton class="h-16 w-full" />
    </div>

    <div
      v-else-if="filteredCreditCards.length"
      class="divide-y divide-default"
    >
      <CreditCardsPageListItem
        v-for="creditCard in filteredCreditCards"
        :key="creditCard.id"
        :credit-card="creditCard"
        @refresh="emit('refresh')"
      />
    </div>

    <div
      v-else
      class="px-5 py-4 text-sm text-muted"
    >
      <template v-if="!creditCards.length">
        No credit cards found.
      </template>
      <template v-else-if="showOnlyActiveCreditCards">
        No active credit cards found for this selection.
      </template>
      <template v-else>
        No credit cards found for this selection.
      </template>
    </div>
  </section>
</template>
