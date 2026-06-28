<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

type CalendarModelValue = DateValue | DateValue[] | { start?: DateValue, end?: DateValue } | null | undefined
type DatePickerModelValue = Date | string | null

defineOptions({
  name: 'AppDatePicker'
})

const props = withDefaults(defineProps<{
  id?: string
  emptyLabel: string
  disabled?: boolean
  clearable?: boolean
  clearAriaLabel?: string
  min?: DatePickerModelValue
  max?: DatePickerModelValue
}>(), {
  id: undefined,
  disabled: false,
  clearable: false,
  clearAriaLabel: 'Clear date',
  min: undefined,
  max: undefined
})

const { formatDateForApi, parseApiDate } = useDateUtils()
const modelValue = defineModel<DatePickerModelValue>({ required: true })
const calendarDate = computed(() => parseCalendarDate(modelValue.value))
const minCalendarDate = computed(() => parseCalendarDate(props.min))
const maxCalendarDate = computed(() => parseCalendarDate(props.max))
const formattedLabel = computed(() => {
  return modelValue.value ? formatDate(modelValue.value) : props.emptyLabel
})

function formatDate(value: DatePickerModelValue) {
  const date = parseModelDate(value)

  if (!date) {
    return props.emptyLabel
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function updateValue(value: CalendarModelValue, close: () => void) {
  const nextDate = getSingleCalendarDate(value)
  modelValue.value = getUpdatedModelValue(nextDate)
  close()
}

function getSingleCalendarDate(value: CalendarModelValue): DateValue | undefined {
  if (!value || Array.isArray(value) || 'start' in value || 'end' in value) {
    return undefined
  }

  return value as DateValue
}

function clearValue() {
  modelValue.value = modelValue.value instanceof Date ? null : ''
}

function getUpdatedModelValue(value: DateValue | undefined) {
  if (!value) {
    return modelValue.value instanceof Date ? null : ''
  }

  const nextDate = parseApiDate(value.toString())

  return modelValue.value instanceof Date ? nextDate : value.toString()
}

function parseCalendarDate(value: DatePickerModelValue | undefined) {
  const apiDate = getApiDate(value)

  if (!apiDate) {
    return undefined
  }

  return parseDate(apiDate)
}

function parseModelDate(value: DatePickerModelValue | undefined) {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'string') {
    return parseApiDate(value)
  }

  return null
}

function getApiDate(value: DatePickerModelValue | undefined) {
  const date = parseModelDate(value)

  return date ? formatDateForApi(date) : ''
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
          :min-value="minCalendarDate"
          :max-value="maxCalendarDate"
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
