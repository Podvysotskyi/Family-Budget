<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { Subscription, SubscriptionType } from '~/stores/subscriptions'

defineOptions({
  name: 'SubscriptionsPageShell'
})

const props = defineProps<{
  subscriptionUserId?: string
}>()

const unassignedUserValue = 'household'
const allSubscriptionsValue = 'all'
const dashboardStore = useDashboardStore()
const subscriptionsStore = useSubscriptionsStore()
await dashboardStore.fetchDashboard()
const householdId = computed(() => dashboardStore.householdId)
const members = computed(() => dashboardStore.members)
const subscriptions = computed(() => subscriptionsStore.getSubscriptions(householdId.value))
const pending = computed(() => subscriptionsStore.isLoading(householdId.value))
const error = computed(() => subscriptionsStore.getError(householdId.value))
const assignmentFilter = ref(getDefaultAssignmentFilter())
const showOnlyActiveSubscriptions = ref(true)
const subscriptionPendingCancel = ref<Subscription | null>(null)
const cancelingSubscriptionId = ref<string | null>(null)
const cancellationEffectiveDate = ref(getTodayDate())
const cancellationError = ref<string | null>(null)
const subscriptionPendingDelete = ref<Subscription | null>(null)
const deletingSubscriptionId = ref<string | null>(null)
const deletionError = ref<string | null>(null)
const editingSubscriptionId = ref<string | null>(null)
const formError = ref<string | null>(null)
const isSubscriptionModalOpen = ref(false)
const isSavingSubscription = ref(false)
const subscriptionName = ref('')
const subscriptionType = ref<SubscriptionType>('monthly')
const subscriptionStartDate = ref(getTodayDate())
const subscriptionEndDate = ref('')
const subscriptionNextChargeDate = ref('')
const originalSubscriptionNextChargeDate = ref<string | null>(null)
const subscriptionAmount = ref('')
const subscriptionAutopay = ref(false)
const typeOptions = [
  {
    label: 'Monthly',
    value: 'monthly'
  },
  {
    label: 'Yearly',
    value: 'yearly'
  }
]
const hasMultipleMembers = computed(() => members.value.length > 1)
const subscriptionNavigationItems = computed<NavigationMenuItem[]>(() => {
  return [
    ...(hasMultipleMembers.value
      ? [{
          label: 'Household',
          icon: assignmentFilter.value === unassignedUserValue ? 'i-lucide-circle-dot' : 'i-lucide-circle',
          to: buildSubscriptionAssignmentPath(unassignedUserValue),
          active: assignmentFilter.value === unassignedUserValue
        }]
      : []),
    ...members.value.map(member => ({
      label: member.name || member.email,
      icon: member.userId === assignmentFilter.value ? 'i-lucide-circle-dot' : 'i-lucide-circle',
      to: buildSubscriptionAssignmentPath(member.userId),
      active: member.userId === assignmentFilter.value
    }))
  ]
})
const trimmedSubscriptionName = computed(() => subscriptionName.value.trim())
const isEditingSubscription = computed(() => Boolean(editingSubscriptionId.value))
const parsedSubscriptionAmount = computed(() => Number(subscriptionAmount.value))
const canSaveSubscription = computed(() => {
  return Boolean(
    !pending.value
    && trimmedSubscriptionName.value
    && householdId.value
    && subscriptionStartDate.value
    && subscriptionAmount.value
  )
})
const canCreateSubscription = computed(() => {
  return assignmentFilter.value === unassignedUserValue || assignmentFilter.value === dashboardStore.user?.id
})
const filteredSubscriptions = computed(() => {
  return subscriptions.value.filter((subscription) => {
    const matchesAssignment = assignmentFilter.value === allSubscriptionsValue
      || (assignmentFilter.value === unassignedUserValue && !subscription.userId)
      || subscription.userId === assignmentFilter.value

    return matchesAssignment && (!showOnlyActiveSubscriptions.value || isActiveSubscription(subscription))
  })
})
const emptySubscriptionsMessage = computed(() => {
  if (!subscriptions.value.length) {
    return 'No subscriptions found.'
  }

  return showOnlyActiveSubscriptions.value ? 'No active subscriptions found for this selection.' : 'No subscriptions found for this selection.'
})

if (householdId.value) {
  await refresh()
}

