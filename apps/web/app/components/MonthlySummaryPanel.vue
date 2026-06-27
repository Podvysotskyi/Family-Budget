<script setup lang="ts">
defineOptions({
  name: 'MonthlySummaryPanel'
})

type SummaryItem = {
  key: string
  label: string
  value: number
}

const props = defineProps<{
  dateRange: string
  items: SummaryItem[]
  title: string
}>()

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function getValueClass(item: SummaryItem) {
  if (item.key === 'income' && item.value > 0) {
    return 'text-success'
  }

  if (item.key === 'expenses' && item.value > 0) {
    return 'text-error'
  }

  if (item.key === 'balance') {
    if (item.value > 0) {
      return 'text-success'
    }

    if (item.value < 0) {
      return 'text-error'
    }
  }

  return 'text-highlighted'
}
</script>

<template>
  <section class="mb-6 rounded-lg border border-default bg-default">
    <div class="border-b border-default px-4 py-3">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-base font-semibold text-highlighted">
          {{ title }}
        </h2>
        <p class="text-sm text-muted">
          {{ dateRange }}
        </p>
      </div>
    </div>

    <div class="grid gap-3 p-4 md:grid-cols-3">
      <section
        v-for="item in props.items"
        :key="item.key"
        class="rounded-lg border border-default px-4 py-3"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-medium uppercase text-muted">
            {{ item.label }}
          </p>
        </div>
        <p
          class="mt-2 text-lg font-semibold tracking-normal"
          :class="getValueClass(item)"
        >
          {{ formatCurrency(item.value) }}
        </p>
      </section>
    </div>
  </section>
</template>
