<script setup lang="ts">
defineOptions({
  name: 'IndexPage'
})

definePageMeta({
  middleware: async () => {
    const authStore = useAuthStore()
    const isAuthenticated = await authStore.checkSession()

    return navigateTo(isAuthenticated ? '/dashboard' : '/login')
  }
})
</script>

<template>
  <div class="min-h-screen" />
</template>