watch(householdId, async (id) => {
  if (id) {
    await refresh()
  }
})

watch(() => props.subscriptionUserId, () => {
  assignmentFilter.value = getDefaultAssignmentFilter()
}, { immediate: true })

watch(() => dashboardStore.user?.id, (userId) => {
  if (!assignmentFilter.value && userId) {
    assignmentFilter.value = userId
  }
}, { immediate: true })

async function refresh() {
  await subscriptionsStore.fetchSubscriptions(householdId.value)
}

function resetForm() {
  editingSubscriptionId.value = null
  formError.value = null
  subscriptionName.value = ''
  subscriptionType.value = 'monthly'
  subscriptionStartDate.value = getTodayDate()
  subscriptionEndDate.value = ''
  subscriptionNextChargeDate.value = ''
  originalSubscriptionNextChargeDate.value = null
  subscriptionAmount.value = ''
  subscriptionAutopay.value = false
}

function startCreatingSubscription() {
  if (!canCreateSubscription.value) {
    return
  }

  resetForm()
  isSubscriptionModalOpen.value = true

  if (import.meta.client) {
    nextTick(() => document.getElementById('subscription-name')?.focus())
  }
}

function closeSubscriptionModal() {
  isSubscriptionModalOpen.value = false
  resetForm()
}

function setSubscriptionModalOpen(open: boolean) {
  if (open) {
    isSubscriptionModalOpen.value = true
    return
  }

  closeSubscriptionModal()
}

function startEditingSubscription(subscription: Subscription) {
  formError.value = null
  editingSubscriptionId.value = subscription.id
  subscriptionName.value = subscription.name
  subscriptionType.value = subscription.type
  subscriptionStartDate.value = subscription.startDate
  subscriptionEndDate.value = subscription.endDate || ''
  subscriptionNextChargeDate.value = subscription.nextChargeDate || subscription.startDate
  originalSubscriptionNextChargeDate.value = subscription.nextChargeDate || subscription.startDate
  subscriptionAmount.value = String(subscription.amount)
  subscriptionAutopay.value = subscription.autopay
  isSubscriptionModalOpen.value = true

  if (import.meta.client) {
    nextTick(() => document.getElementById('subscription-name')?.focus())
  }
}

function startCancelingSubscription(subscription: Subscription) {
  cancellationError.value = null
  cancellationEffectiveDate.value = getTodayDate()
  subscriptionPendingCancel.value = subscription
}

function closeCancellationModal() {
  subscriptionPendingCancel.value = null
  cancellationError.value = null
  cancellationEffectiveDate.value = getTodayDate()
}

function startDeletingSubscription(subscription: Subscription) {
  deletionError.value = null
  subscriptionPendingDelete.value = subscription
}

function closeDeletionModal() {
  subscriptionPendingDelete.value = null
  deletionError.value = null
}

async function saveSubscription() {
  formError.value = null

  if (!householdId.value) {
    formError.value = 'Household is required.'
    return
  }

  if (!trimmedSubscriptionName.value) {
    formError.value = 'Subscription name is required.'
    return
  }

  if (!subscriptionStartDate.value) {
    formError.value = 'Start date is required.'
    return
  }

  if (subscriptionEndDate.value && subscriptionEndDate.value < subscriptionStartDate.value) {
    formError.value = 'End date must be on or after the start date.'
    return
  }

  if (isEditingSubscription.value && !subscriptionNextChargeDate.value) {
    formError.value = 'Next charge date is required.'
    return
  }

  if (isEditingSubscription.value && subscriptionNextChargeDate.value < subscriptionStartDate.value) {
    formError.value = 'Next charge date must be on or after the start date.'
    return
  }

  if (isEditingSubscription.value && subscriptionEndDate.value && subscriptionNextChargeDate.value > subscriptionEndDate.value) {
    formError.value = 'Next charge date must be on or before the end date.'
    return
  }

  if (!Number.isFinite(parsedSubscriptionAmount.value) || parsedSubscriptionAmount.value <= 0) {
    formError.value = 'Amount must be greater than zero.'
    return
  }

  isSavingSubscription.value = true

  try {
    const input = {
      name: trimmedSubscriptionName.value,
      userId: getSubscriptionUserId(),
      type: subscriptionType.value,
      startDate: subscriptionStartDate.value,
      endDate: subscriptionEndDate.value || null,
      amount: parsedSubscriptionAmount.value,
      autopay: subscriptionAutopay.value
    }

    if (editingSubscriptionId.value) {
      await subscriptionsStore.updateSubscription(householdId.value, editingSubscriptionId.value, {
        ...input,
        nextChargeDate: subscriptionNextChargeDate.value !== originalSubscriptionNextChargeDate.value
          ? subscriptionNextChargeDate.value
          : null
      })
    } else {
      await subscriptionsStore.createSubscription(householdId.value, input)
    }

    resetForm()
    isSubscriptionModalOpen.value = false
  } catch {
    formError.value = editingSubscriptionId.value ? 'Subscription could not be saved.' : 'Subscription could not be created.'
  } finally {
    isSavingSubscription.value = false
  }
}

