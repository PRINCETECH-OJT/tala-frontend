export interface InvoiceCustomer {
  id: number
  name: string
  email: string
}

export interface InvoiceItem {
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
  revenue_account_id: number | null
  item?: {
    uuid: string 
    id: number 
    sku: string
    name: string
    description: string | null
    sales_price: number
  }
  line_taxes?: InvoiceLineTax[]
}

export interface InvoiceLineTax {
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

export interface InvoiceTax {
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

export interface InvoiceJournalEntry {
  id: number
  uuid: string
  entry_number: string
  description: string
  entry_date: string
  posted: boolean
  total_debits: number
  total_credits: number
}

export interface InvoiceTaxBreakdown {
  tax_name: string
  tax_code: string
  rate_percent: number
  taxable_amount: number
  tax_amount: number
  source: 'line_level' | 'invoice_level' | 'combined'
}

export interface InvoiceSummary {
  subtotal: number
  discount: number
  taxable_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  tax_breakdown: InvoiceTaxBreakdown[]
}

export interface Invoice {
  id: number
  uuid: string
  invoice_number: string
  issue_date: string | null
  due_date: string | null
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  notes: string | null
  created_at: string
  updated_at: string
  company: {
    id: number
    name: string
  }
  customer: InvoiceCustomer
  // customer_id: number
  items: InvoiceItem[]
  taxes: InvoiceTax[]
  journal_entry?: InvoiceJournalEntry
  summary?: InvoiceSummary
  amount_paid: number
  amount_due: number
  is_draft: boolean
  is_sent: boolean
  is_paid: boolean
  is_overdue: boolean
  can_be_edited: boolean
  can_be_deleted: boolean
}

export interface InvoiceFormItem {
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

export interface InvoiceFormData {
  customer_id: number | null
  invoice_number?: string
  issue_date: string
  due_date: string
  discount_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  notes: string
  items: InvoiceFormItem[]
  invoice_taxes: {
    tax_rate_id: number
    is_compound: boolean
    compound_order: number
    custom_taxable_amount?: number
  }[]
}

export interface InvoiceStatistics {
  total_invoices: number
  draft_invoices: number
  sent_invoices: number
  paid_invoices: number
  overdue_invoices: number
  unpaid_invoices: number 
  total_revenue: number
  outstanding_amount: number  
}
