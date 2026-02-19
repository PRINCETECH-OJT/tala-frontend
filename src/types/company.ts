export interface Company {
  id: number;
  company_name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  email: string;
  fiscal_year_start: string;
  base_currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyForm {
  company_name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  email: string;
  fiscal_year_start: string;
  base_currency: string;
}