async function cancelSubscription() {
  cancellationError.value = null

  if (!subscriptionPendingCancel.value) {
    return
  }

  if (!householdId.value) {
    cancellationError.value = 'Household is required.'
    return
  }

  if (!cancellationEffectiveDate.value) {
    cancellationError.value = 'Effective date is required.'
    return
  }

  if (cancellationEffectiveDate.value < subscriptionPendingCancel.value.startDate) {
    cancellationError.value = 'Effective date must be on or after the start date.'
    return
  }

  cancelingSubscriptionId.value = subscriptionPendingCancel.value.id

  try {
    await subscriptionsStore.updateSubscription(householdId.value, subscriptionPendingCancel.value.id, {
      name: subscriptionPendingCancel.value.name,
      userId: subscriptionPendingCancel.value.userId,
      type: subscriptionPendingCancel.value.type,
      startDate: subscriptionPendingCancel.value.startDate,
      endDate: cancellationEffectiveDate.value,
      amount: subscriptionPendingCancel.value.amount,
      autopay: subscriptionPendingCancel.value.autopay
    })
    closeCancellationModal()
  } catch {
    cancellationError.value = 'Subscription could not be canceled.'
  } finally {
    cancelingSubscriptionId.value = null
  }
}

async function deleteSubscription() {
  deletionError.value = null

  if (!subscriptionPendingDelete.value) {
    return
  }

  if (!householdId.value) {
    deletionError.value = 'Household is required.'
    return
  }

  deletingSubscriptionId.value = subscriptionPendingDelete.value.id

  try {
    await subscriptionsStore.deleteSubscription(householdId.value, subscriptionPendingDelete.value.id)
    closeDeletionModal()
  } catch {
    deletionError.value = 'Subscription could not be deleted. Subscriptions with paid transactions cannot be deleted.'
  } finally {
    deletingSubscriptionId.value = null
  }
}

function getSubscriptionUserId() {
  return isMemberAssignment(assignmentFilter.value) ? assignmentFilter.value : null
}

function getDefaultAssignmentFilter() {
  const subscriptionAssignment = props.subscriptionUserId?.trim() || null

  if (subscriptionAssignment === unassignedUserValue) {
    return unassignedUserValue
  }

  if (subscriptionAssignment && members.value.some(member => member.userId === subscriptionAssignment)) {
    return subscriptionAssignment
  }

  return dashboardStore.user?.id || allSubscriptionsValue
}

function getSubscriptionAssignmentLabel(subscription: Subscription) {
  if (!subscription.user) {
    return 'Household'
  }

  return subscription.user.name || subscription.user.email
}

