import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import FinanceEditor from './FinanceEditor.vue';
const mocks=vi.hoisted(()=>({submit:vi.fn(),visit:vi.fn(),before:undefined as any}));
vi.mock('@inertiajs/vue3',async(importOriginal)=>{const actual:any=await importOriginal();return {...actual,usePage:()=>({props:{today:'2026-10-10',utcMonth:'2026-10',auth:{timezone:'America/Chicago'},household:{name:'Our household',owner_member_id:'owner'}}}),useForm:(data:any)=>{const form=actual.useForm(data);let transform=(values:any)=>values;form.transform=(callback:any)=>{transform=callback;return form;};form.submit=(method:string,url:string,options:any)=>mocks.submit(method,url,transform(form.data()),options);return form;},router:{on:(_event:string,callback:any)=>{mocks.before=callback;return ()=>{};},visit:mocks.visit}};});
let editor:ReturnType<typeof mount>|undefined;
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}')));HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(()=>{editor?.unmount();editor=undefined;vi.unstubAllGlobals();});
const catalog={accounts:[],categories:[],members:[]};
describe('Finance editor validation and draft protection',()=>{
 it('selects a budget target month with the shared calendar style and submits YYYY-MM',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'target',record:{category_id:'food',target_cents:'50000'},month:'2026-10',catalog:{...catalog,categories:[{id:'food',name:'Food',kind:'expense',parent_id:null}]}},attachTo:document.body});await flushPromises();
  await editor.get('#target-month').setValue('13/2026');
  await editor.get('form').trigger('submit');await flushPromises();
  expect(mocks.submit).not.toHaveBeenCalled();expect(editor.get('#target-month').attributes('aria-invalid')).toBe('true');

  await editor.get('[aria-label="Choose month"]').trigger('click');
  await editor.get('[aria-label="Next year"]').trigger('click');
  await editor.get('[aria-label="December 2027"]').trigger('click');
  await editor.get('form').trigger('submit');

  expect(mocks.submit).toHaveBeenCalledWith('post','/budget/targets',expect.objectContaining({category_id:'food',month:'2027-12',amount:'500.00',scope:'month'}),expect.any(Object));
 });
 it.each(['bill','subscription'])('omits paying accounts when creating or editing a %s',async(kind)=>{
  editor=mount(FinanceEditor,{props:{kind:'schedule',record:{id:'schedule',kind,name:'Rent',amount_cents:10000,frequency:'monthly',first_date:'2026-10-10',account_ids:['checking'],next:{id:'occurrence'}},catalog:{...catalog,accounts:[{id:'checking',name:'Checking'}]}},attachTo:document.body});await flushPromises();
  expect(editor.text()).not.toContain('Paying accounts');expect(editor.text()).not.toContain('This selection helps matching');
  await editor.get('form').trigger('submit');
  expect(mocks.submit).toHaveBeenCalledWith('patch','/schedules/schedule',expect.objectContaining({kind}),expect.any(Object));
  expect(mocks.submit.mock.calls[0][2]).not.toHaveProperty('account_ids');
 });
 it('shows no paying accounts on a new bill and keeps receiving accounts when switching to income',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'schedule',catalog:{...catalog,accounts:[{id:'checking',name:'Checking'}]}},attachTo:document.body});await flushPromises();
  expect(editor.text()).not.toContain('Paying accounts');
  await editor.get('#edit-name').setValue('Salary');await editor.get('#edit-amount').setValue('100');
  await editor.get('#edit-kind').trigger('click');await editor.findAll('[role="option"]').find(option=>option.text()==='Income')!.trigger('click');
  expect(editor.text()).toContain('Receiving accounts');
  await editor.get('input[type="checkbox"][value="checking"]').setValue(true);await editor.get('form').trigger('submit');
  expect(mocks.submit.mock.calls[0][2]).toMatchObject({kind:'income',account_ids:['checking']});
 });
 it('requires a Google email and submits the invitation together with the new member',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'member',catalog},attachTo:document.body});await flushPromises();
  expect(editor.get('h2').text()).toBe('Add member');expect(editor.text()).toContain('Add someone to Our household.');
  expect((editor.get('#member-google').element as HTMLInputElement).checked).toBe(true);
  await editor.get('#edit-nickname').setValue('Jamie');await editor.get('form').trigger('submit');await flushPromises();
  expect(mocks.submit).not.toHaveBeenCalled();expect(editor.get('#edit-email').attributes('aria-invalid')).toBe('true');
  await editor.get('#edit-email').setValue('jamie@example.com');await editor.get('form').trigger('submit');
  expect(mocks.submit).toHaveBeenCalledWith('post','/household/members',expect.objectContaining({nickname:'Jamie',email:'jamie@example.com'}),expect.any(Object));
 });
 it('adds a member without an invitation after selecting no login and retains the email draft when switching back',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'member',catalog},attachTo:document.body});await flushPromises();
  await editor.get('#edit-nickname').setValue('Jamie');await editor.get('#edit-email').setValue('unfinished email');
  await editor.get('#member-no-login').setValue();await flushPromises();
  expect(editor.find('#edit-email').exists()).toBe(false);expect(editor.text()).not.toContain('Add and send invitation');
  await editor.get('form').trigger('submit');
  expect(mocks.submit).toHaveBeenCalledWith('post','/household/members',expect.objectContaining({nickname:'Jamie'}),expect.any(Object));
  expect(mocks.submit.mock.calls[0][2]).not.toHaveProperty('email');
  await editor.get('#member-google').setValue();await flushPromises();
  expect((editor.get('#edit-email').element as HTMLInputElement).value).toBe('unfinished email');
 });
 it('keeps editing an existing member limited to their nickname',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'member',record:{id:'member',nickname:'Jamie',lock_version:2},catalog},attachTo:document.body});await flushPromises();
  expect(editor.find('#member-google').exists()).toBe(false);
  await editor.get('#edit-nickname').setValue('James');await editor.get('form').trigger('submit');
  expect(mocks.submit).toHaveBeenCalledWith('patch','/household/members/member',expect.objectContaining({nickname:'James',lock_version:2}),expect.any(Object));
  expect(mocks.submit.mock.calls[0][2]).not.toHaveProperty('email');
 });
 it('shows inline blur errors and focuses a linked summary on invalid submission',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'account',catalog},attachTo:document.body});await flushPromises();
  await editor.get('#account-balance').setValue('1.005');await editor.get('#account-balance').trigger('focusout');
  expect(editor.get('#account-balance').attributes('aria-invalid')).toBe('true');expect(editor.text()).toContain('at most two decimal places');
  await editor.get('form').trigger('submit');await flushPromises();
  expect(mocks.submit).not.toHaveBeenCalled();expect(document.activeElement?.id).toBe('form-errors');
  await editor.get('#account-balance').setValue('100.25');await editor.get('#account-balance').trigger('focusout');
  expect(editor.get('#account-balance').attributes('aria-invalid')).toBeUndefined();
 });
 it('retains a dirty draft when closing is canceled and discards only on explicit confirmation',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'account',catalog},attachTo:document.body});await flushPromises();await editor.get('#edit-name').setValue('Savings');await flushPromises();
  await editor.get('button[aria-label="Close dialog"]').trigger('click');await flushPromises();
  expect(editor.findAll('dialog[open]')).toHaveLength(2);expect(editor.emitted('close')).toBeUndefined();
  const confirm=editor.findAll('dialog[open]')[1];await confirm.get('[data-cancel]').trigger('click');await flushPromises();
  expect((editor.get('#edit-name').element as HTMLInputElement).value).toBe('Savings');expect(editor.emitted('close')).toBeUndefined();
  await editor.get('button[aria-label="Close dialog"]').trigger('click');await flushPromises();await editor.findAll('dialog[open]')[1].get('.btn-danger').trigger('click');
  expect(editor.emitted('close')).toHaveLength(1);
 });
 it('protects dirty drafts during navigation and resumes the requested visit after confirmation',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'account',catalog},attachTo:document.body});await flushPromises();await editor.get('#edit-name').setValue('Savings');await flushPromises();
  const preventDefault=vi.fn();mocks.before({preventDefault,detail:{visit:{url:'/budget',method:'get'}}});await flushPromises();
  expect(preventDefault).toHaveBeenCalled();expect(mocks.visit).not.toHaveBeenCalled();
  await editor.findAll('dialog[open]')[1].get('.btn-danger').trigger('click');expect(mocks.visit).toHaveBeenCalledWith('/budget',{url:'/budget',method:'get'});
 });
 it('prevents ownership transfer without an eligible member',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'owner',catalog:{...catalog,members:[{id:'owner',nickname:'Owner',user_id:1},{id:'unlinked',nickname:'Guest',user_id:null}]}},attachTo:document.body});await flushPromises();
  await editor.get('#edit-member').trigger('click');expect(editor.findAll('[role="option"]').map(option=>option.text())).toEqual(['Choose a new owner']);
  await editor.get('form').trigger('submit');expect(mocks.submit).not.toHaveBeenCalled();expect(editor.text()).toContain('Choose a new owner.');
 });
 it('validates a new loan balance independently from an existing repayment base',async()=>{
  editor=mount(FinanceEditor,{props:{kind:'loan',catalog},attachTo:document.body});await flushPromises();
  await editor.get('#edit-balance').setValue('10.001');await editor.get('#edit-balance').trigger('focusout');
  expect(editor.get('#edit-balance').attributes('aria-invalid')).toBe('true');expect(editor.get('[data-field-error="balance"]').text()).toContain('two decimal places');
 });
});
