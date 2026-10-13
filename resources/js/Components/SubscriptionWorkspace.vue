<script setup lang="ts">
import {ref,watch} from 'vue';
import {Bar} from 'vue-chartjs';
import {Chart as ChartJS,CategoryScale,LinearScale,BarElement,Tooltip,Legend} from 'chart.js';
import Pagination from './Pagination.vue';import LoadingState from './LoadingState.vue';
import {json,money,dateLabel} from '../lib/format';
ChartJS.register(CategoryScale,LinearScale,BarElement,Tooltip,Legend);
const props=defineProps<{records:any;summary:any;catalog:any;today:string}>();
const emit=defineEmits<{edit:[record:any];cancel:[record:any];remove:[record:any];payment:[id:string];history:[record:any]}>();
const selected=ref<string>(),detail=ref<any>(),error=ref(''),table=ref(false);
let loadNumber=0;
async function load(url?:string){if(!selected.value)return;const request=++loadNumber;error.value='';try{const result=await json(url||'/schedules/'+selected.value);if(request===loadNumber)detail.value=result;}catch(e:any){if(request===loadNumber)error.value=e.message;}}
watch(()=>props.records,()=>{if(!props.records.data.some((r:any)=>r.id===selected.value)){loadNumber++;selected.value=props.records.data[0]?.id;detail.value=null;error.value='';}load();},{immediate:true});
function select(id:string){selected.value=id;detail.value=null;load();}
const options:any={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{grid:{display:false},stacked:true},y:{stacked:true,ticks:{callback:(v:any)=>'$'+v}}}};
</script>
<template><div>
 <p class="mb-5 text-muted"><strong class="text-ink">{{money(summary?.monthly_estimate_cents)}} a month</strong> across {{summary?.active_count||0}} active subscriptions. <span class="help">Annualized estimate across all pages.</span></p>
 <div class="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
  <div><button v-for="s in records.data" :key="s.id" class="workspace-selector" :aria-pressed="selected===s.id" @click="select(s.id)"><span class="flex justify-between gap-3 font-medium"><span>{{s.name}}</span><span class="money">{{money(s.amount_cents)}}</span></span><span class="help mt-2 block">{{s.cancel_date?(s.cancel_date<=today?'Canceled ':'Cancels ')+dateLabel(s.cancel_date):s.frequency.replaceAll('_',' ')}} · Next {{dateLabel(s.next?.due_date)}}</span></button><Pagination :records="records"/></div>
  <div v-if="error" role="alert" class="panel p-5 text-orange-800">{{error}} <button class="underline" @click="load()">Retry</button></div>
  <LoadingState v-else-if="selected&&!detail" :loading="true" label="Loading subscription" class="panel"/>
  <div v-else-if="detail" class="min-w-0 space-y-5">
   <div class="panel p-5"><div class="flex flex-wrap justify-between gap-3"><div><h2 class="text-xl">{{detail.series.name}} <span class="badge">{{detail.series.cancel_date?(detail.series.cancel_date<=today?'Canceled':'Cancellation scheduled'):'Active'}}</span></h2><p class="help mt-2">{{detail.series.frequency.replaceAll('_',' ')}} · Started {{dateLabel(detail.series.first_date)}}</p></div><div class="flex flex-wrap gap-2"><button v-if="!detail.series.cancel_date" class="btn" @click="emit('cancel',detail.series)">Cancel subscription…</button><button class="btn" @click="emit('edit',records.data.find((s:any)=>s.id===selected))">Edit</button><button class="btn" @click="emit('history',detail.series)">History</button><button class="btn-danger" @click="emit('remove',detail.series)">Delete</button></div></div><div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><div v-for="[label,value] in [['Amount',money(detail.series.amount_cents)],['Next payment',dateLabel(records.data.find((s:any)=>s.id===selected)?.next?.due_date)],['Paid this year',money(detail.summary.paid_year_cents)],['Paid since start',money(detail.summary.paid_total_cents)]]" :key="label"><p class="help">{{label}}</p><p class="money mt-2 text-xl">{{value}}</p></div></div></div>
   <div class="panel p-5"><div class="flex justify-between"><h3 class="font-medium">Payments by month</h3><button class="help underline" @click="table=!table">{{table?'Chart':'Data table'}}</button></div><p class="help mt-1">UTC months: paid amounts use actual completion dates; scheduled amounts use due dates.</p><div v-if="!table" class="mt-5 h-56"><Bar :data="{labels:detail.chart.map((p:any)=>p.month),datasets:[{label:'Paid',data:detail.chart.map((p:any)=>Number(p.paid_cents)/100),backgroundColor:'#245394'},{label:'Scheduled',data:detail.chart.map((p:any)=>Number(p.scheduled_cents)/100),backgroundColor:'#e6edf8',borderColor:'#245394',borderWidth:1}]}" :options="options" role="img" aria-label="Subscription payments by month"/></div><table v-else><thead><tr><th>Month</th><th>Paid</th><th>Scheduled</th></tr></thead><tbody><tr v-for="p in detail.chart" :key="p.month"><td>{{p.month}}</td><td>{{money(p.paid_cents)}}</td><td>{{money(p.scheduled_cents)}}</td></tr></tbody></table></div>
   <div class="panel overflow-x-auto"><h3 class="px-5 py-4 font-medium">Payments</h3><table><thead><tr><th>Due</th><th>Amount</th><th>Status</th><th>Transactions</th><th/></tr></thead><tbody><tr v-for="p in detail.payments.data" :key="p.id"><td>{{dateLabel(p.due_date)}}</td><td class="money">{{money(p.amount_cents)}}</td><td>{{p.status==='paid'?'Paid '+dateLabel(p.completed_date):p.due_date<today?'Overdue':'Unpaid'}}</td><td class="text-muted">{{p.attached_payees?.join(', ')||'—'}}</td><td><button class="btn" @click="emit('payment',p.id)">{{p.status==='paid'?'Manage payment':'Mark paid'}}</button></td></tr></tbody></table><Pagination :records="detail.payments" asynchronous @load="load"/></div>
  </div>
 </div><p v-if="!records.data.length" class="panel empty">No subscriptions match this view.</p>
</div></template>
