export interface ContactAddress {
  id?: number;
  type: "billing" | "shipping" | "other";
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_primary: boolean;
}

export interface Contact {
  id: number;
  uuid: string;
  company_id: number;
  type: "customer" | "vendor";
  contact_name: string;
  person_name?: string;
  email?: string;
  phone?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at: string;
  addresses?: ContactAddress[];
  primary_address?: ContactAddress;
  outstanding_balance?: number;
}

export interface ContactFormState {
  type: "customer" | "vendor";
  contact_name: string;
  person_name: string;
  email: string;
  phone: string;
  payment_terms: string;
  addresses: ContactAddress[];
}
