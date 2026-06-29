<script setup lang="ts">
import type { CreditCard } from '~/types/credit-cards'
import CreditCardCloseModal from '~/components/credit-cards/CreditCardCloseModal.vue'
import CreditCardCreateModal from '~/components/credit-cards/CreditCardCreateModal.vue'
import CreditCardEditModal from '~/components/credit-cards/CreditCardEditModal.vue'
import CreditCardUpdateBalanceModal from '~/components/credit-cards/CreditCardUpdateBalanceModal.vue'
import CreditCardsPageHeader from '~/components/credit-cards/CreditCardsPageHeader.vue'
import CreditCardsPageList from '~/components/credit-cards/CreditCardsPageList.vue'

defineOptions({
  name: 'CreditCardsPageShell'
})

const props = defineProps<{
  creditCardUserId?: string
}>()

const householdAssignmentValue = 'household'
const dashboardStore = useDashboardStore()
const creditCardsStore = useCreditCardsStore()
await dashboardStore.fetchDashboard()
const householdId = computed(() => dashboardStore.householdId)
const members = computed(() => dashboardStore.members)
const assignmentFilter = ref(getDefaultAssignmentFilter())
const creditCards = computed(() => {
  if (assignmentFilter.value === householdAssignmentValue) {
    return creditCardsStore.householdCreditCardList
  }

  return creditCardsStore.userCreditCardList(assignmentFilter.value)
})
const pending = computed(() => creditCardsStore.isLoading)
const creditCardCloseModal = ref<InstanceType<typeof CreditCardCloseModal> | null>(null)
const creditCardCreateModal = ref<InstanceType<typeof CreditCardCreateModal> | null>(null)
const creditCardEditModal = ref<InstanceType<typeof CreditCardEditModal> | null>(null)
const creditCardUpdateBalanceModal = ref<InstanceType<typeof CreditCardUpdateBalanceModal> | null>(null)
const hasMultipleMembers = computed(() => members.value.length > 1)
const selectedCreditCardUserId = computed(() => {
  return assignmentFilter.value === householdAssignmentValue ? null : assignmentFilter.value
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

onMounted(async () => {
  if (householdId.value) {
    await refresh()
  }
})

watch(householdId, async (id) => {
  if (id) {
    await refresh()
  }
})

watch(assignmentFilter, async () => {
  if (householdId.value) {
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
  if (assignmentFilter.value === householdAssignmentValue) {
    await refreshHouseholdCreditCards()

    return
  }

  await refreshUserCreditCards(assignmentFilter.value)
}

async function refreshHouseholdCreditCards() {
  await creditCardsStore.fetchHouseholdCreditCards(householdId.value)
}

async function refreshUserCreditCards(userId: string) {
  await creditCardsStore.fetchUserCreditCards(userId)
}

function startCreatingCreditCard() {
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

</script>

<template>
  <UContainer class="py-6">
    <CreditCardsPageHeader
      :user-id="selectedCreditCardUserId"
      @create-credit-card="startCreatingCreditCard"
    />

    <section
      v-if="!householdId"
      class="rounded-lg border border-default bg-default"
    >
      <div class="px-5 py-4 text-sm text-muted">
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-database"
          title="Credit cards are unavailable"
          description="Check that your user has a household."
        />
      </div>
    </section>

    <CreditCardsPageList
      v-else
      :credit-cards="creditCards"
      :is-loading="pending"
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

    <CreditCardCloseModal
      ref="creditCardCloseModal"
      @saved="refresh"
    />
  </UContainer>
</template>
