<script setup lang="ts">
defineOptions({
  name: 'SettingsIndexPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

await navigateTo('/settings/household')
</script>

<template>
  <div />
</template>
