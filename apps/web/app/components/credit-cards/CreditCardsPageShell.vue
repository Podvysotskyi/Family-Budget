<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { CreditCard } from '~/types/credit-cards'
import CreditCardBalanceModal from '~/components/credit-cards/CreditCardBalanceModal.vue'
import CreditCardCloseModal from '~/components/credit-cards/CreditCardCloseModal.vue'
import CreditCardFormModal from '~/components/credit-cards/CreditCardFormModal.vue'

defineOptions({
  name: 'CreditCardsPageShell'
})

const props = defineProps<{
  creditCardUserId?: string
}>()

const householdAssignmentValue = 'household'
const dashboardStore = useDashboardStore()
const creditCardsStore = useCreditCardsStore()
const { getTodayDate } = useDateUtils()
await dashboardStore.fetchDashboard()
const householdId = computed(() => dashboardStore.householdId)
const members = computed(() => dashboardStore.members)
const creditCards = computed(() => creditCardsStore.getCreditCards(householdId.value))
const pending = computed(() => creditCardsStore.isLoading(householdId.value))
const error = computed(() => creditCardsStore.getError(householdId.value))
const assignmentFilter = ref(getDefaultAssignmentFilter())
const showOnlyActiveCreditCards = ref(true)
const creditCardPendingDelete = ref<CreditCard | null>(null)
const deletingCreditCardId = ref<string | null>(null)
const deletionError = ref<string | null>(null)
const cancellationEffectiveDate = ref(getTodayDate())
const creditCardBalanceModal = ref<InstanceType<typeof CreditCardBalanceModal> | null>(null)
const editingCreditCardId = ref<string | null>(null)
const formError = ref<string | null>(null)
const isCreditCardModalOpen = ref(false)
const isSavingCreditCard = ref(false)
const creditCardName = ref('')
const hasMultipleMembers = computed(() => members.value.length > 1)
const creditCardAssigneeId = ref(getDefaultCreateCreditCardUserId())
const creditCardStartDate = ref(getTodayDate())
const creditCardDueDate = ref(getTodayDate())
const creditCardLimit = ref<string | number>('')
const creditCardNavigationItems = computed<NavigationMenuItem[]>(() => {
  return [
    ...(hasMultipleMembers.value
      ? [{
          label: 'Household',
          icon: assignmentFilter.value === householdAssignmentValue ? 'i-lucide-circle-dot' : 'i-lucide-circle',
          to: buildCreditCardAssignmentPath(householdAssignmentValue),
          active: assignmentFilter.value === householdAssignmentValue
        }]
      : []),
    ...members.value.map(member => ({
      label: member.name || member.email,
      icon: member.userId === assignmentFilter.value ? 'i-lucide-circle-dot' : 'i-lucide-circle',
      to: buildCreditCardAssignmentPath(member.userId),
      active: member.userId === assignmentFilter.value
    }))
  ]
})
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
const creditCardDueDateMin = computed(() => isEditingCreditCard.value ? creditCardStartDate.value : undefined)
const creditCardCancellationDateMin = computed(() => creditCardPendingDelete.value?.startDate || '')
const canSaveCreditCard = computed(() => {
  return Boolean(!pending.value && trimmedCreditCardName.value && householdId.value && creditCardLimit.value)
})
const canCreateCreditCard = computed(() => {
  return assignmentFilter.value === householdAssignmentValue || assignmentFilter.value === dashboardStore.user?.id
})
const filteredCreditCards = computed(() => {
  return creditCards.value.filter((creditCard) => {
    const matchesAssignment = (assignmentFilter.value === householdAssignmentValue && !creditCard.userId)
      || creditCard.userId === assignmentFilter.value

    return matchesAssignment && (!showOnlyActiveCreditCards.value || isActiveCreditCard(creditCard))
  })
})
const emptyCreditCardsMessage = computed(() => {
  if (!creditCards.value.length) {
    return 'No credit cards found.'
  }

  return showOnlyActiveCreditCards.value ? 'No active credit cards found for this selection.' : 'No credit cards found for this selection.'
})

if (householdId.value) {
  await refresh()
}

watch(householdId, async (id) => {
  if (id) {
    await refresh()
  }
})

