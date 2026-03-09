export interface QuoteCustomer {
  id: number;
  name: string;
  email: string;
}

export interface QuoteItem {
  id: number;
  uuid: string;
  item_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  revenue_account_id: number | null;
  notes: string | null;
  item?: {
    uuid: string;
    id: number;
    sku: string;
    name: string;
    description: string | null;
    sales_price: number;
  };
}

export interface Quote {
  id: number;
  uuid: string;
  company_id: number;
  customer_id: number;
  quote_number: string;
  issue_date: string;
  expiry_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired"; // Using strict literal types here!
  converted_to_invoice_id: number | null;
  converted_date: string | null;
  payment_terms: string | null;
  delivery_date: string | null;
  notes: string | null;
  terms: string | null;
  customer?: QuoteCustomer;
  items?: QuoteItem[];
}
