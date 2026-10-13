export type BalanceView = 'net' | 'cash' | 'investment' | 'credit_card' | 'loan';
export function balanceHistory(accounts:any[], history:any[], limits:any[], view:BalanceView, usage=false) {
    const selected=accounts.filter(a=>view==='net'||(view==='cash'?['cash','checking','savings'].includes(a.type):a.type===view));
    const dates=[...new Set<string>([...history.filter(e=>selected.some(a=>a.id===e.account_id)).map(e=>e.effective_date),...(view==='credit_card'?limits.filter(e=>selected.some(a=>a.id===e.account_id)).map(e=>e.effective_date):[])])].sort();
    return dates.map(date=>{
        let total=0, known=0, totalLimit=0, limitsKnown=0;
        for(const account of selected){
            const event=history.filter(e=>e.account_id===account.id&&e.effective_date<=date).sort((a,b)=>a.effective_date.localeCompare(b.effective_date)||a.created_at.localeCompare(b.created_at)).at(-1);
            if(event){total+=Number(event.balance_cents)*(view==='net'&&['credit_card','loan'].includes(account.type)?-1:1);known++;}
            const limit=limits.filter(e=>e.account_id===account.id&&e.effective_date<=date).sort((a,b)=>a.effective_date.localeCompare(b.effective_date)).at(-1);
            if(limit&&Number(limit.limit_cents)>0){totalLimit+=Number(limit.limit_cents);limitsKnown++;}
        }
        const complete=known===selected.length&&selected.length>0;
        return {date,total:usage?(complete&&limitsKnown===selected.length?Math.max(0,total)/totalLimit*100:null):known?total:null,complete:complete&&(!usage||limitsKnown===selected.length),limitChange:limits.some(e=>e.effective_date===date&&selected.some(a=>a.id===e.account_id))};
    });
}
