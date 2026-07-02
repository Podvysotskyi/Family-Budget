<script setup lang="ts">
import type { Goal } from '~/types/goals'
import ConfirmationModal from '~/components/shared/ConfirmationModal.vue'

defineOptions({
  name: 'GoalCloseModal'
})

const goalsStore = useGoalsStore()
const { addErrorToast, addSuccessToast } = useAppToast()

const emit = defineEmits<{
  closed: []
  saved: []
}>()

const isOpen = ref<boolean>(false)
const selectedGoal = ref<Goal | null>(null)
const isSaving = ref<boolean>(false)

function open(goal: Goal) {
  selectedGoal.value = goal
  isOpen.value = true
}

function close(force = false) {
  if (isSaving.value && !force) {
    return
  }

  isOpen.value = false
  selectedGoal.value = null
  emit('closed')
}

async function save() {
  const goal = selectedGoal.value

  if (!goal) {
    return
  }

  isSaving.value = true

  try {
    await goalsStore.closeGoal(goal)
    addSuccessToast('Goal closed.')
    emit('saved')
    close(true)
  } catch {
    addErrorToast('Goal could not be closed.')
  } finally {
    isSaving.value = false
  }
}

defineExpose({
  close,
  open
})
</script>

<template>
  <ConfirmationModal
    :open="isOpen"
    title="Close goal"
    :description="selectedGoal ? `Close ${selectedGoal.name}?` : ''"
    confirm-label="Close"
    :is-confirming="isSaving"
    @update:open="(value: boolean) => !value && close()"
    @confirm="save"
  >
    <p>This sets the goal end date to today and keeps transactions intact.</p>
  </ConfirmationModal>
</template>
