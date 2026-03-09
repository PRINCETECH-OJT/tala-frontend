export interface Bill {
  id: number;
  contact_name: string;
  date: string;
  due_date: string;
  bill_number: string;
  reference?: string;
  total_amount: number;
  status: "Draft" | "Awaiting Payment" | "Paid" | "Overdue";
}

export interface BillForm {
  contact_id: string;
  date: string;
  due_date: string;
  bill_number: string;
  reference: string;
  items: BillItem[];
}

interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  account_code: string; // e.g., 400 - Advertising
  tax_rate: number;
}
