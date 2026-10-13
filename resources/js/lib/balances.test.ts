import {describe,it,expect} from 'vitest';
import {balanceHistory} from './balances';
describe('balance history calculations',()=>{
 const accounts=[{id:'cash',type:'checking'},{id:'card',type:'credit_card'},{id:'loan',type:'loan'}];
 const history=[{account_id:'cash',effective_date:'2026-09-01',created_at:'2026-09-01',balance_cents:'100000'},{account_id:'card',effective_date:'2026-10-01',created_at:'2026-10-01',balance_cents:'25000'},{account_id:'loan',effective_date:'2026-10-02',created_at:'2026-10-02',balance_cents:'50000'}];
 it('subtracts debt and labels partial history without inventing zero balances',()=>{const rows=balanceHistory(accounts,history,[],'net');expect(rows).toMatchObject([{total:100000,complete:false},{total:75000,complete:false},{total:25000,complete:true}]);});
 it('shows positive debt when the card view is selected',()=>{expect(balanceHistory(accounts,history,[],'credit_card').at(-1)?.total).toBe(25000);});
 it('uses the credit limit in effect on the observation date and marks changes',()=>{const limits=[{account_id:'card',effective_date:'2026-10-01',limit_cents:'100000'},{account_id:'card',effective_date:'2026-10-03',limit_cents:'200000'}];expect(balanceHistory(accounts,history,limits,'credit_card',true)).toMatchObject([{total:25,limitChange:true,complete:true},{total:12.5,limitChange:true,complete:true}]);});
 it('returns unavailable usage when any selected card lacks a positive limit',()=>{expect(balanceHistory(accounts,history,[],'credit_card',true)[0]).toMatchObject({total:null,complete:false});});
 it('does not use a future limit to fill an earlier usage observation',()=>{const rows=balanceHistory(accounts,history,[{account_id:'card',effective_date:'2026-10-03',limit_cents:'100000'}],'credit_card',true);expect(rows[0].total).toBeNull();expect(rows[1].total).toBe(25);});
});
