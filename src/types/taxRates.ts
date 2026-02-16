export interface TaxRateAccount {
  id: number | null
  name: string | null
  number: string | null
}

export interface TaxRate {
  id: number
  uuid: string
  tax_code: string
  tax_name: string
  tax_type: string
  rate_percent: number
  formatted_rate: string
  display_name: string
  effective_from: string
  effective_to: string | null
  is_compound: boolean
  compound_order: number
  applies_to: string | null
  applies_to_sales: boolean
  applies_to_purchases: boolean
  is_active: boolean
  sales_tax_payable_account: TaxRateAccount
  purchase_tax_receivable_account: TaxRateAccount
  tax_expense_account: TaxRateAccount | null
}

export interface TaxRateFormData {
  tax_code: string
  tax_name: string
  tax_type: string
  rate_percent: number
  effective_from: string
  effective_to: string | null
  is_compound: boolean
  compound_order: number
  applies_to: "SALES" | "PURCHASES" | "BOTH"
  sales_tax_payable_account_id: string | number
  purchase_tax_receivable_account_id: string | number
  tax_expense_account_id: string | number | null
  is_active: boolean
}