watch(() => props.creditCardUserId, () => {
  assignmentFilter.value = getDefaultAssignmentFilter()
}, { immediate: true })

watch(() => dashboardStore.user?.id, () => {
  assignmentFilter.value = getDefaultAssignmentFilter()

  if (!creditCardAssigneeId.value || (!hasMultipleMembers.value && creditCardAssigneeId.value === householdAssignmentValue)) {
    creditCardAssigneeId.value = getDefaultCreateCreditCardUserId()
  }
}, { immediate: true })

watch(hasMultipleMembers, (multipleMembers) => {
  if (!multipleMembers && creditCardAssigneeId.value === householdAssignmentValue) {
    creditCardAssigneeId.value = getDefaultCreateCreditCardUserId()
  }
}, { immediate: true })

async function refresh() {
  await creditCardsStore.fetchCreditCards(householdId.value)
}

function resetForm() {
  editingCreditCardId.value = null
  formError.value = null
  creditCardName.value = ''
  creditCardAssigneeId.value = getDefaultCreateCreditCardUserId()
  creditCardStartDate.value = getTodayDate()
  creditCardDueDate.value = getTodayDate()
  creditCardLimit.value = ''
}

function startCreatingCreditCard() {
  if (!canCreateCreditCard.value) {
    return
  }

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
  if (creditCard.endDate) {
    return
  }

  const latestLimit = creditCard.limits[0]
  formError.value = null
  editingCreditCardId.value = creditCard.id
  creditCardName.value = creditCard.name
  creditCardAssigneeId.value = creditCard.userId || getDefaultCreateCreditCardUserId()
  creditCardStartDate.value = creditCard.startDate
  creditCardDueDate.value = creditCard.dueDate
  creditCardLimit.value = String(creditCard.currentLimit || latestLimit?.limit || '')
  isCreditCardModalOpen.value = true

  if (import.meta.client) {
    nextTick(() => document.getElementById('credit-card-name')?.focus())
  }
}

function startDeletingCreditCard(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  deletionError.value = null
  cancellationEffectiveDate.value = getTodayDate()
  creditCardPendingDelete.value = creditCard
}

function closeDeletionModal() {
  creditCardPendingDelete.value = null
  deletionError.value = null
  cancellationEffectiveDate.value = getTodayDate()
}

