<script setup lang="ts">
import type { CreditCard } from '~/stores/credit-cards'

defineOptions({
  name: 'CreditCardsPageShell'
})

const householdAssignmentValue = 'household'
const dashboardStore = useDashboardStore()
const creditCardsStore = useCreditCardsStore()
await dashboardStore.fetchDashboard()
const householdId = computed(() => dashboardStore.householdId)
const members = computed(() => dashboardStore.members)
const creditCards = computed(() => creditCardsStore.getCreditCards(householdId.value))
const pending = computed(() => creditCardsStore.isLoading(householdId.value))
const error = computed(() => creditCardsStore.getError(householdId.value))
const showOnlyActiveCreditCards = ref(true)
const creditCardPendingDelete = ref<CreditCard | null>(null)
const deletingCreditCardId = ref<string | null>(null)
const deletionError = ref<string | null>(null)
const editingCreditCardId = ref<string | null>(null)
const formError = ref<string | null>(null)
const isCreditCardModalOpen = ref(false)
const isSavingCreditCard = ref(false)
const creditCardName = ref('')
const creditCardUserId = ref(getDefaultCreditCardUserId())
const creditCardStartDate = ref(getTodayDate())
const creditCardEndDate = ref('')
const creditCardDueDate = ref(getTodayDate())
const creditCardLimit = ref('')
const creditCardLimitEffectiveDate = ref(getTodayDate())
const hasMultipleMembers = computed(() => members.value.length > 1)
const assignmentOptions = computed(() => {
  return [
    ...(hasMultipleMembers.value
      ? [{
          label: 'Household',
          value: householdAssignmentValue
        }]
      : []),
    ...(dashboardStore.user
      ? [{
          label: dashboardStore.user.name || dashboardStore.user.email,
          value: dashboardStore.user.id
        }]
      : [])
  ]
})
const trimmedCreditCardName = computed(() => creditCardName.value.trim())
const parsedCreditCardLimit = computed(() => Number(creditCardLimit.value))
const isEditingCreditCard = computed(() => Boolean(editingCreditCardId.value))
const canSaveCreditCard = computed(() => {
  return Boolean(!pending.value && trimmedCreditCardName.value && householdId.value && creditCardLimit.value)
})
const filteredCreditCards = computed(() => {
  return creditCards.value.filter(creditCard => !showOnlyActiveCreditCards.value || isActiveCreditCard(creditCard))
})
const emptyCreditCardsMessage = computed(() => {
  if (!creditCards.value.length) {
    return 'No credit cards found.'
  }

  return showOnlyActiveCreditCards.value ? 'No active credit cards found.' : 'No credit cards found.'
})

if (householdId.value) {
  await refresh()
}

watch(householdId, async (id) => {
  if (id) {
    await refresh()
  }
})

watch(() => dashboardStore.user?.id, () => {
  if (!creditCardUserId.value || (!hasMultipleMembers.value && creditCardUserId.value === householdAssignmentValue)) {
    creditCardUserId.value = getDefaultCreditCardUserId()
  }
}, { immediate: true })

watch(hasMultipleMembers, (multipleMembers) => {
  if (!multipleMembers && creditCardUserId.value === householdAssignmentValue) {
    creditCardUserId.value = getDefaultCreditCardUserId()
  }
}, { immediate: true })

async function refresh() {
  await creditCardsStore.fetchCreditCards(householdId.value)
}

function resetForm() {
  editingCreditCardId.value = null
  formError.value = null
  creditCardName.value = ''
  creditCardUserId.value = getDefaultCreditCardUserId()
  creditCardStartDate.value = getTodayDate()
  creditCardEndDate.value = ''
  creditCardDueDate.value = getTodayDate()
  creditCardLimit.value = ''
  creditCardLimitEffectiveDate.value = getTodayDate()
}

function startCreatingCreditCard() {
  resetForm()
  isCreditCardModalOpen.value = true

  if (import.meta.client) {
    nextTick(() => document.getElementById('credit-card-name')?.focus())
  }
}

function closeCreditCardModal() {
  isCreditCardModalOpen.value = false
  resetForm()
}

