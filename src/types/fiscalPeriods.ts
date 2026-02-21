
export interface FiscalPeriod {
  id: number
  uuid: string
  period_name: string
  display_name: string
  start_date: string
  end_date: string
  duration_days: number
  duration_months: number
  progress_percentage: number
  is_closed: boolean
  closed_at: string | null
  closed_by: {
    id: string
    name: string
  } | null
  is_current: boolean
  is_past: boolean
  is_future: boolean
  is_monthly: boolean
  is_quarterly: boolean
  is_yearly: boolean
  posted_entries_count: number
  unposted_entries_count: number
  total_debits: number
  total_credits: number
  can_be_closed: boolean
  can_be_reopened: boolean
  can_be_deleted: boolean
  company_id: number
}

export interface FiscalPeriodForm {
  period_name: string
  start_date: string
  end_date: string
}