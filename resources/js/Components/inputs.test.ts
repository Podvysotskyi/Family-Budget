import {describe,it,expect} from 'vitest';import {mount} from '@vue/test-utils';import DateField from './DateField.vue';import CategoryField from './CategoryField.vue';

describe('category paths',()=>{
 it('distinguishes identical subcategory names and searches by their parent',async()=>{
  const field=mount(CategoryField,{props:{modelValue:'child-a',categories:[{id:'parent-a',name:'Utilities',kind:'expense'},{id:'child-a',parent_id:'parent-a',name:'Other',kind:'expense'},{id:'parent-b',name:'Transport',kind:'expense'},{id:'child-b',parent_id:'parent-b',name:'Other',kind:'expense'}]}});
  expect(field.get('button').text()).toBe('Utilities › Other');
  await field.get('button').trigger('click');await field.get('input').setValue('transport');
  expect(field.findAll('[role="option"]').map(o=>o.text())).toEqual(['Transport','Transport › Other']);
  await field.get('[role="option"]:last-of-type').trigger('click');expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['child-b']);
 });
});
describe('Date field',()=>{
 it('accepts typed dates and rejects impossible dates without replacing the saved date',async()=>{
  const field=mount(DateField,{props:{modelValue:'2026-01-31',label:'Due date'}});
  await field.get('input').setValue('02/30/2026');expect((field.get('input').element as HTMLInputElement).validationMessage).toBe('Enter a real calendar date.');expect(field.emitted('update:modelValue')).toBeUndefined();
  await field.get('input').setValue('02/28/2026');expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['2026-02-28']);expect((field.get('input').element as HTMLInputElement).validationMessage).toBe('');
 });
 it('selects a leap day through the calendar',async()=>{
  const field=mount(DateField,{props:{modelValue:'2028-02-01'}});await field.get('button[aria-label="Choose date"]').trigger('click');await field.get('button[aria-label="2028-02-29"]').trigger('click');expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['2028-02-29']);
 });
});
describe('Category field',()=>{
 it('filters names and commits a choice by keyboard',async()=>{
  const field=mount(CategoryField,{props:{modelValue:null,categories:[{id:'rent',name:'Rent',kind:'expense',parent_id:null},{id:'salary',name:'Salary',kind:'income',parent_id:null}],kind:'expense'}});
  await field.get('button').trigger('click');await field.get('input').setValue('ren');expect(field.text()).not.toContain('Salary');await field.get('input').trigger('keydown',{key:'Enter'});expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['rent']);
 });
});
