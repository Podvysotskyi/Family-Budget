export function money(cents: string|number|null|undefined): string {
 if(cents===null||cents===undefined)return 'Unknown';
 return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents)/100);
}
export function dollars(cents: string|number|null|undefined): string {return cents===null||cents===undefined?'':(Number(cents)/100).toFixed(2);}
export function iso(date: Date): string {return date.toISOString().slice(0,10);}
export function dateLabel(date: string|null|undefined): string {return date?new Date(date.slice(0,10)+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'—';}
export function monthLabel(month: string): string {return new Date(month+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});}
export function shiftMonth(month: string,amount: number): string {const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+amount);return iso(d).slice(0,7);}
export async function json<T=any>(url: string): Promise<T> {const response=await fetch(url,{headers:{Accept:'application/json'},credentials:'same-origin'});if(!response.ok)throw new Error(response.status===409?'This record changed. Reload it before saving.':response.status===403?'Your household access has changed.':'Could not load this record.');return response.json();}
