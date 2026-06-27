<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

type CalendarModelValue = DateValue | DateValue[] | { start?: DateValue, end?: DateValue } | null | undefined

defineOptions({
  name: 'AppDatePicker'
})

const props = withDefaults(defineProps<{
  id?: string
  emptyLabel: string
  disabled?: boolean
  clearable?: boolean
  clearAriaLabel?: string
}>(), {
  id: undefined,
  disabled: false,
  clearable: false,
  clearAriaLabel: 'Clear date'
})

const modelValue = defineModel<string>({ required: true })
const calendarDate = computed(() => parseCalendarDate(modelValue.value))
const formattedLabel = computed(() => {
  return modelValue.value ? formatDate(modelValue.value) : props.emptyLabel
})

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function updateValue(value: CalendarModelValue, close: () => void) {
  const nextDate = getSingleCalendarDate(value)
  modelValue.value = nextDate?.toString() || ''
  close()
}

function getSingleCalendarDate(value: CalendarModelValue) {
  if (!value || Array.isArray(value) || 'start' in value || 'end' in value) {
    return undefined
  }

  return value
}

function clearValue() {
  modelValue.value = ''
}

function parseCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined
  }

  return parseDate(value)
}
</script>

<template>
  <div
    class="flex gap-2"
    :class="{ 'min-w-0': clearable }"
  >
    <UPopover
      :class="clearable ? 'min-w-0 flex-1' : undefined"
      :content="{ align: 'start' }"
    >
      <UButton
        :id="id"
        block
        class="justify-start"
        color="neutral"
        variant="outline"
        icon="i-lucide-calendar-days"
        :label="formattedLabel"
        :disabled="disabled"
      />

      <template #content="{ close }">
        <UCalendar
          :model-value="calendarDate"
          class="p-2"
          @update:model-value="value => updateValue(value, close)"
        />
      </template>
    </UPopover>

    <UButton
      v-if="clearable && modelValue"
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      :aria-label="clearAriaLabel"
      :disabled="disabled"
      @click="clearValue"
    />
  </div>
</template>
