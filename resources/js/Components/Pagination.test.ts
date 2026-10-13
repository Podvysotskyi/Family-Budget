import {it,expect,vi} from 'vitest';
import {mount} from '@vue/test-utils';
import Pagination from './Pagination.vue';
const navigate=vi.hoisted(()=>vi.fn());
vi.mock('@inertiajs/vue3',()=>({router:{get:navigate},Link:{template:'<a><slot/></a>'}}));

it('changes asynchronous page size while keeping filters and clearing page cursors',async()=>{
 const pagination=mount(Pagination,{props:{asynchronous:true,records:{links:[],per_page:25,total:30,first_page_url:'http://localhost/transactions?account=checking&page=2&history_page=3'}}});

 await pagination.get('[role="combobox"]').trigger('click');await pagination.findAll('[role="option"]')[0].trigger('click');

 expect(pagination.emitted('load')).toEqual([['/transactions?account=checking&per_page=10']]);pagination.unmount();
});
it('navigates to the selected page size for ordinary lists',async()=>{
 const pagination=mount(Pagination,{props:{records:{links:[],per_page:25,total:30}}});

 await pagination.get('[role="combobox"]').trigger('click');await pagination.findAll('[role="option"]')[2].trigger('click');

 expect(navigate).toHaveBeenCalledWith('/?per_page=50');pagination.unmount();
});