function setCreditCardModalOpen(open: boolean) {
  if (open) {
    isCreditCardModalOpen.value = true
    return
  }

  closeCreditCardModal()
}

function startEditingCreditCard(creditCard: CreditCard) {
  const latestLimit = creditCard.limits[0]
  formError.value = null
  editingCreditCardId.value = creditCard.id
  creditCardName.value = creditCard.name
  creditCardUserId.value = creditCard.userId || getDefaultCreditCardUserId()
  creditCardStartDate.value = creditCard.startDate
  creditCardEndDate.value = creditCard.endDate || ''
  creditCardDueDate.value = creditCard.dueDate
  creditCardLimit.value = String(creditCard.currentLimit || latestLimit?.limit || '')
  creditCardLimitEffectiveDate.value = latestLimit?.date || getTodayDate()
  isCreditCardModalOpen.value = true

  if (import.meta.client) {
    nextTick(() => document.getElementById('credit-card-name')?.focus())
  }
}

function startDeletingCreditCard(creditCard: CreditCard) {
  deletionError.value = null
  creditCardPendingDelete.value = creditCard
}

function closeDeletionModal() {
  creditCardPendingDelete.value = null
  deletionError.value = null
}

async function saveCreditCard() {
  formError.value = null

  if (!householdId.value) {
    formError.value = 'Household is required.'
    return
  }

  if (!trimmedCreditCardName.value) {
    formError.value = 'Credit card name is required.'
    return
  }

  if (!isDateString(creditCardStartDate.value)) {
    formError.value = 'Start date is required.'
    return
  }

  if (creditCardEndDate.value && creditCardEndDate.value < creditCardStartDate.value) {
    formError.value = 'End date must be on or after the start date.'
    return
  }

  if (!isDateString(creditCardDueDate.value)) {
    formError.value = 'Due date is required.'
    return
  }

  if (!isDateString(creditCardLimitEffectiveDate.value)) {
    formError.value = 'Limit effective date is required.'
    return
  }

  if (!Number.isFinite(parsedCreditCardLimit.value) || parsedCreditCardLimit.value <= 0) {
    formError.value = 'Limit must be greater than zero.'
    return
  }

  isSavingCreditCard.value = true

  try {
    const input = {
      name: trimmedCreditCardName.value,
      userId: getCreditCardUserId(),
      startDate: creditCardStartDate.value,
      endDate: creditCardEndDate.value || null,
      dueDate: creditCardDueDate.value,
      limit: parsedCreditCardLimit.value,
      limitEffectiveDate: creditCardLimitEffectiveDate.value
    }

    if (editingCreditCardId.value) {
      await creditCardsStore.updateCreditCard(householdId.value, editingCreditCardId.value, input)
    } else {
      await creditCardsStore.createCreditCard(householdId.value, input)
    }

    closeCreditCardModal()
  } catch {
    formError.value = editingCreditCardId.value ? 'Credit card could not be saved.' : 'Credit card could not be created.'
  } finally {
    isSavingCreditCard.value = false
  }
}

async function deleteCreditCard() {
  deletionError.value = null

  if (!creditCardPendingDelete.value) {
    return
  }

  if (!householdId.value) {
    deletionError.value = 'Household is required.'
    return
  }

  deletingCreditCardId.value = creditCardPendingDelete.value.id

  try {
    await creditCardsStore.deleteCreditCard(householdId.value, creditCardPendingDelete.value.id)
    closeDeletionModal()
  } catch {
    deletionError.value = 'Credit card could not be closed.'
  } finally {
    deletingCreditCardId.value = null
  }
}

function getCreditCardUserId() {
  if (!hasMultipleMembers.value) {
    return dashboardStore.user?.id || null
  }

  return creditCardUserId.value === householdAssignmentValue ? null : creditCardUserId.value
}

function getDefaultCreditCardUserId() {
  if (!hasMultipleMembers.value) {
    return dashboardStore.user?.id || ''
  }

  return dashboardStore.user?.id || householdAssignmentValue
}

function getCreditCardAssignmentLabel(creditCard: CreditCard) {
  if (!creditCard.user && !hasMultipleMembers.value && dashboardStore.user) {
    return dashboardStore.user.name || dashboardStore.user.email
  }

  if (!creditCard.user) {
    return 'Household'
  }

  return creditCard.user.name || creditCard.user.email
}

