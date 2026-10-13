import {beforeEach,expect,it,vi} from 'vitest';import {flushPromises,mount} from '@vue/test-utils';import Index from './Index.vue';
import {router} from '@inertiajs/vue3';
import {json} from '../../lib/format';
vi.mock('../../lib/format',async(importOriginal)=>({...(await importOriginal<any>()),json:vi.fn()}));
vi.mock('@inertiajs/vue3',async(importOriginal)=>({...(await importOriginal<any>()),Head:{template:'<span/>'},Link:{template:'<a :href="$attrs.href"><slot/></a>'},usePage:()=>({url:'/home',props:{today:'2026-10-10',utcMonth:'2026-10',auth:{id:1,name:'Owner',email:'owner@example.test',timezone:'America/Chicago'},household:{id:'house',name:'Our household',owner:true,member_count:1,owner_member_id:'owner'},unread:0,flash:{}}}),router:{get:vi.fn(),post:vi.fn(),reload:vi.fn(),visit:vi.fn(),on:()=>()=>{}}}));
beforeEach(()=>{vi.clearAllMocks();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
it.each([['bills','Bills','bill','New bill','New income'],['income','Income','income','New income','New bill']])('gives %s its own navigation, list and creation form',async(section,title,kind,createLabel,otherLabel)=>{
 const view=mount(Index,{props:{section,records:{data:[],links:[],total:0,per_page:25},catalog:{accounts:[],categories:[],members:[]}}});
 expect(view.get('h1').text()).toBe(title);
 expect(view.get('nav a[href="/bills"]').text()).toBe('Bills');expect(view.get('nav a[href="/income"]').text()).toBe('Income');
 expect(view.get('nav a[aria-current="page"]').attributes('href')).toBe('/'+section);
 expect(view.find('.segmented').exists()).toBe(false);expect(view.text()).not.toContain(otherLabel);
 await view.findAll('button').find(button=>button.text()===createLabel)!.trigger('click');await flushPromises();
 expect(view.get('dialog h2').text()).toBe(kind==='income'?'Add income':'Add bill');
 expect(view.find('#edit-kind').exists()).toBe(false);
 view.unmount();
});
it.each(['home','budget','bills','income','subscriptions','accounts','loans','transactions','investments','categories','household','profile','notifications'])('renders the %s empty state and household navigation without runtime errors',(section)=>{
 const records=['loans','subscriptions','bills','income','transactions','notifications'].includes(section)?{data:[],links:[],total:0,per_page:25}:[];
 const view=mount(Index,{props:{section,records,catalog:{accounts:[],categories:[],members:[]},summary:{net_cents:'0',unknown_count:'0'},investment:{account:null}},global:{stubs:{BalanceChart:true,LoanChart:true}}});
 expect(view.find('h1').exists()).toBe(true);expect(view.get('nav[aria-label="Main navigation"]').text()).toContain('Household');expect(view.text()).not.toContain('NaN');view.unmount();
});

it.each(['home','bills','income','subscriptions','loans'])('filters %s by household or member and clears the selection',async section=>{
 const records=section==='home'?[]:{data:[],links:[],total:0,per_page:10};
 const view=mount(Index,{props:{section,records,month:'2026-09',catalog:{accounts:[],categories:[],members:[{id:'jamie',nickname:'Jamie'}]},filters:{kind:'income',search:'Salary',show_canceled:1,show_paid:1},summary:{}},global:{stubs:{BalanceChart:true,LoanChart:true}}});
 const assignment=view.get('label[for]').attributes('for');
 const trigger=view.get('#'+assignment);

 await trigger.trigger('click');
 expect(view.findAll('[role="option"]').map(option=>option.text())).toEqual(['All assignments','Household','Jamie']);
 await view.findAll('[role="option"]')[1].trigger('click');
 expect(router.get).toHaveBeenLastCalledWith('/'+section,expect.objectContaining({assignment:'household'}),expect.objectContaining({preserveState:true}));
 await trigger.trigger('click');await view.findAll('[role="option"]')[2].trigger('click');
 expect(router.get).toHaveBeenLastCalledWith('/'+section,expect.objectContaining({assignment:'jamie',...(section==='home'?{month:'2026-09'}:section==='loans'?{show_paid:1,per_page:10}:{search:'Salary',show_canceled:1,per_page:10})}),expect.anything());
 const clear=view.findAll('button').find(button=>button.text()==='Clear filters');
 await clear!.trigger('click');
 expect(router.get).toHaveBeenLastCalledWith('/'+section,expect.objectContaining({assignment:''}),expect.anything());
 view.unmount();
});

it('keeps the Home assignment when changing months or returning to Today',async()=>{
 const view=mount(Index,{props:{section:'home',records:[],month:'2026-09',filters:{assignment:'household'},summary:{}}});

 await view.get('[aria-label="Next month"]').trigger('click');
 expect(router.get).toHaveBeenLastCalledWith('/home',{month:'2026-10',assignment:'household'},expect.objectContaining({preserveState:true}));
 await view.get('[aria-label="Previous month"]').trigger('click');
 expect(router.get).toHaveBeenLastCalledWith('/home',{month:'2026-08',assignment:'household'},expect.anything());
 await view.findAll('button').find(button=>button.text()==='Today')!.trigger('click');
 expect(router.get).toHaveBeenLastCalledWith('/home',{month:'2026-10',assignment:'household'},expect.anything());
 view.unmount();
});

it('synchronizes the assignment with server filters after history or page navigation',async()=>{
 const view=mount(Index,{props:{section:'bills',records:{data:[]},filters:{assignment:'household'},catalog:{accounts:[],categories:[],members:[{id:'jamie',nickname:'Jamie'}]}}});

 await view.setProps({filters:{assignment:'jamie'}});

 expect(view.get('[role="combobox"]').text()).toContain('Jamie');
 await view.setProps({section:'home',records:[],filters:{}});
 expect(view.get('[role="combobox"]').text()).toContain('All assignments');
 view.unmount();
});

it('keeps the selected assignment when including paid-off loans',async()=>{
 const view=mount(Index,{props:{section:'loans',records:{data:[],per_page:10},filters:{assignment:'household'}}});

 await view.get('input[type="checkbox"]').setValue(true);

 expect(router.get).toHaveBeenLastCalledWith('/loans',{assignment:'household',show_paid:1,per_page:10},expect.anything());
 view.unmount();
});

it('clears subscription details and ignores pending responses when assignment filtering returns no results',async()=>{
 let resolveDetail!:(value:any)=>void;
 vi.mocked(json).mockReturnValueOnce(new Promise(resolve=>{resolveDetail=resolve;}));
 const view=mount(Index,{props:{section:'subscriptions',records:{data:[{id:'music',name:'Music',amount_cents:'1000',frequency:'monthly'}]},summary:{}}});

 await view.setProps({records:{data:[]},filters:{assignment:'household'}});
 resolveDetail({series:{name:'Music',amount_cents:'1000',frequency:'monthly'},summary:{},chart:[],payments:{data:[]}});
 await flushPromises();

 expect(view.text()).toContain('No subscriptions match this view.');
 expect(view.text()).not.toContain('Music');
 expect(view.text()).not.toContain('Loading subscription');
 view.unmount();
});
