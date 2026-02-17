export interface Permission {
  id: number;
  name: string;
  guard_name: string;
}

export interface GroupedPermissions {
  [key: string]: Permission[];
}

export interface SystemRole {
  id: number;
  name: string;
  users_count?: number;
  permissions: string[];
  is_system_role?: boolean;
  created_at: string;
}

export interface RoleFormState {
  name: string;
  permissions: string[];
}
