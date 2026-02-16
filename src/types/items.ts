export interface ItemAccount {
  id: number | null
  name: string | null
  number: string | null
}

export interface Item { 
  id: number
  uuid: string
  sku: string
  name: string
  type: 'service' | 'product'
  description: string | null 
  sales_price: number
  cost_price: number
  formatted_sales_price: string
  formatted_cost_price: string 
  margin_percent: number
  markup_percent: number 
  taxable: boolean
  is_inventory: boolean
  quantity: number
  total_value: number 
  is_in_stock: boolean
  is_low_stock: boolean
  is_out_of_stock: boolean 
  is_active: boolean
  is_service: boolean
  is_product: boolean  
  income_account: ItemAccount
  expense_account: ItemAccount
  inventory_account?: ItemAccount | null  
  can_be_deleted: boolean
}

export interface ItemFormData {
  sku: string
  name: string
  type: string
  description: string | null
  sales_price: number
  cost_price: number
  taxable: boolean
  is_inventory: boolean 
  quantity: number
  income_account_id: string | number
  expense_account_id: string | number
  inventory_account_id?: string | number | null
  is_active: boolean
}