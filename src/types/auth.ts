export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}

export interface LoginForm {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  requires_onboarding?: boolean;
}
