export interface BillVendor {
  id: number 
  name: string
  email: string
}

export interface BillItem {
  id: number
  uuid: string
  item_id: number
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  line_subtotal: number
  tax_amount: number
  line_total: number
  expense_account_id: number | null
  item?: {
    uuid: string 
    id: number 
    sku: string
    name: string
    description: string | null
    sales_price: number
  }
  line_taxes?: BillLineTax[]
}

export interface BillLineTax {
  id: number
  tax_rate_id: number
  taxable_amount: number
  tax_rate_percent: number
  tax_amount: number
  is_compound: boolean
  compound_order: number
  tax_rate?: {
    id: number
    tax_code: string
    tax_name: string
    rate_percent: number
  }
}

export interface BillTax {
  id: number
  tax_rate_id: number
  taxable_amount: number
  tax_rate_percent: number
  tax_amount: number
  is_compound: boolean
  compound_order: number
  tax_rate?: {
    id: number
    tax_code: string
    tax_name: string
    rate_percent: number
  }
}

export interface BillJournalEntry {
  id: number
  uuid: string
  entry_number: string
  reference_number: string
  description: string
  entry_date: string
  posted: boolean
  total_debits: number
  total_credits: number
}

export interface BillTaxBreakdown {
  tax_name: string
  tax_code: string
  rate_percent: number
  taxable_amount: number
  tax_amount: number
  source: 'line_level' | 'bill_level' | 'combined'
}

export interface BillSummary {
  subtotal: number
  discount: number
  taxable_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  tax_breakdown: BillTaxBreakdown[]
}

export interface Bill {
  id: number
  uuid: string
  bill_number: string
  issue_date: string | null
  due_date: string | null
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  status: 'draft' | 'pending' | 'paid' | 'overdue'
  notes: string | null
  created_at: string
  updated_at: string
  company: {
    id: number
    name: string
  }
  vendor: BillVendor
  // vendor_id: number  
  items: BillItem[]
  taxes: BillTax[]
  journal_entry?: BillJournalEntry
  summary?: BillSummary
  amount_paid: number
  amount_due: number
  is_draft: boolean
  is_pending: boolean
  is_paid: boolean
  is_overdue: boolean
  can_be_edited: boolean
  can_be_deleted: boolean
}

export interface BillFormItem {
  item_id: number | null
  item?: {
    id: number
    uuid: string
    sku: string
    name: string
    description: string | null
    sales_price: number
  }
  quantity: number
  unit_price: number
  discount_percent: number
  taxes: {
    tax_rate_id: number
    is_compound: boolean
    compound_order: number
  }[]
}

export interface BillFormData {
  vendor_id: number | null
  bill_number?: string
  issue_date: string | null
  due_date: string | null 
  notes: string
  items: BillFormItem[]
  bill_taxes: {
    tax_rate_id: number
    is_compound: boolean
    compound_order: number
    custom_taxable_amount?: number
  }[]
}

export interface BillStatistics {
  total_bills: number
  draft_bills: number
  pending_bills: number
  paid_bills: number
  overdue_bills: number
  unpaid_bills: number 
  total_expense: number
  outstanding_amount: number   
}
