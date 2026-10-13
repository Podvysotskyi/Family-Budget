import {describe,it,expect,vi} from 'vitest';
import {mount} from '@vue/test-utils';
import {nextTick} from 'vue';
import SelectField from './SelectField.vue';

describe('Select field',()=>{
 it.each([null,25,'monthly'])('preserves the value type when choosing %s',async value=>{
  const field=mount(SelectField,{props:{modelValue:'other',options:[{value:'other',label:'Other'},{value,label:'Choice'}]}});

  await field.get('[role="combobox"]').trigger('click');await field.findAll('[role="option"]')[1].trigger('click');

  expect(field.emitted('update:modelValue')).toEqual([[value]]);expect(field.emitted('change')).toEqual([[value]]);
  expect(field.get('[role="combobox"]').attributes('aria-expanded')).toBe('false');field.unmount();
 });
 it('navigates from the selected option, skips disabled options, and selects by keyboard',async()=>{
  const field=mount(SelectField,{props:{modelValue:'weekly',options:[{value:'weekly',label:'Weekly'},{value:'monthly',label:'Monthly',disabled:true},{value:'yearly',label:'Yearly'}]}});
  const trigger=field.get('[role="combobox"]');

  await trigger.trigger('keydown',{key:'ArrowDown'});await trigger.trigger('keydown',{key:'ArrowDown'});await trigger.trigger('keydown',{key:'Enter'});

  expect(field.emitted('update:modelValue')).toEqual([['yearly']]);field.unmount();
 });
 it('filters long lists, shows an empty state, and selects the first search result',async()=>{
  const field=mount(SelectField,{props:{modelValue:null,searchable:true,options:[{value:null,label:'Unassigned'},{value:'alex',label:'Alex'},{value:'sam',label:'Sam'}]}});

  await field.get('button').trigger('click');await field.get('input').setValue('missing');
  expect(field.text()).toContain('No matching options.');expect(field.findAll('[role="option"]')).toHaveLength(0);
  await field.get('input').setValue('sam');await field.get('input').trigger('keydown',{key:'Enter'});

  expect(field.emitted('update:modelValue')).toEqual([['sam']]);field.unmount();
 });
 it('closes on Escape without letting Escape close its containing modal',async()=>{
  const container=document.createElement('div');document.body.append(container);const escaped=vi.fn();container.addEventListener('keydown',escaped);
  const field=mount(SelectField,{attachTo:container,props:{modelValue:'first',options:[{value:'first',label:'First'}]}});

  await field.get('button').trigger('click');escaped.mockClear();await field.get('button').trigger('keydown',{key:'Escape'});

  expect(escaped).not.toHaveBeenCalled();expect(document.activeElement).toBe(field.get('button').element);
  expect(field.get('button').attributes('aria-expanded')).toBe('false');field.unmount();container.remove();
 });
 it('does not open while disabled, and closes if it becomes disabled',async()=>{
  const field=mount(SelectField,{props:{modelValue:'first',disabled:true,options:[{value:'first',label:'First'}]}});

  await field.get('button').trigger('keydown',{key:'ArrowDown'});expect(field.find('[role="listbox"]').exists()).toBe(false);
  await field.setProps({disabled:false});await field.get('button').trigger('click');await field.setProps({disabled:true});

  expect(field.find('[role="listbox"]').exists()).toBe(false);expect(field.emitted('update:modelValue')).toBeUndefined();field.unmount();
 });
 it('requires a nonempty account and clears validation after choosing one',async()=>{
  const field=mount(SelectField,{props:{modelValue:'',required:true,name:'account_id',options:[{value:'',label:'Choose an account'},{value:'checking',label:'Checking'}]}});

  expect((field.get('input').element as HTMLInputElement).checkValidity()).toBe(false);await nextTick();
  expect(field.get('[role="alert"]').text()).toBe('Choose an option.');
  await field.get('button').trigger('click');await field.findAll('[role="option"]')[1].trigger('click');await field.setProps({modelValue:'checking'});

  expect((field.get('input').element as HTMLInputElement).checkValidity()).toBe(true);
  expect(field.find('[role="alert"]').exists()).toBe(false);expect(field.get('input').element.value).toBe('checking');field.unmount();
 });
 it('finds a non-searchable option by typing and supports Home and End',async()=>{
  const field=mount(SelectField,{props:{modelValue:'weekly',options:[{value:'weekly',label:'Weekly'},{value:'monthly',label:'Monthly'},{value:'yearly',label:'Yearly'}]}});
  const trigger=field.get('button');

  await trigger.trigger('keydown',{key:'m'});await trigger.trigger('keydown',{key:'Enter'});
  expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['monthly']);
  await trigger.trigger('click');await trigger.trigger('keydown',{key:'End'});await trigger.trigger('keydown',{key:'Home'});await trigger.trigger('keydown',{key:'Enter'});

  expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['weekly']);field.unmount();
 });
 it('does not issue a change when reselecting the current value',async()=>{
  const field=mount(SelectField,{props:{modelValue:'weekly',options:[{value:'weekly',label:'Weekly'}]}});

  await field.get('button').trigger('click');await field.get('[role="option"]').trigger('click');

  expect(field.emitted('change')).toBeUndefined();field.unmount();
 });
});
