// types/purchase-order.ts

export interface PurchaseOrder {
  id: number
  uuid: string
  company_id: number
  vendor_id: number | null
  po_number: string
  issue_date: string | null
  delivery_date: string | null
  delivery_address: string | null
  payment_terms: string | null
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  status: 'draft' | 'pending' | 'rejected' | 'approved' | 'sent'
  notes: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
  approved_at: string | null
  approved_by: number | null
  created_by: number
  converted_to_bill_id: number | null
  
  // Relationships
  vendor?: {
    id: number
    name: string
    email?: string
  }
  company?: {
    id: number
    name: string
  }
  items: PurchaseOrderItem[]
  taxes: PurchaseOrderTax[]
  created_by_user?: {
    id: number
    name: string
  }
  approved_by_user?: {
    id: number
    name: string
  }
  
  // Permissions
  can_be_edited: boolean
  can_be_deleted: boolean
  can_request_approval: boolean
  can_be_approved: boolean
  can_be_sent: boolean
}

export interface PurchaseOrderItem {
  id?: number
  uuid?: string
  purchase_order_id?: number
  item_id: number
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  line_subtotal: number
  tax_amount: number
  line_total: number
  expense_account_id?: number
  notes?: string
  
  // Relationship
  item?: {
    id: number
    uuid: string
    name: string
    sku?: string
    description?: string
  }
  line_taxes: PurchaseOrderItemTax[]
}

export interface PurchaseOrderItemTax {
  id?: number
  purchase_order_item_id?: number
  tax_rate_id: number
  taxable_amount: number
  tax_rate_percent: number
  tax_amount: number
  is_compound: boolean
  compound_order: number
  
  // Relationship
  tax_rate?: {
    id: number
    tax_name: string
    tax_code: string
    rate_percent: number
  }
}

export interface PurchaseOrderTax {
  id?: number
  purchase_order_id?: number
  tax_rate_id: number
  taxable_amount: number
  tax_rate_percent: number
  tax_amount: number
  is_compound: boolean
  compound_order: number
  custom_taxable_amount?: number
  
  // Relationship
  tax_rate?: {
    id: number
    tax_name: string
    tax_code: string
    rate_percent: number
  }
}

export interface PurchaseOrderFormData {
  vendor_id: number | null
  po_number?: string
  issue_date: string
  delivery_date: string
  delivery_address?: string
  payment_terms?: string
  notes?: string
  items: PurchaseOrderItemFormData[]
  order_taxes: PurchaseOrderTaxFormData[]
}

export interface PurchaseOrderItemFormData {
  item_id: number
  quantity: number
  unit_price: number
  discount_percent?: number
  notes?: string
  taxes: PurchaseOrderItemTaxFormData[]
}

export interface PurchaseOrderItemTaxFormData {
  tax_rate_id: number
  is_compound?: boolean
  compound_order?: number
}

export interface PurchaseOrderTaxFormData {
  tax_rate_id: number
  is_compound?: boolean
  compound_order?: number
  custom_taxable_amount?: number
}

export interface PurchaseOrderStatistics {
  total_purchase_orders: number
  draft_purchase_orders: number
  pending_purchase_orders: number
  approved_purchase_orders: number
  rejected_purchase_orders: number
  sent_purchase_orders: number
  total_amount: number
  pending_amount: number
}

export interface PurchaseOrderFilters {
  search?: string
  status?: string | string[]
  vendor?: number
  date_range?: {
    start: string
    end: string
  }
  page?: number
  per_page?: number
}  