function getLatestLimitDate(creditCard: CreditCard) {
  return creditCard.limits[0]?.date || null
}

function isActiveCreditCard(creditCard: CreditCard) {
  const today = getTodayDate()

  return !creditCard.endDate || creditCard.endDate >= today
}

function isClosedCreditCard(creditCard: CreditCard) {
  const today = getTodayDate()

  return Boolean(creditCard.endDate && creditCard.endDate < today)
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return 'No limit'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No end date'
  }

  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
</script>

<template>
  <UContainer class="py-6">
    <div class="mb-5 flex flex-col gap-3 border-b border-default pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-base font-semibold text-highlighted">
          Credit cards
        </h1>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
        <UButton
          icon="i-lucide-plus"
          label="New credit card"
          :disabled="pending || isSavingCreditCard || !householdId"
          @click="startCreatingCreditCard"
        />
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default">
      <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-3">
        <h2 class="text-sm font-medium text-highlighted">
          Cards
        </h2>

        <USwitch
          v-model="showOnlyActiveCreditCards"
          label="Active only"
          :disabled="pending || !householdId"
        />
      </div>

      <div
        v-if="pending"
        class="space-y-3 p-5"
      >
        <USkeleton class="h-16 w-full" />
        <USkeleton class="h-16 w-full" />
      </div>

      <div
        v-else-if="error || !householdId"
        class="px-5 py-4 text-sm text-muted"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-database"
          title="Credit cards are unavailable"
          description="Check that your user has a household."
        />
      </div>

      <div
        v-else-if="filteredCreditCards.length"
        class="divide-y divide-default"
      >
        <div
          v-for="creditCard in filteredCreditCards"
          :key="creditCard.id"
          class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ creditCard.name }}
              </p>
              <UBadge
                color="neutral"
                variant="subtle"
                :label="getCreditCardAssignmentLabel(creditCard)"
              />
              <UBadge
                v-if="isClosedCreditCard(creditCard)"
                color="warning"
                variant="subtle"
                label="Closed"
              />
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ formatCurrency(creditCard.currentLimit) }} · Due {{ formatDate(creditCard.dueDate) }} · {{ formatDate(creditCard.startDate) }} - {{ formatDate(creditCard.endDate) }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Limit effective {{ formatDate(getLatestLimitDate(creditCard)) }}
            </p>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              aria-label="Edit credit card"
              :disabled="deletingCreditCardId === creditCard.id"
              @click="startEditingCreditCard(creditCard)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="Close credit card"
              :disabled="deletingCreditCardId === creditCard.id"
              @click="startDeletingCreditCard(creditCard)"
            />
          </div>
        </div>
      </div>

      <div
        v-else
        class="px-5 py-4 text-sm text-muted"
      >
        {{ emptyCreditCardsMessage }}
      </div>
    </section>

    <CreditCardFormModal
      v-model:name="creditCardName"
      v-model:user-id="creditCardUserId"
      v-model:start-date="creditCardStartDate"
      v-model:end-date="creditCardEndDate"
      v-model:due-date="creditCardDueDate"
      v-model:limit="creditCardLimit"
      v-model:limit-effective-date="creditCardLimitEffectiveDate"
      :open="isCreditCardModalOpen"
      :is-editing="isEditingCreditCard"
      :pending="pending"
      :is-saving="isSavingCreditCard"
      :has-household="Boolean(householdId)"
      :form-error="formError"
      :assignment-options="assignmentOptions"
      :can-save="canSaveCreditCard"
      @update:open="setCreditCardModalOpen"
      @cancel="closeCreditCardModal"
      @save="saveCreditCard"
    />

    <CreditCardCloseModal
      :open="Boolean(creditCardPendingDelete)"
      :credit-card-name="creditCardPendingDelete?.name || ''"
      :is-closing="Boolean(deletingCreditCardId)"
      :error="deletionError"
      @update:open="(value: boolean) => !value && closeDeletionModal()"
      @confirm="deleteCreditCard"
    />
  </UContainer>
</template>
