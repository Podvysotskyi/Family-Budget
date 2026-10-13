import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import HouseholdName from './HouseholdName.vue';import ProfilePreferences from './ProfilePreferences.vue';
const mocks=vi.hoisted(()=>({patch:vi.fn(),forms:[] as any[]}));
vi.mock('@inertiajs/vue3',async(importOriginal)=>{const actual:any=await importOriginal();return {...actual,useForm:(data:any)=>{const form=actual.useForm(data);form.patch=mocks.patch;mocks.forms.push(form);return form;},router:{on:()=>()=>{},visit:vi.fn()}};});
let panel:ReturnType<typeof mount>|undefined;
beforeEach(()=>{vi.clearAllMocks();mocks.forms=[];HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(()=>{panel?.unmount();panel=undefined;});
it('uses the refreshed household version for subsequent saves and preserves conflict edits',async()=>{
 panel=mount(HouseholdName,{props:{household:{name:'Home',data_version:4}}});await panel.get('#household-name').setValue('New home');await panel.get('form').trigger('submit');expect(mocks.forms[0].data()).toMatchObject({name:'New home',lock_version:4});
 await panel.setProps({household:{name:'New home',data_version:5}});mocks.patch.mock.calls[0][1].onSuccess();mocks.patch.mock.calls[0][1].onFinish();await flushPromises();
 await panel.get('#household-name').setValue('Next home');await panel.get('form').trigger('submit');expect(mocks.forms[0].lock_version).toBe(5);mocks.patch.mock.calls[1][1].onHttpException({status:409});await flushPromises();expect(panel.text()).toContain('Reload before saving');expect((panel.get('#household-name').element as HTMLInputElement).value).toBe('Next home');
});
it('saves reminder preferences inline and retains them after network failure',async()=>{
 panel=mount(ProfilePreferences,{props:{profile:{timezone:'America/Chicago',reminder_local_time:'09:00:00'}}});await panel.get('#profile-reminder-time').setValue('08:30');await panel.get('form').trigger('submit');expect(mocks.patch).toHaveBeenCalledWith('/profile',expect.any(Object));expect(mocks.forms[0].data()).toMatchObject({timezone:'America/Chicago',reminder_local_time:'08:30'});
 mocks.patch.mock.calls[0][1].onNetworkError();await flushPromises();expect(panel.text()).toContain('Your preferences are still here');expect((panel.get('#profile-reminder-time').element as HTMLInputElement).value).toBe('08:30');
});