function startEditingCreditCardBalance(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  creditCardBalanceModal.value?.open(creditCard)
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

  if (editingCreditCardId.value && !isDateString(creditCardStartDate.value)) {
    formError.value = 'Start date is required.'
    return
  }

  if (!isDateString(creditCardDueDate.value)) {
    formError.value = 'Due date is required.'
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
      dueDate: creditCardDueDate.value,
      limit: parsedCreditCardLimit.value
    }

    if (editingCreditCardId.value) {
      await creditCardsStore.updateCreditCard(householdId.value, editingCreditCardId.value, {
        ...input,
        startDate: creditCardStartDate.value
      })
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

async function cancelCreditCard() {
  deletionError.value = null

  if (!creditCardPendingDelete.value) {
    return
  }

  if (!householdId.value) {
    deletionError.value = 'Household is required.'
    return
  }

  if (!cancellationEffectiveDate.value) {
    deletionError.value = 'Effective date is required.'
    return
  }

  if (cancellationEffectiveDate.value < creditCardPendingDelete.value.startDate) {
    deletionError.value = 'Effective date must be on or after the start date.'
    return
  }

  if (creditCardPendingDelete.value.endDate) {
    deletionError.value = 'Credit card is already canceled.'
    return
  }

  deletingCreditCardId.value = creditCardPendingDelete.value.id

  try {
    await creditCardsStore.cancelCreditCard(householdId.value, creditCardPendingDelete.value.id, {
      effectiveDate: cancellationEffectiveDate.value
    })
    closeDeletionModal()
  } catch {
    deletionError.value = 'Credit card could not be canceled.'
  } finally {
    deletingCreditCardId.value = null
  }
}

function getCreditCardUserId() {
  if (!hasMultipleMembers.value) {
    return dashboardStore.user?.id || null
  }

  return creditCardAssigneeId.value === householdAssignmentValue ? null : creditCardAssigneeId.value
}

function getDefaultAssignmentFilter() {
  const creditCardAssignment = props.creditCardUserId?.trim() || null

  if (creditCardAssignment === householdAssignmentValue) {
    return householdAssignmentValue
  }

  if (creditCardAssignment && members.value.some(member => member.userId === creditCardAssignment)) {
    return creditCardAssignment
  }

  return dashboardStore.user?.id || householdAssignmentValue
}

function getDefaultCreateCreditCardUserId() {
  if (!hasMultipleMembers.value) {
    return dashboardStore.user?.id || ''
  }

  if (assignmentFilter.value === householdAssignmentValue || assignmentFilter.value === dashboardStore.user?.id) {
    return assignmentFilter.value
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

function isActiveCreditCard(creditCard: CreditCard) {
  return !creditCard.endDate
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

function formatBalance(value: number | null) {
  if (value === null) {
    return 'No balance'
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

function buildCreditCardAssignmentPath(assignment: string) {
  if (assignment === dashboardStore.defaultBudgetUserId) {
    return '/credit-cards'
  }

  return `/credit-cards/${encodeURIComponent(assignment)}`
}

</script>

<template>
  <UContainer class="py-6">
    <div class="mb-5 flex flex-col gap-3 border-b border-default pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        v-if="creditCardNavigationItems.length"
        class="min-w-0 overflow-x-auto"
      >
        <UNavigationMenu
          :items="creditCardNavigationItems"
          orientation="horizontal"
          :ui="{ link: 'whitespace-nowrap' }"
        />
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
        <UButton
          icon="i-lucide-plus"
          label="New credit card"
          :disabled="pending || isSavingCreditCard || !householdId || !canCreateCreditCard"
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
          class="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-center"
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
                v-if="creditCard.endDate"
                color="warning"
                variant="subtle"
                label="Canceled"
              />
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ formatCurrency(creditCard.currentLimit) }} · Due {{ formatDate(creditCard.dueDate) }}
            </p>
            <p
              v-if="creditCard.endDate"
              class="mt-1 text-sm text-muted"
            >
              Canceled {{ formatDate(creditCard.endDate) }}
            </p>
          </div>

          <div class="min-w-0 md:text-right">
            <p class="text-xs font-medium uppercase text-muted">
              Balance
            </p>
            <p class="mt-1 text-sm font-medium text-highlighted">
              {{ formatBalance(creditCard.currentBalance) }}
            </p>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              v-if="!creditCard.endDate"
              icon="i-lucide-wallet"
              color="neutral"
              variant="ghost"
              aria-label="Edit credit card balance"
              @click="startEditingCreditCardBalance(creditCard)"
            />
            <UButton
              v-if="!creditCard.endDate"
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              aria-label="Edit credit card"
              :disabled="deletingCreditCardId === creditCard.id"
              @click="startEditingCreditCard(creditCard)"
            />
            <UButton
              v-if="!creditCard.endDate"
              icon="i-lucide-ban"
              color="warning"
              variant="ghost"
              aria-label="Cancel credit card"
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
      v-model:user-id="creditCardAssigneeId"
      v-model:due-date="creditCardDueDate"
      v-model:limit="creditCardLimit"
      :open="isCreditCardModalOpen"
      :is-editing="isEditingCreditCard"
      :pending="pending"
      :is-saving="isSavingCreditCard"
      :has-household="Boolean(householdId)"
      :form-error="formError"
      :assignment-options="assignmentOptions"
      :due-date-min="creditCardDueDateMin"
      :can-save="canSaveCreditCard"
      @update:open="setCreditCardModalOpen"
      @cancel="closeCreditCardModal"
      @save="saveCreditCard"
    />

    <CreditCardBalanceModal ref="creditCardBalanceModal" />

    <CreditCardCloseModal
      v-model:effective-date="cancellationEffectiveDate"
      :open="Boolean(creditCardPendingDelete)"
      :credit-card-name="creditCardPendingDelete?.name || ''"
      :is-closing="Boolean(deletingCreditCardId)"
      :error="deletionError"
      :min-date="creditCardCancellationDateMin"
      @update:open="(value: boolean) => !value && closeDeletionModal()"
      @keep="closeDeletionModal"
      @confirm="cancelCreditCard"
    />
  </UContainer>
</template>
