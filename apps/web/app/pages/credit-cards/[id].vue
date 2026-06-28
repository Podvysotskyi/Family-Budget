<script setup lang="ts">
import CreditCardsPageShell from '~/components/credit-cards/CreditCardsPageShell.vue'

defineOptions({
  name: 'UserCreditCardsPage'
})

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const route = useRoute()
const creditCardUserId = computed(() => String(route.params.id))
</script>

<template>
  <CreditCardsPageShell :credit-card-user-id="creditCardUserId" />
</template>
