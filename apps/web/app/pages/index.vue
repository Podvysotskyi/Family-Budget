<script setup lang="ts">
defineOptions({
  name: 'IndexPage'
})

definePageMeta({
  middleware: async () => {
    const { error } = await useApiFetch('/auth/me')

    return navigateTo(error.value ? '/login' : '/dashboard')
  }
})
</script>

<template>
  <div class="min-h-screen" />
</template>
