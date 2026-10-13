import {afterEach,describe,expect,it} from 'vitest';
import {mount} from '@vue/test-utils';
import MonthField from './MonthField.vue';

let field:ReturnType<typeof mount>;
afterEach(()=>field?.unmount());

describe('Month field',()=>{
 it('formats a saved month and emits canonical values for typed input',async()=>{
  field=mount(MonthField,{props:{modelValue:'2026-10',label:'Budget month',id:'budget-month'}});
  expect((field.get('input').element as HTMLInputElement).value).toBe('10/2026');
  expect(field.get('input').attributes('aria-label')).toBe('Budget month');

  await field.get('input').setValue('2/2027');

  expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['2027-02']);
 });

 it.each([['13/2026','Enter a real calendar month.'],['00/2026','Enter a real calendar month.'],['10/0000','Enter a real calendar month.'],['2026-10','Enter a valid month as MM/YYYY.']])('rejects %s without replacing the saved month',async(value,message)=>{
  field=mount(MonthField,{props:{modelValue:'2026-10'}});

  await field.get('input').setValue(value);

  expect((field.get('input').element as HTMLInputElement).validationMessage).toBe(message);
  expect(field.emitted('update:modelValue')).toBeUndefined();
 });

 it('navigates years and selecting a month clears typed errors and restores focus',async()=>{
  field=mount(MonthField,{props:{modelValue:'2026-10'},attachTo:document.body});
  await field.get('input').setValue('invalid');

  await field.get('[aria-label="Choose month"]').trigger('click');
  expect(field.get('[aria-label="October 2026"]').attributes('aria-pressed')).toBe('true');
  await field.get('[aria-label="Previous year"]').trigger('click');
  expect(field.find('[aria-label="January 2025"]').exists()).toBe(true);
  await field.get('[aria-label="Next year"]').trigger('click');
  await field.get('[aria-label="Next year"]').trigger('click');
  await field.get('[aria-label="February 2027"]').trigger('click');

  expect(field.emitted('update:modelValue')?.at(-1)).toEqual(['2027-02']);
  expect((field.get('input').element as HTMLInputElement).validationMessage).toBe('');
  expect(field.find('[aria-label="Month calendar"]').exists()).toBe(false);
  expect(document.activeElement).toBe(field.get('[aria-label="Choose month"]').element);
 });

 it('supports keyboard month navigation and Escape without closing the containing modal',async()=>{
  field=mount(MonthField,{props:{modelValue:'2026-10'},attachTo:document.body});

  await field.get('[aria-label="Choose month"]').trigger('click');
  expect(document.activeElement).toBe(field.get('[aria-label="October 2026"]').element);
  await field.get('[aria-label="October 2026"]').trigger('keydown',{key:'ArrowRight'});
  expect(document.activeElement).toBe(field.get('[aria-label="November 2026"]').element);
  await field.get('[aria-label="November 2026"]').trigger('keydown',{key:'ArrowUp'});
  expect(document.activeElement).toBe(field.get('[aria-label="August 2026"]').element);
  await field.get('[aria-label="August 2026"]').trigger('keydown',{key:'PageDown'});
  expect(document.activeElement).toBe(field.get('[aria-label="August 2027"]').element);
  await field.get('[aria-label="August 2027"]').trigger('keydown',{key:'Escape'});

  expect(field.find('[aria-label="Month calendar"]').exists()).toBe(false);
  expect(field.emitted('update:modelValue')).toBeUndefined();
  expect(document.activeElement).toBe(field.get('[aria-label="Choose month"]').element);
 });

 it('synchronizes changed values and preserves required validation when cleared',async()=>{
  field=mount(MonthField,{props:{modelValue:'2026-10',required:true}});
  await field.get('input').setValue('invalid');

  await field.setProps({modelValue:'2028-02'});
  expect((field.get('input').element as HTMLInputElement).value).toBe('02/2028');
  expect((field.get('input').element as HTMLInputElement).validationMessage).toBe('');
  await field.get('input').setValue('');

  expect(field.emitted('update:modelValue')?.at(-1)).toEqual([null]);
  expect((field.get('input').element as HTMLInputElement).validity.valueMissing).toBe(true);
 });
});
