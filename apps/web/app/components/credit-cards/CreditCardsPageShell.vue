<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { CreditCard } from '~/types/credit-cards'
import CreditCardCloseModal from '~/components/credit-cards/CreditCardCloseModal.vue'
import CreditCardCreateModal from '~/components/credit-cards/CreditCardCreateModal.vue'
import CreditCardEditModal from '~/components/credit-cards/CreditCardEditModal.vue'
import CreditCardUpdateBalanceModal from '~/components/credit-cards/CreditCardUpdateBalanceModal.vue'

defineOptions({
  name: 'CreditCardsPageShell'
})

const props = defineProps<{
  creditCardUserId?: string
}>()

const householdAssignmentValue = 'household'
const dashboardStore = useDashboardStore()
const creditCardsStore = useCreditCardsStore()
const { getTodayDateString } = useDateUtils()
await dashboardStore.fetchDashboard()
const householdId = computed(() => dashboardStore.householdId)
const members = computed(() => dashboardStore.members)
const creditCards = computed(() => creditCardsStore.getCreditCards(householdId.value))
const pending = computed(() => creditCardsStore.isLoading(householdId.value))
const error = computed(() => creditCardsStore.getError(householdId.value))
const assignmentFilter = ref(getDefaultAssignmentFilter())
const showOnlyActiveCreditCards = ref(true)
const creditCardCloseModal = ref<InstanceType<typeof CreditCardCloseModal> | null>(null)
const creditCardCreateModal = ref<InstanceType<typeof CreditCardCreateModal> | null>(null)
const creditCardEditModal = ref<InstanceType<typeof CreditCardEditModal> | null>(null)
const creditCardUpdateBalanceModal = ref<InstanceType<typeof CreditCardUpdateBalanceModal> | null>(null)
const hasMultipleMembers = computed(() => members.value.length > 1)
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
}, { immediate: true })

async function refresh() {
  await creditCardsStore.fetchCreditCards(householdId.value)
}

function startCreatingCreditCard() {
  if (!canCreateCreditCard.value) {
    return
  }

  creditCardCreateModal.value?.open(getCreditCardCreateFormContext())
}

function startEditingCreditCard(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  creditCardEditModal.value?.open(creditCard, getCreditCardEditFormContext())
}

function startDeletingCreditCard(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  creditCardCloseModal.value?.open(creditCard)
}

function startEditingCreditCardBalance(creditCard: CreditCard) {
  if (creditCard.endDate) {
    return
  }

  creditCardUpdateBalanceModal.value?.open(creditCard)
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

function getCreditCardCreateFormContext() {
  return {
    assignmentOptions: assignmentOptions.value,
    currentUserId: dashboardStore.user?.id || '',
    defaultUserId: getDefaultCreateCreditCardUserId(),
    hasMultipleMembers: hasMultipleMembers.value,
    householdId: householdId.value
  }
}

function getCreditCardEditFormContext() {
  return {
    assignmentOptions: assignmentOptions.value,
    currentUserId: dashboardStore.user?.id || '',
    hasMultipleMembers: hasMultipleMembers.value
  }
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
  const today = getTodayDateString()

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
          :disabled="pending || !householdId || !canCreateCreditCard"
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
              @click="startEditingCreditCard(creditCard)"
            />
            <UButton
              v-if="!creditCard.endDate"
              icon="i-lucide-ban"
              color="warning"
              variant="ghost"
              aria-label="Cancel credit card"
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

    <CreditCardCloseModal
      ref="creditCardCloseModal"
      @saved="refresh"
    />
  </UContainer>
</template>
