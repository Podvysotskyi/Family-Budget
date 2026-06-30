<script setup lang="ts">
import type { Subscription, SubscriptionType } from '~/types/subscriptions'
import SubscriptionCancellationModal from '~/components/subscriptions/SubscriptionCancellationModal.vue'
import SubscriptionEditModal from '~/components/subscriptions/SubscriptionEditModal.vue'
import { useAuthStore } from '~/stores/auth'

defineOptions({
  name: 'SubscriptionsPageListItem'
})

const authStore = useAuthStore()
const { formatCurrency } = useCurrencyUtils()
const { formatDateString } = useDateUtils()

const props = defineProps<{
  subscription: Subscription
}>()

const emit = defineEmits<{
  refresh: []
}>()

const subscriptionCancellationModal = ref<InstanceType<typeof SubscriptionCancellationModal> | null>(null)
const subscriptionEditModal = ref<InstanceType<typeof SubscriptionEditModal> | null>(null)

const canEditSubscription = computed<boolean>(() => !props.subscription.user || props.subscription.user.userId === authStore.userId)
const canUpdateSubscription = computed<boolean>(() => canEditSubscription.value && !props.subscription.endDate)

const assignmentLabel = computed<string>(() => {
  if (!props.subscription.user) {
    return 'Household'
  }

  return props.subscription.user.name
})

function getSubscriptionTypeLabel(type: SubscriptionType) {
  return type === 'yearly' ? 'Yearly' : 'Monthly'
}

function editSubscription() {
  if (!canUpdateSubscription.value) {
    return
  }

  subscriptionEditModal.value?.open(props.subscription)
}

function cancelSubscription() {
  if (!canUpdateSubscription.value) {
    return
  }

  subscriptionCancellationModal.value?.open(props.subscription)
}
</script>

<template>
  <div>
    <div class="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ subscription.name }}
          </p>
          <UBadge
            color="neutral"
            variant="subtle"
            :label="assignmentLabel"
          />
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
            v-if="subscription.endDate"
            color="warning"
            variant="subtle"
            label="Canceled"
          />
        </div>
        <p class="mt-1 text-sm text-muted">
          Next charge {{ formatDateString(subscription.nextChargeDate, 'No next charge') }}
        </p>
        <p
          v-if="subscription.endDate"
          class="mt-1 text-sm text-muted"
        >
          Canceled {{ formatDateString(subscription.endDate, 'No end date') }}
        </p>
      </div>

      <div class="min-w-0 md:text-right">
        <p class="text-xs font-medium uppercase text-muted">
          Amount
        </p>
        <p class="mt-1 text-sm font-medium text-highlighted">
          {{ formatCurrency(subscription.amount, 'No amount') }}
        </p>
      </div>

      <div
        v-if="canUpdateSubscription"
        class="flex items-center gap-1"
      >
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          aria-label="Edit subscription"
          @click="editSubscription"
        />
        <UButton
          icon="i-lucide-ban"
          color="warning"
          variant="ghost"
          aria-label="Cancel subscription"
          @click="cancelSubscription"
        />
      </div>
    </div>

    <SubscriptionEditModal
      ref="subscriptionEditModal"
      @saved="emit('refresh')"
    />

    <SubscriptionCancellationModal
      ref="subscriptionCancellationModal"
      @saved="emit('refresh')"
    />
  </div>
</template>
