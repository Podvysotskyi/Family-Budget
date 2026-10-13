<script setup lang="ts">
import {Head,usePage} from '@inertiajs/vue3';
import {Info,TriangleAlert} from 'lucide-vue-next';
import GoogleMark from '../../Components/GoogleMark.vue';
defineProps<{googleReady:boolean}>();const page=usePage<any>();
</script>
<template><main class="flex min-h-dvh items-center justify-center bg-ground px-6 py-16"><Head title="Sign in"/>
 <div class="w-full max-w-[420px]"><h1>Sign in</h1><p class="mt-3 leading-relaxed text-muted">Use your Google account. If you’re new, signing in creates your account.</p>
  <div v-if="page.props.flash?.error" role="alert" class="mt-6 flex gap-2.5 rounded-md bg-warning-soft p-4 text-warning"><TriangleAlert :size="18" class="mt-0.5 shrink-0"/><p><strong>Sign-in didn’t finish.</strong> {{page.props.flash.error}}</p></div>
  <a v-if="googleReady" href="/auth/google" class="btn mt-6 min-h-12! w-full"><GoogleMark/>Continue with Google</a><button v-else class="btn mt-6 min-h-12! w-full" disabled><GoogleMark/>Continue with Google</button>
  <p v-if="!googleReady" role="status" class="help mt-3">Google sign-in is awaiting configuration.</p>
  <div class="panel mt-6 flex items-start gap-3 p-4 text-sm leading-relaxed text-muted"><Info :size="18" class="mt-0.5 shrink-0"/><p>Were you invited to a household? Sign in with the Google email the invitation was sent to, and it will be waiting for you.</p></div>
  <p class="help mt-6">Your financial records are shared only with members of your household.</p>
 </div>
</main></template>