function getSubscriptionTypeLabel(type: SubscriptionType) {
  return type === 'yearly' ? 'Yearly' : 'Monthly'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

function isActiveSubscription(subscription: Subscription) {
  const today = getTodayDate()

  return !subscription.endDate || subscription.endDate >= today
}

function isExpiredSubscription(subscription: Subscription) {
  const today = getTodayDate()

  return Boolean(subscription.endDate && subscription.endDate < today)
}

function isMemberAssignment(value: string) {
  return value !== unassignedUserValue
    && members.value.some(member => member.userId === value)
}

function buildSubscriptionAssignmentPath(assignment: string) {
  if (assignment === dashboardStore.defaultBudgetUserId) {
    return '/subscriptions'
  }

  return `/subscriptions/${encodeURIComponent(assignment)}`
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
      <div
        v-if="subscriptionNavigationItems.length"
        class="min-w-0 overflow-x-auto"
      >
        <UNavigationMenu
          :items="subscriptionNavigationItems"
          orientation="horizontal"
          :ui="{ link: 'whitespace-nowrap' }"
        />
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
        <UButton
          v-if="canCreateSubscription"
          icon="i-lucide-plus"
          label="New subscription"
          :disabled="pending || isSavingSubscription || !householdId"
          @click="startCreatingSubscription"
        />
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default">
      <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-3">
        <h2 class="text-sm font-medium text-highlighted">
          Subscriptions
        </h2>

        <USwitch
          v-model="showOnlyActiveSubscriptions"
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
          title="Subscriptions are unavailable"
          description="Check that your user has a household."
        />
      </div>

      <div
        v-else-if="filteredSubscriptions.length"
        class="divide-y divide-default"
      >
        <div
          v-for="subscription in filteredSubscriptions"
          :key="subscription.id"
          class="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ subscription.name }}
              </p>
              <UBadge
                color="neutral"
                variant="subtle"
                :label="getSubscriptionTypeLabel(subscription.type)"
              />
              <UBadge
                v-if="subscription.autopay"
                color="primary"
                variant="subtle"
                label="Autopay"
              />
              <UBadge
                v-if="isExpiredSubscription(subscription)"
                color="warning"
                variant="subtle"
                label="Expired"
              />
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ getSubscriptionAssignmentLabel(subscription) }} · {{ formatCurrency(subscription.amount) }} · {{ formatDate(subscription.startDate) }} - {{ formatDate(subscription.endDate) }}
            </p>
            <p
              v-if="subscription.nextChargeDate"
              class="mt-1 text-sm text-muted"
            >
              Next charge {{ formatDate(subscription.nextChargeDate) }}
            </p>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              aria-label="Edit subscription"
              :disabled="cancelingSubscriptionId === subscription.id || deletingSubscriptionId === subscription.id"
              @click="startEditingSubscription(subscription)"
            />
            <UButton
              icon="i-lucide-ban"
              color="warning"
              variant="ghost"
              aria-label="Cancel subscription"
              :disabled="cancelingSubscriptionId === subscription.id || deletingSubscriptionId === subscription.id"
              @click="startCancelingSubscription(subscription)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="Delete subscription"
              :disabled="cancelingSubscriptionId === subscription.id || deletingSubscriptionId === subscription.id"
              @click="startDeletingSubscription(subscription)"
            />
          </div>
        </div>
      </div>

      <div
        v-else
        class="px-5 py-4 text-sm text-muted"
      >
        {{ emptySubscriptionsMessage }}
      </div>
    </section>

    <SubscriptionFormModal
      v-model:name="subscriptionName"
      v-model:amount="subscriptionAmount"
      v-model:type="subscriptionType"
      v-model:start-date="subscriptionStartDate"
      v-model:end-date="subscriptionEndDate"
      v-model:next-charge-date="subscriptionNextChargeDate"
      v-model:autopay="subscriptionAutopay"
      :open="isSubscriptionModalOpen"
      :is-editing="isEditingSubscription"
      :pending="pending"
      :is-saving="isSavingSubscription"
      :has-household="Boolean(householdId)"
      :form-error="formError"
      :type-options="typeOptions"
      :can-save="canSaveSubscription"
      @update:open="setSubscriptionModalOpen"
      @cancel="closeSubscriptionModal"
      @save="saveSubscription"
    />

    <SubscriptionCancellationModal
      v-model:effective-date="cancellationEffectiveDate"
      :open="Boolean(subscriptionPendingCancel)"
      :subscription-name="subscriptionPendingCancel?.name || ''"
      :is-canceling="Boolean(cancelingSubscriptionId)"
      :error="cancellationError"
      @update:open="(value: boolean) => !value && closeCancellationModal()"
      @keep="closeCancellationModal"
      @cancel-subscription="cancelSubscription"
    />

    <SubscriptionDeleteModal
      :open="Boolean(subscriptionPendingDelete)"
      :subscription-name="subscriptionPendingDelete?.name || ''"
      :is-deleting="Boolean(deletingSubscriptionId)"
      :error="deletionError"
      @update:open="(value: boolean) => !value && closeDeletionModal()"
      @confirm="deleteSubscription"
    />
  </UContainer>
</template>
