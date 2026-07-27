import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AddIncomeModal from '../../app/components/budget/AddIncomeModal.vue'

mockComponent('UModal', async () => {
  const { defineComponent, h } = await import('vue')
  return defineComponent({
    name: 'UModal',
    setup(_, { slots }) {
      return () => h('div', [slots.default?.(), slots.body?.(), slots.footer?.()])
    }
  })
})

describe('AddIncomeModal', () => {
  it('validates and submits income through the modal interaction', async () => {
    const wrapper = await mountSuspended(AddIncomeModal, {
      props: {
        existingIncomes: [],
        incomeTotal: 0,
        incomeTypes: [{ id: 'salary', text: 'Salary' }],
        periodLabel: 'July',
        open: true
      }
    })

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await wrapper.get('#income-amount').setValue('1250')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([{
      amount: 1250,
      incomeTypeId: 'salary',
      newIncomeTypeText: undefined
    }])

    await wrapper.get('#income-amount').setValue('0')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Income amount must be greater than zero.')
  })
})
