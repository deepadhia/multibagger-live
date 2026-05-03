/**
 * Central dictionary for XBRL tag aliases.
 * Maps canonical metric keys to arrays of possible XBRL tags.
 */
export const ALIAS_MAP = {
  revenue: [
    'RevenueFromOperations',
    'IncomeFromOperations',
    'Revenue',
    'NetSales'
  ],
  pbt: [
    'ProfitBeforeTax',
    'ProfitLossBeforeTax',
    'ProfitBeforeTaxAndExceptionalItems'
  ],
  pat: [
    'ProfitAfterTax',
    'ProfitLossForPeriod',
    'NetProfitLossForPeriod',
    'ProfitLossForPeriodFromContinuingOperations'
  ],
  finance_cost: [
    'FinanceCosts',
    'InterestExpense',
    'FinanceCost'
  ],
  depreciation: [
    'DepreciationAndAmortisationExpense',
    'DepreciationExpense',
    'AmortisationExpense'
  ],
  tax: [
    'TaxExpense',
    'CurrentTax',
    'CurrentTaxExpense'
  ],
  receivables: [
    'TradeReceivables',
    'TradeAndOtherReceivablesCurrent',
    'CurrentTradeReceivables',
    'TradeReceivablesCurrent'
  ],
  inventory: [
    'Inventories',
    'Inventory',
    'CurrentInventories'
  ],
  borrowings: [
    'Borrowings',
    'LongTermBorrowings',
    'ShortTermBorrowings',
    'BorrowingsCurrent',
    'BorrowingsNonCurrent'
  ],
  cash_and_bank: [
    'CashAndCashEquivalents',
    'BalancesWithBanks',
    'CashAndBankBalances'
  ],
  equity: [
    'EquityShareCapital',
    'ShareCapital',
    'IssuedCapital'
  ],
  cfo: [
    'NetCashFlowsFromUsedInOperatingActivities',
    'CashFlowFromOperatingActivities',
    'CashFlowsFromUsedInOperatingActivities'
  ],
  capex: [
    'PaymentsToAcquirePropertyPlantAndEquipment',
    'PurchaseOfPropertyPlantAndEquipment',
    'AdditionsToPropertyPlantAndEquipment',
    'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'
  ]
};

export function getTagsForMetric(metric) {
  return ALIAS_MAP[metric] || [];
}
