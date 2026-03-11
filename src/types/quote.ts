export interface Quote {
  id: number
  uuid: string
  quote_number: string
  
  issue_date: string
  expiry_date: string
  delivery_date: string
  payment_terms: string | null
  
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
  notes: string | null
  terms: string | null
  
  created_at: string
  updated_at: string
  sent_at: string | null
  accepted_at: string | null
  
  company: {
    id: number
    name: string
  }
  
  customer: {
    id: number
    name: string
    email: string
  } | null
  
  created_by: {
    id: number
    name: string
  }
  
  items: QuoteItem[]
  taxes: QuoteTax[]
  
  converted_to_invoice_id: number | null
  
  // Permissions from backend
  can_be_edited: boolean
  can_be_deleted: boolean
  can_be_accepted: boolean
  can_be_sent: boolean
  can_be_converted_to_invoice: boolean
}

export interface QuoteItem {
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
  
  revenue_account_id: number
  notes: string | null
  
  item: {
    id: number
    uuid: string
    name: string
    sku: string
    description: string | null
  }
  
  line_taxes: QuoteItemTax[]
}

export interface QuoteItemTax {
  id: number
  quote_item_id: number
  tax_rate_id: number
  taxable_amount: number
  tax_rate_percent: number
  tax_amount: number
  is_compound: boolean
  compound_order: number
  
  tax_rate: {
    id: number
    tax_name: string
    tax_code: string
    rate_percent: number
  }
}

export interface QuoteTax {
  id: number
  tax_rate_id: number
  taxable_amount: number
  tax_rate_percent: number
  tax_amount: number
  is_compound: boolean
  compound_order: number
  
  tax_rate: {
    id: number
    tax_name: string
    tax_code: string
    rate_percent: number
  }
}
 
export interface QuoteFormData {
  customer_id: number | null 
  quote_number?: string
  issue_date: string
  delivery_date: string
  expiry_date: string
  payment_terms: string
  notes: string
  terms: string
  items: QuoteFormItemData[]
  order_taxes: QuoteFormTaxData[]
}

export interface QuoteFormItemData {
  item_id: number
  quantity: number
  unit_price: number
  discount_percent: number
  notes: string
  taxes: QuoteFormItemTaxData[]
}

export interface QuoteFormItemTaxData {
  tax_rate_id: number
  is_compound: boolean
  compound_order: number
}

export interface QuoteFormTaxData {
  tax_rate_id: number
  is_compound: boolean
  compound_order: number
  custom_taxable_amount?: number
}