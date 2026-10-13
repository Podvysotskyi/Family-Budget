import type {Directive} from 'vue';

const fieldIds:Record<string,string>={account_id:'edit-account',institution_name:'edit-institution',target_member_id:'edit-target',member_id:'edit-member',category_id:'edit-category-id',parent_id:'category-parent',kind:'edit-kind',day_one:'day-one',day_two:'day-two',fee:'fee-amount',fee_cadence:'fee-cadence',statement_day:'statement-day',due_day:'due-day',usual_paying_account_id:'usual-account',scope:'schedule-scope',timezone:'profile-timezone',reminder_local_time:'profile-time',month:'target-month',repayment_total:'edit-balance'};
export function fieldElement(root:HTMLElement,key:string):HTMLElement|null{
 const ids=[fieldIds[key],'edit-'+key.replaceAll('_','-'),...(key==='balance'?['account-balance']:[]),...(key==='name'?['delete-household']:[])].filter(Boolean);
 for(const id of ids){const element=root.querySelector<HTMLElement>('#'+id);if(element)return element;}
 return root.querySelector<HTMLElement>('[data-field="'+key.split('.')[0]+'"]');
}
export function fieldKey(element:HTMLElement):string|null{
 const explicit=element.dataset.field;if(explicit)return explicit;
 const id=element.id||element.closest('.field')?.querySelector('[id]')?.id;
 if(!id)return null;const entry=Object.entries(fieldIds).find(([,value])=>value===id);
 if(entry)return entry[0];if(id==='account-balance')return 'balance';if(id==='delete-household')return 'name';return id.startsWith('edit-')?id.slice(5).replaceAll('-','_'):null;
}
export function moneyError(value:string,signed=false,positive=false):string|null{
 if(!(signed?/^-?\d{1,9}(?:\.\d{1,2})?$/:/^\d{1,9}(?:\.\d{1,2})?$/).test(value))return 'Enter a USD amount with at most two decimal places.';
 if(positive&&Number(value)<=0)return 'Enter an amount greater than zero.';return null;
}
function paintErrors(root:HTMLElement,errors:Record<string,string>){
 root.querySelectorAll('[data-field-error]').forEach(element=>element.remove());
 root.querySelectorAll('[data-invalid]').forEach(element=>{element.removeAttribute('aria-invalid');element.removeAttribute('aria-describedby');element.removeAttribute('data-invalid');element.classList.remove('border-orange-600!');});
 for(const [key,message] of Object.entries(errors)){const control=fieldElement(root,key);if(!control)continue;const parent=control.closest('.field')||control.parentElement;if(!parent)continue;const error=document.createElement('p');error.id='error-'+key.replaceAll('.','-');error.dataset.fieldError=key;error.className='help text-warning';error.textContent='⚠ '+message;parent.append(error);control.dataset.invalid='true';control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',error.id);control.classList.add('border-orange-600!');}
}
export const fieldErrors:Directive<HTMLElement,Record<string,string>>={mounted:(root,binding)=>paintErrors(root,binding.value),updated:(root,binding)=>paintErrors(root,binding.value)};
