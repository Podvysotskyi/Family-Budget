import {expect,it,vi} from 'vitest';import {mount} from '@vue/test-utils';import LoadingState from './LoadingState.vue';
it('delays skeletons and removes them as soon as loading finishes',async()=>{
 vi.useFakeTimers();const state=mount(LoadingState,{props:{loading:true,label:'Loading account'}});
 expect(state.find('.animate-pulse').exists()).toBe(false);await vi.advanceTimersByTimeAsync(299);expect(state.find('.animate-pulse').exists()).toBe(false);await vi.advanceTimersByTimeAsync(1);expect(state.find('.animate-pulse').exists()).toBe(true);
 await state.setProps({loading:false});expect(state.find('[role="status"]').exists()).toBe(false);state.unmount();vi.useRealTimers();
});
