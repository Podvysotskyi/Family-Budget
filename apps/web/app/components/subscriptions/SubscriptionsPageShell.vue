<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { Subscription, SubscriptionType } from '~/types/subscriptions'
import SubscriptionCancellationModal from '~/components/subscriptions/SubscriptionCancellationModal.vue'
import SubscriptionFormModal from '~/components/subscriptions/SubscriptionFormModal.vue'

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
const { getTodayDateString } = useDateUtils()
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
const cancellationEffectiveDate = ref(getTodayDateString())
const cancellationError = ref<string | null>(null)
const editingSubscriptionId = ref<string | null>(null)
const formError = ref<string | null>(null)
const isSubscriptionModalOpen = ref(false)
const isSavingSubscription = ref(false)
const subscriptionName = ref('')
const subscriptionType = ref<SubscriptionType>('monthly')
const subscriptionStartDate = ref(getTodayDateString())
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
      label: member.name,
      icon: member.userId === assignmentFilter.value ? 'i-lucide-circle-dot' : 'i-lucide-circle',
      to: buildSubscriptionAssignmentPath(member.userId),
      active: member.userId === assignmentFilter.value
    }))
  ]
})
const trimmedSubscriptionName = computed(() => subscriptionName.value.trim())
const isEditingSubscription = computed(() => Boolean(editingSubscriptionId.value))
const parsedSubscriptionAmount = computed(() => Number(subscriptionAmount.value))
const subscriptionEndDateMin = computed(() => subscriptionStartDate.value || undefined)
const subscriptionNextChargeDateMax = computed(() => isEditingSubscription.value && subscriptionEndDate.value ? subscriptionEndDate.value : undefined)
const subscriptionCancellationDateMin = computed(() => subscriptionPendingCancel.value?.startDate || '')
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
  subscriptionStartDate.value = getTodayDateString()
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
  if (subscription.endDate) {
    return
  }

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
  if (subscription.endDate) {
    return
  }

  cancellationError.value = null
  cancellationEffectiveDate.value = getTodayDateString()
  subscriptionPendingCancel.value = subscription
}

function closeCancellationModal() {
  subscriptionPendingCancel.value = null
  cancellationError.value = null
  cancellationEffectiveDate.value = getTodayDateString()
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
    formError.value = 'Next due date is required.'
    return
  }

  if (isEditingSubscription.value && subscriptionNextChargeDate.value < subscriptionStartDate.value) {
    formError.value = 'Next due date must be on or after the start date.'
    return
  }

  if (isEditingSubscription.value && subscriptionEndDate.value && subscriptionNextChargeDate.value > subscriptionEndDate.value) {
    formError.value = 'Next due date must be on or before the end date.'
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

  if (subscriptionPendingCancel.value.endDate) {
    cancellationError.value = 'Subscription is already canceled.'
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

  return subscription.user.name
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
  return !subscription.endDate
}

function isExpiredSubscription(subscription: Subscription) {
  const today = getTodayDateString()

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
              <UBadge
                v-if="subscription.endDate"
                color="warning"
                variant="subtle"
                label="Canceled"
              />
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ getSubscriptionAssignmentLabel(subscription) }} · {{ formatCurrency(subscription.amount) }}
            </p>
            <p
              v-if="subscription.endDate"
              class="mt-1 text-sm text-muted"
            >
              Canceled {{ formatDate(subscription.endDate) }}
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
              v-if="!subscription.endDate"
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              aria-label="Edit subscription"
              :disabled="cancelingSubscriptionId === subscription.id"
              @click="startEditingSubscription(subscription)"
            />
            <UButton
              v-if="!subscription.endDate"
              icon="i-lucide-ban"
              color="warning"
              variant="ghost"
              aria-label="Cancel subscription"
              :disabled="cancelingSubscriptionId === subscription.id"
              @click="startCancelingSubscription(subscription)"
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
      :end-date-min="subscriptionEndDateMin"
      :next-charge-date-max="subscriptionNextChargeDateMax"
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
      :min-date="subscriptionCancellationDateMin"
      @update:open="(value: boolean) => !value && closeCancellationModal()"
      @keep="closeCancellationModal"
      @cancel-subscription="cancelSubscription"
    />

  </UContainer>
</template>
