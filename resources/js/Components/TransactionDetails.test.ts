import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import TransactionDetails from './TransactionDetails.vue';
const mocks=vi.hoisted(()=>({patch:vi.fn(),visit:vi.fn(),before:undefined as any,form:undefined as any}));
vi.mock('@inertiajs/vue3',async(importOriginal)=>{const actual:any=await importOriginal();return {...actual,usePage:()=>({props:{auth:{timezone:'America/Chicago'}}}),useForm:(data:any)=>{const form=actual.useForm(data);form.patch=mocks.patch;mocks.form=form;return form;},router:{on:(_event:string,callback:any)=>{mocks.before=callback;return ()=>{};},visit:mocks.visit}};});
let panel:ReturnType<typeof mount>|undefined;
const catalog={accounts:[{id:'checking',name:'Checking'}],categories:[]};
beforeEach(()=>{vi.clearAllMocks();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(JSON.stringify(url.startsWith('/history/')?{data:[]}:{transaction:{id:'first',payee:'Groceries',amount_cents:'-1200',transaction_date:'2026-10-03',account_id:'checking',source:'provider',status:'posted',notes:'Original note',category_id:null,manual_classification:null,lock_version:4},attachments:[]}))));});
afterEach(()=>{panel?.unmount();panel=undefined;vi.unstubAllGlobals();});
describe('Transaction workspace',()=>{
 it('keeps edited notes when row switching is canceled and switches only after discarding',async()=>{
  panel=mount(TransactionDetails,{props:{id:'first',catalog,embedded:true},attachTo:document.body});await flushPromises();await panel.get('#transaction-notes').setValue('My unsaved note');await flushPromises();
  (panel.vm as any).selectTransaction('second');await flushPromises();expect(panel.emitted('select')).toBeUndefined();
  await panel.get('[data-cancel]').trigger('click');expect((panel.get('#transaction-notes').element as HTMLTextAreaElement).value).toBe('My unsaved note');
  (panel.vm as any).selectTransaction('second');await flushPromises();await panel.get('.btn-destructive').trigger('click');await flushPromises();expect(panel.emitted('select')).toEqual([['second']]);
 });
 it('saves metadata using the loaded lock and retains values on a conflict',async()=>{
  panel=mount(TransactionDetails,{props:{id:'first',catalog,embedded:true}});await flushPromises();await panel.get('#transaction-notes').setValue('New note');await panel.get('form').trigger('submit');
  expect(mocks.patch).toHaveBeenCalledWith('/transactions/first',expect.objectContaining({preserveScroll:true}));expect(mocks.form.data()).toMatchObject({notes:'New note',lock_version:4});
  mocks.patch.mock.calls[0][1].onHttpException({status:409});await flushPromises();expect(panel.text()).toContain('Your values are still here');expect((panel.get('#transaction-notes').element as HTMLTextAreaElement).value).toBe('New note');
 });
 it('guards navigation with unsaved metadata and resumes the requested visit after confirmation',async()=>{
  panel=mount(TransactionDetails,{props:{id:'first',catalog,embedded:true},attachTo:document.body});await flushPromises();await panel.get('#transaction-notes').setValue('Draft');await flushPromises();
  const preventDefault=vi.fn();mocks.before({preventDefault,detail:{visit:{url:'/accounts',method:'get'}}});await flushPromises();expect(preventDefault).toHaveBeenCalled();expect(mocks.visit).not.toHaveBeenCalled();
  await panel.get('.btn-destructive').trigger('click');await flushPromises();expect(mocks.visit).toHaveBeenCalledWith('/accounts',{url:'/accounts',method:'get'});
 });
 it('refreshes after an external edit while preserving an unsaved inline draft',async()=>{
  panel=mount(TransactionDetails,{props:{id:'first',version:4,catalog,embedded:true}});await flushPromises();
  const response={transaction:{id:'first',payee:'Updated groceries',amount_cents:'-1200',transaction_date:'2026-10-03',source:'provider',notes:'Saved from edit dialog',lock_version:5},attachments:[]};
  vi.mocked(fetch).mockImplementation(async(url:any)=>new Response(JSON.stringify(String(url).startsWith('/history/')?{data:[]}:response)));
  await panel.setProps({version:5});await flushPromises();expect(panel.text()).toContain('Updated groceries');expect((panel.get('#transaction-notes').element as HTMLTextAreaElement).value).toBe('Saved from edit dialog');
  await panel.get('#transaction-notes').setValue('Unsaved draft');await flushPromises();vi.mocked(fetch).mockClear();await panel.setProps({version:6});await flushPromises();expect(fetch).not.toHaveBeenCalled();expect((panel.get('#transaction-notes').element as HTMLTextAreaElement).value).toBe('Unsaved draft');
 });
 it('reflects bank investment classifications and lets the user override them without losing notes',async()=>{
  vi.mocked(fetch).mockImplementation(async(url:any)=>new Response(JSON.stringify(String(url).startsWith('/history/')?{data:[]}:{transaction:{id:'first',payee:'Fund purchase',amount_cents:'-1200',source:'provider',notes:'Keep this note',manual_classification:null,provider_classification:'investment_purchase',lock_version:4},attachments:[]})));
  panel=mount(TransactionDetails,{props:{id:'first',catalog,embedded:true}});await flushPromises();expect((panel.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true);
  await panel.get('input[type="checkbox"]').setValue(false);expect(mocks.form.manual_classification).toBe('ordinary');expect(mocks.form.notes).toBe('Keep this note');
 });
});
