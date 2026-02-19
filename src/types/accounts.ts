export interface AccountType {
  id: number
  uuid: string
  type_name: string
  category: string
  normal_balance: string
  statement_type: string
}

export interface Account {
  id: string
  uuid: string
  number: string
  name: string
  full_number: string
  full_name: string
  description: string
  is_active: boolean
  is_system_account: boolean
  can_be_deleted: boolean
  account_type: {
    id: number
    type_name: string
    category: string
    normal_balance: string
  }
  parent_account: Account | null
  parent_account_id: number | null
  sub_accounts: Account[]
  has_sub_accounts: boolean 
}

export interface AccountFormData {
  number: string
  name: string
  account_type_id: string | number
  parent_account_id: string | number | null
  description: string
  is_active: boolean
}