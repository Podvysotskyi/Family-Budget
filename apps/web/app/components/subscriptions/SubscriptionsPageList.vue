<script setup lang="ts">
import type { Subscription } from '~/types/subscriptions'
import SubscriptionsPageListItem from '~/components/subscriptions/SubscriptionsPageListItem.vue'

defineOptions({
  name: 'SubscriptionsPageList'
})

const props = defineProps<{
  subscriptions: Subscription[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const showOnlyActiveSubscriptions = ref<boolean>(true)

const filteredSubscriptions = computed<Subscription[]>(() => {
  return props.subscriptions.filter(subscription => !showOnlyActiveSubscriptions.value || !subscription.endDate)
})
</script>

<template>
  <section class="rounded-lg border border-default bg-default">
    <div class="flex items-center justify-between gap-3 border-b border-default px-5 py-3">
      <h2 class="text-sm font-medium text-highlighted">
        Subscriptions
      </h2>

      <USwitch
        v-model="showOnlyActiveSubscriptions"
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
      v-else-if="filteredSubscriptions.length"
      class="divide-y divide-default"
    >
      <SubscriptionsPageListItem
        v-for="subscription in filteredSubscriptions"
        :key="subscription.id"
        :subscription="subscription"
        @refresh="emit('refresh')"
      />
    </div>

    <div
      v-else
      class="px-5 py-4 text-sm text-muted"
    >
      <template v-if="!subscriptions.length">
        No subscriptions found.
      </template>
      <template v-else-if="showOnlyActiveSubscriptions">
        No active subscriptions found for this selection.
      </template>
      <template v-else>
        No subscriptions found for this selection.
      </template>
    </div>
  </section>
</template>
