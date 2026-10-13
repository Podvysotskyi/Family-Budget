<script setup lang="ts">
import SelectField from './SelectField.vue';
import {computed,ref} from 'vue';
import {Line} from 'vue-chartjs';
import {Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,Tooltip,Legend,Filler} from 'chart.js';
import {money,dateLabel,iso} from '../lib/format';
import {balanceHistory,type BalanceView} from '../lib/balances';
ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,Tooltip,Legend,Filler);
const props=withDefaults(defineProps<{accounts:any[];history:any[];limits?:any[];initialView?:BalanceView;today?:string;summary?:any;singleAccount?:boolean}>(),{limits:()=>[],initialView:'net'});
const view=ref<BalanceView>(props.initialView),range=ref('ALL'),table=ref(false),usage=ref(false);
const views:Record<BalanceView,string>={net:'Net worth',cash:'Cash',investment:'Investments',credit_card:'Credit cards',loan:'Loans'};
const observations=computed(()=>{
 const rows=balanceHistory(props.accounts,props.history,props.limits,view.value,usage.value&&view.value==='credit_card');
 const now=new Date((props.today||iso(new Date()))+'T12:00:00Z');
 let start:string|undefined;
 if(range.value==='YTD')start=now.getUTCFullYear()+'-01-01';
 else if(range.value!=='ALL'){const months=({'1M':1,'3M':3,'6M':6,'1Y':12} as any)[range.value];now.setUTCMonth(now.getUTCMonth()-months);start=iso(now);}
 if(!start)return rows;
 const baseline=rows.filter(r=>r.date<start!).at(-1);
 return [...(baseline?[{...baseline,date:start,limitChange:false}]:[]),...rows.filter(r=>r.date>=start!)];
});
const isUsage=computed(()=>view.value==='credit_card'&&usage.value);
const data=computed(()=>({labels:observations.value.map(p=>dateLabel(p.date)),datasets:[{label:views[view.value]+(isUsage.value?' usage':' · observed'),data:observations.value.map(p=>p.total===null?null:isUsage.value?p.total:p.total/100),borderColor:'#1e4a8f',backgroundColor:'#e6eefa',fill:true,pointRadius:observations.value.map(p=>p.limitChange&&view.value==='credit_card'?6:2),borderWidth:2,tension:0,stepped:true,spanGaps:false}]}));
const options=computed<any>(()=>({responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:(c:any)=>isUsage.value?Number(c.raw).toFixed(1)+'%':money(c.raw*100)}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{grid:{color:'#f4f4f5'},ticks:{callback:(value:any)=>isUsage.value?value+'%':'$'+Number(value).toLocaleString()}}}}));
</script>
<template><div class="panel p-5">
 <div class="flex flex-wrap items-center justify-between gap-3"><div v-if="!singleAccount" class="segmented"><button v-for="[key,label] in Object.entries(views)" :key="key" :aria-pressed="view===key" @click="view=key as BalanceView">{{label}}</button></div><span v-else class="preview-caption">{{accounts[0]?.type==='credit_card'?'Amount owed':'Balance'}}</span><button class="help underline" @click="table=!table">{{table?'Show chart':'View data table'}}</button></div>
 <div class="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p v-if="summary||singleAccount" class="money text-2xl">{{isUsage?(observations.at(-1)?.total?.toFixed(1)||'—')+'%':money(singleAccount?accounts[0]?.balance_cents:summary?.[{net:'net_cents',cash:'cash_cents',investment:'investments_cents',credit_card:'cards_cents',loan:'loans_cents'}[view]])}}<span v-if="singleAccount&&['credit_card','loan'].includes(accounts[0]?.type)&&!isUsage" class="ml-1 text-sm text-muted">owed</span></p><p v-if="singleAccount" class="help mt-1">As of {{dateLabel(accounts[0]?.balance_date)}} · {{accounts[0]?.source==='provider'?'updated by bank sync':'updated manually'}}</p><p v-else-if="summary?.unknown_count" class="help mt-1">Known subtotal · {{summary.unknown_count}} unknown balances</p></div><div class="flex gap-1"><button v-for="r in ['1M','3M','6M','YTD','1Y','ALL']" :key="r" class="rounded px-2.5 py-1.5 text-xs" :class="range===r?'bg-ink text-white':'hover:bg-ground text-muted'" :aria-pressed="range===r" @click="range=r">{{r}}</button></div></div>
 <div v-if="view==='credit_card'" class="segmented mt-4"><button :aria-pressed="!usage" @click="usage=false">Amount owed</button><button :aria-pressed="usage" @click="usage=true">Usage %</button></div>
 <div v-if="observations.length&&!table" class="mt-5 h-60"><Line :data="data" :options="options" :aria-label="views[view]+' history'" role="img"/></div>
 <table v-else-if="observations.length" class="mt-4"><thead><tr><th>Date</th><th>{{views[view]}}</th><th>Coverage</th></tr></thead><tbody><tr v-for="p in observations" :key="p.date"><td>{{dateLabel(p.date)}}</td><td class="money">{{p.total===null?'Unavailable':isUsage?p.total.toFixed(1)+'%':money(p.total)}}</td><td>{{p.complete?'All selected accounts':'Partial / unavailable'}}<span v-if="p.limitChange"> · Limit change</span></td></tr></tbody></table>
 <p v-else class="empty">No observations in this view. Choose another range or record a balance.</p><p class="help mt-3">{{view==='credit_card'?'Large points mark limit changes. Usage requires known balances and positive limits.':'Based on recorded balances; gaps and partial subtotals remain visible.'}}</p>
</div></template>