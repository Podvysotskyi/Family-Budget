<script setup lang="ts">
defineOptions({
  name: 'DashboardPage'
})

definePageMeta({
  middleware: 'auth'
})

const { data, error } = await useApiFetch<{
  household: {
    householdId: string
  } | null
}>('/dashboard')

if (!error.value && data.value?.household) {
  await navigateTo('/household/budget')
}
</script>

<template>
  <div class="min-h-screen" />
</template>
