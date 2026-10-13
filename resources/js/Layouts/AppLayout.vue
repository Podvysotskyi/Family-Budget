<script setup lang="ts">
import {Link,usePage,router} from '@inertiajs/vue3';
import {computed,ref,onMounted,onBeforeUnmount} from 'vue';
import {CalendarDays,Wallet,ReceiptText,Repeat,CreditCard,Landmark,ChartNoAxesCombined,Tags,Bell,ChevronDown,LogOut,Menu,Users} from 'lucide-vue-next';
import FeedbackToasts from '../Components/FeedbackToasts.vue';import AppHeader from '../Components/AppHeader.vue';
const props=defineProps<{section:string}>();
const page=usePage<any>();const accountMenu=ref(false);const mobile=ref(false);
const nav=[{key:'home',label:'Home',icon:CalendarDays,children:[]},{key:'bills',label:'Bills',icon:ReceiptText,children:[['income','Income'],['subscriptions','Subscriptions']]},{key:'accounts',label:'Accounts',icon:CreditCard,children:[['loans','Loans'],['investments','Investments']]},{key:'budget',label:'Budget',icon:Wallet,children:[['transactions','Transactions']]},{key:'household',label:'Household',icon:Users,children:[['categories','Categories']]}];
const activeGroup=(item:any)=>item.key===props.section||item.children.some((c:string[])=>c[0]===props.section);
let timer:ReturnType<typeof setInterval>|undefined;
async function checkAccess(){try{const response=await fetch('/context',{headers:{Accept:'application/json'},cache:'no-store'});if(response.status===403||response.status===401){window.location.replace('/setup');return;}if(!response.ok)return;const context=await response.json();if(context.household_id!==page.props.household?.id){window.location.replace('/setup');}else if(context.access_version!==page.props.household?.access_version||context.data_version!==page.props.household?.data_version){router.reload();}}catch{}}
onMounted(()=>{timer=setInterval(checkAccess,15000);window.addEventListener('focus',checkAccess);});
onBeforeUnmount(()=>{clearInterval(timer);window.removeEventListener('focus',checkAccess);});
</script>
<template><div class="min-h-dvh bg-ground">
 <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
 <AppHeader @menu="mobile=!mobile"/>
 <FeedbackToasts/>
 <div class="flex">
  <aside class="fixed inset-y-16 left-0 z-40 w-60 shrink-0 border-r border-line bg-white px-3.5 py-5 lg:sticky lg:top-0 lg:block lg:h-[calc(100dvh-64px)]" :class="mobile?'block':'hidden'">
   <Link href="/household" class="mb-5 block rounded-lg border border-line bg-ground p-3"><p class="font-medium">{{page.props.household?.name}}</p><p class="help mt-1">{{page.props.household?.member_count}} members · {{page.props.household?.owner?'You are the owner':'You are a member'}}</p></Link>
   <nav aria-label="Main navigation" class="flex flex-col gap-1"><div v-for="item in nav" :key="item.key"><Link :href="'/'+item.key" class="flex items-center gap-3 rounded-md px-3 py-2" :aria-current="section===item.key?'page':undefined" :class="section===item.key?'bg-ink font-medium text-white':activeGroup(item)?'font-semibold text-ink':'text-muted hover:bg-zinc-50 hover:text-ink'" @click="mobile=false"><component :is="item.icon" :size="18"/>{{item.label}}<ChevronDown v-if="item.children.length" :size="14" class="ml-auto" :class="activeGroup(item)?'':'-rotate-90'"/></Link><template v-if="activeGroup(item)"><Link v-for="[key,label] in item.children" :key="key" :href="'/'+key" class="mt-1 block rounded-md py-2 pl-11 pr-3" :aria-current="section===key?'page':undefined" :class="section===key?'bg-ink font-medium text-white':'text-muted hover:bg-zinc-50'" @click="mobile=false">{{label}}</Link></template></div></nav>

  </aside>
  <main id="main" class="min-w-0 flex-1 px-5 py-7 lg:px-8">


   <div class="mx-auto max-w-[1200px]"><slot/></div>
  </main>
 </div>
</div></template>
