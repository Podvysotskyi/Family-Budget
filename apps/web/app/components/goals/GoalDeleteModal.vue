<script setup lang="ts">
import type { Goal } from '~/types/goals'
import ConfirmationModal from '~/components/shared/ConfirmationModal.vue'

defineOptions({
  name: 'GoalDeleteModal'
})

const goalsStore = useGoalsStore()
const householdStore = useHouseholdStore()
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
  if (!selectedGoal.value || !householdStore.householdId) {
    return
  }

  isSaving.value = true

  try {
    await goalsStore.permanentlyDeleteGoal(householdStore.householdId, selectedGoal.value.id)
    addSuccessToast('Goal deleted.')
    emit('saved')
    close(true)
  } catch {
    addErrorToast('Goal could not be permanently deleted.')
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
    title="Delete goal"
    :description="selectedGoal ? `Permanently delete ${selectedGoal.name}?` : ''"
    confirm-label="Delete"
    :is-confirming="isSaving"
    @update:open="(value: boolean) => !value && close()"
    @confirm="save"
  >
    <p>This removes the goal and target history from the database.</p>
  </ConfirmationModal>
</template>
