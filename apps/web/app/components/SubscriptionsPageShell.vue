<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { NavigationMenuItem } from '@nuxt/ui'
import type { Subscription, SubscriptionType } from '~/stores/subscriptions'

type CalendarModelValue = DateValue | DateValue[] | { start?: DateValue, end?: DateValue } | null | undefined

defineOptions({
  name: 'SubscriptionsPageShell'
})

const props = defineProps<{
  subscriptionUserId?: string
}>()

const unassignedUserValue = 'household'
const allSubscriptionsValue = 'all'
const route = useRoute()
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
const subscriptionAmount = ref('')
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
const subscriptionStartCalendarDate = computed(() => parseCalendarDate(subscriptionStartDate.value))
const subscriptionEndCalendarDate = computed(() => parseCalendarDate(subscriptionEndDate.value))
const cancellationEffectiveCalendarDate = computed(() => parseCalendarDate(cancellationEffectiveDate.value))
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
  subscriptionAmount.value = ''
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
  subscriptionAmount.value = String(subscription.amount)
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
      amount: parsedSubscriptionAmount.value
    }

    if (editingSubscriptionId.value) {
      await subscriptionsStore.updateSubscription(householdId.value, editingSubscriptionId.value, input)
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
      amount: subscriptionPendingCancel.value.amount
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
    deletionError.value = 'Subscription could not be deleted.'
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

function setSubscriptionCalendarDate(field: 'start' | 'end', value: CalendarModelValue, close: () => void) {
  const calendarDate = getSingleCalendarDate(value)
  const date = calendarDate?.toString() || ''

  if (field === 'start') {
    subscriptionStartDate.value = date
  } else {
    subscriptionEndDate.value = date
  }

  close()
}

function getSingleCalendarDate(value: CalendarModelValue) {
  if (!value || Array.isArray(value) || 'start' in value || 'end' in value) {
    return undefined
  }

  return value
}

function clearSubscriptionEndDate() {
  subscriptionEndDate.value = ''
}

function setCancellationEffectiveDate(value: CalendarModelValue, close: () => void) {
  const calendarDate = getSingleCalendarDate(value)

  if (calendarDate) {
    cancellationEffectiveDate.value = calendarDate.toString()
  }

  close()
}

function isActiveSubscription(subscription: Subscription) {
  const today = getTodayDate()

  return subscription.startDate <= today && (!subscription.endDate || subscription.endDate >= today)
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

function formatDatePickerLabel(value: string, fallback: string) {
  return value ? formatDate(value) : fallback
}

function parseCalendarDate(value: string) {
  if (!isDateString(value)) {
    return undefined
  }

  return parseDate(value)
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

        <UButton
          icon="i-lucide-activity"
          label="Active only"
          color="neutral"
          size="sm"
          :variant="showOnlyActiveSubscriptions ? 'solid' : 'outline'"
          :aria-pressed="showOnlyActiveSubscriptions"
          :disabled="pending || !householdId"
          @click="showOnlyActiveSubscriptions = !showOnlyActiveSubscriptions"
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
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ getSubscriptionAssignmentLabel(subscription) }} · {{ formatCurrency(subscription.amount) }} · {{ formatDate(subscription.startDate) }} - {{ formatDate(subscription.endDate) }}
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

    <UModal
      :open="isSubscriptionModalOpen"
      :title="isEditingSubscription ? 'Edit subscription' : 'New subscription'"
      @update:open="setSubscriptionModalOpen"
    >
      <template #body>
        <form
          class="space-y-4"
          @submit.prevent="saveSubscription"
        >
          <div class="space-y-2">
            <label
              for="subscription-name"
              class="text-sm font-medium text-highlighted"
            >
              Name
            </label>
            <UInput
              id="subscription-name"
              v-model="subscriptionName"
              class="w-full"
              placeholder="Netflix"
              :disabled="pending || isSavingSubscription || !householdId"
            />
          </div>

          <div class="space-y-2">
            <label
              for="subscription-amount"
              class="text-sm font-medium text-highlighted"
            >
              Amount
            </label>
            <UInput
              id="subscription-amount"
              v-model="subscriptionAmount"
              class="w-full"
              icon="i-lucide-dollar-sign"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              :disabled="pending || isSavingSubscription || !householdId"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-highlighted">
              Type
            </label>
            <USelect
              v-model="subscriptionType"
              class="w-full"
              :items="typeOptions"
              :disabled="pending || isSavingSubscription || !householdId"
            />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                for="subscription-start-date"
                class="text-sm font-medium text-highlighted"
              >
                Start date
              </label>
              <UPopover :content="{ align: 'start' }">
                <UButton
                  id="subscription-start-date"
                  block
                  class="justify-start"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-calendar-days"
                  :label="formatDatePickerLabel(subscriptionStartDate, 'Select start date')"
                  :disabled="pending || isSavingSubscription || !householdId"
                />

                <template #content="{ close }">
                  <UCalendar
                    :model-value="subscriptionStartCalendarDate"
                    class="p-2"
                    @update:model-value="value => setSubscriptionCalendarDate('start', value, close)"
                  />
                </template>
              </UPopover>
            </div>

            <div class="space-y-2">
              <label
                for="subscription-end-date"
                class="text-sm font-medium text-highlighted"
              >
                End date
              </label>
              <div class="flex gap-2">
                <UPopover
                  class="min-w-0 flex-1"
                  :content="{ align: 'start' }"
                >
                  <UButton
                    id="subscription-end-date"
                    block
                    class="justify-start"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-calendar-days"
                    :label="formatDatePickerLabel(subscriptionEndDate, 'No end date')"
                    :disabled="pending || isSavingSubscription || !householdId"
                  />

                  <template #content="{ close }">
                    <UCalendar
                      :model-value="subscriptionEndCalendarDate"
                      class="p-2"
                      @update:model-value="value => setSubscriptionCalendarDate('end', value, close)"
                    />
                  </template>
                </UPopover>

                <UButton
                  v-if="subscriptionEndDate"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  aria-label="Clear end date"
                  :disabled="pending || isSavingSubscription || !householdId"
                  @click="clearSubscriptionEndDate"
                />
              </div>
            </div>
          </div>

          <p
            v-if="formError"
            class="text-sm text-error"
          >
            {{ formError }}
          </p>
        </form>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            :disabled="isSavingSubscription"
            @click="closeSubscriptionModal"
          />
          <UButton
            color="primary"
            :label="isEditingSubscription ? 'Save subscription' : 'Create subscription'"
            :disabled="pending || !trimmedSubscriptionName || !householdId || !subscriptionStartDate || !subscriptionAmount"
            :loading="isSavingSubscription"
            @click="saveSubscription"
          />
        </div>
      </template>
    </UModal>

    <UModal
      :open="Boolean(subscriptionPendingCancel)"
      title="Cancel subscription"
      @update:open="value => !value && closeCancellationModal()"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            {{ subscriptionPendingCancel ? `Set the cancellation date for ${subscriptionPendingCancel.name}.` : '' }}
          </p>

          <div class="space-y-2">
            <label
              for="subscription-cancellation-effective-date"
              class="text-sm font-medium text-highlighted"
            >
              Effective date
            </label>
            <UPopover :content="{ align: 'start' }">
              <UButton
                id="subscription-cancellation-effective-date"
                block
                class="justify-start"
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar-days"
                :label="formatDatePickerLabel(cancellationEffectiveDate, 'Select effective date')"
                :disabled="Boolean(cancelingSubscriptionId)"
              />

              <template #content="{ close }">
                <UCalendar
                  :model-value="cancellationEffectiveCalendarDate"
                  class="p-2"
                  @update:model-value="value => setCancellationEffectiveDate(value, close)"
                />
              </template>
            </UPopover>
          </div>

          <p
            v-if="cancellationError"
            class="text-sm text-error"
          >
            {{ cancellationError }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Keep subscription"
            :disabled="Boolean(cancelingSubscriptionId)"
            @click="closeCancellationModal"
          />
          <UButton
            color="warning"
            label="Cancel subscription"
            :disabled="!cancellationEffectiveDate"
            :loading="Boolean(cancelingSubscriptionId)"
            @click="cancelSubscription"
          />
        </div>
      </template>
    </UModal>

    <ConfirmationModal
      :open="Boolean(subscriptionPendingDelete)"
      title="Delete subscription"
      :description="subscriptionPendingDelete ? `Delete ${subscriptionPendingDelete.name}?` : ''"
      confirm-label="Delete"
      :is-confirming="Boolean(deletingSubscriptionId)"
      @update:open="value => !value && closeDeletionModal()"
      @confirm="deleteSubscription"
    >
      <div class="space-y-2">
        <p>This subscription will be permanently removed from the household.</p>
        <p
          v-if="deletionError"
          class="text-sm text-error"
        >
          {{ deletionError }}
        </p>
      </div>
    </ConfirmationModal>
  </UContainer>
</template>
