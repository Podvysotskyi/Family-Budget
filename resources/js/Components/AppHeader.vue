<script setup lang="ts">
import {Link,usePage} from '@inertiajs/vue3';
import {Bell,CalendarDays,Menu} from 'lucide-vue-next';
withDefaults(defineProps<{setup?:boolean}>(),{setup:false});
defineEmits<{menu:[]}>();
const page=usePage<any>();
</script>
<template><header class="flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-3 sm:px-5">
 <Link :href="setup?'/setup':'/home'" class="flex items-center gap-2.5 font-semibold"><span class="flex size-7 items-center justify-center rounded-md bg-ink text-white"><CalendarDays :size="17"/></span>Household</Link>
 <div class="flex items-center gap-2 sm:gap-4">
  <Link v-if="!setup" href="/notifications" class="icon-btn relative" :aria-label="'Notifications, '+(page.props.unread||0)+' unread'"><Bell :size="19"/><span v-if="page.props.unread" class="absolute right-0 top-0 min-w-4 rounded-full bg-warning-strong px-1 text-center text-[10px] text-white">{{page.props.unread}}</span></Link>
  <component :is="setup?'div':Link" :href="setup?undefined:'/profile'" class="flex items-center gap-2.5 border-l border-line pl-2 sm:pl-4"><span class="avatar">{{page.props.auth?.name?.split(' ').map((part:string)=>part[0]).slice(0,2).join('')}}</span><span class="hidden text-left sm:block"><span class="block text-xs font-semibold">{{page.props.auth?.name}}</span><span class="block text-[11px] text-muted">{{page.props.auth?.email}}</span></span></component>
  <Link href="/logout" method="post" as="button" class="btn min-h-9! whitespace-nowrap text-xs!">Sign out</Link><button v-if="!setup" class="icon-btn lg:hidden" aria-label="Toggle navigation" @click="$emit('menu')"><Menu :size="20"/></button>
 </div>
</header></template>
