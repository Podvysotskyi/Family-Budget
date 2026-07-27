import { AddBudgetCategorySummaryInclusion1782682000000 } from '../../../src/modules/database/migrations/1782682000000-AddBudgetCategorySummaryInclusion'
import { AddCreditCards1782534000000 } from '../../../src/modules/database/migrations/1782534000000-AddCreditCards'
import { AddGoals1782536000000 } from '../../../src/modules/database/migrations/1782536000000-AddGoals'
import { AddSubscriptionAmountAndDateHistory1782535000000 } from '../../../src/modules/database/migrations/1782535000000-AddSubscriptionAmountAndDateHistory'
import { AddSubscriptionAutopay1782532000000 } from '../../../src/modules/database/migrations/1782532000000-AddSubscriptionAutopay'
import { AddSubscriptionTransactions1782530137343 } from '../../../src/modules/database/migrations/1782530137343-AddSubscriptionTransactions'
import { DedupeSubscriptionDueDatesByPeriod1782679800000 } from '../../../src/modules/database/migrations/1782679800000-DedupeSubscriptionDueDatesByPeriod'
import { InitialSchema1782527569927 } from '../../../src/modules/database/migrations/1782527569927-InitialSchema'
import { MakeUserNameRequired1782681000000 } from '../../../src/modules/database/migrations/1782681000000-MakeUserNameRequired'
import { RemoveSubscriptionNameUnique1782531000000 } from '../../../src/modules/database/migrations/1782531000000-RemoveSubscriptionNameUnique'
import { RenameSubscriptionDatesToSubscriptionDueDates1782678143000 } from '../../../src/modules/database/migrations/1782678143000-RenameSubscriptionDatesToSubscriptionDueDates'
import { StoreSubscriptionTransactionDates1782533000000 } from '../../../src/modules/database/migrations/1782533000000-StoreSubscriptionTransactionDates'
import { UseGoalTargetDateUnique1782537000000 } from '../../../src/modules/database/migrations/1782537000000-UseGoalTargetDateUnique'

export const productionMigrations = [
  InitialSchema1782527569927,
  AddSubscriptionTransactions1782530137343,
  RemoveSubscriptionNameUnique1782531000000,
  AddSubscriptionAutopay1782532000000,
  StoreSubscriptionTransactionDates1782533000000,
  AddCreditCards1782534000000,
  AddSubscriptionAmountAndDateHistory1782535000000,
  AddGoals1782536000000,
  UseGoalTargetDateUnique1782537000000,
  RenameSubscriptionDatesToSubscriptionDueDates1782678143000,
  DedupeSubscriptionDueDatesByPeriod1782679800000,
  MakeUserNameRequired1782681000000,
  AddBudgetCategorySummaryInclusion1782682000000
]
