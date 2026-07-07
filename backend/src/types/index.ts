// ════════════════════════════════════════════
// 角色类型体系
// ════════════════════════════════════════════
export const USER_ROLES = ['admin', 'forwarder', 'trader', 'lawyer', 'inspector', 'insurer', 'overseas_agent'] as const;
export type UserRole = typeof USER_ROLES[number];

export const RoleGroup = {
  /** 货代/检测认证/运输保险 — 受试用期限制 */
  BUSINESS: ['forwarder', 'inspector', 'insurer'] as const satisfies readonly string[],
  /** 检测认证/运输保险 — 侧边栏受限（仅收件箱+个人信息） */
  RESTRICTED: ['inspector', 'insurer'] as const satisfies readonly string[],
  /** 注册时需要上传名片的角色 */
  REQUIRES_CARD: ['forwarder', 'lawyer', 'inspector', 'insurer', 'overseas_agent'] as const satisfies readonly string[],
} as const;

export function isBusinessRole(role: string): boolean {
  return (RoleGroup.BUSINESS as readonly string[]).includes(role);
}
export function isRestrictedRole(role: string): boolean {
  return (RoleGroup.RESTRICTED as readonly string[]).includes(role);
}

// ── User ──
export interface User {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  company_name: string;
  phone: string;
  email: string | null;
  email_verified: number;
  gender: string;
  card_image: string;
  jc_trans_id: string;
  wca_id: string;
  trial_end: string;
  referral_code: string;
  role: UserRole;
  status: string;
  notify_inquiry_email: number;
  notify_inquiry_site: number;
  notify_all_messages_email: number;
  is_verified_company: number | boolean;
  company_license: string | null;
  avatar: string | null;
  bio: string | null;
  is_newbie: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export type UserPublic = Pick<User, 'id' | 'username' | 'display_name' | 'company_name' | 'phone' | 'email' | 'email_verified' | 'gender' | 'card_image' | 'avatar' | 'role' | 'status' | 'jc_trans_id' | 'wca_id' | 'trial_end' | 'referral_code' | 'notify_inquiry_email' | 'notify_inquiry_site' | 'notify_all_messages_email' | 'is_verified_company' | 'company_license' | 'bio' | 'is_newbie' | 'created_at'>;

// ── Uploaded File ──
export type FileStatus = 'uploaded' | 'processing' | 'processed' | 'error' | 'pending_mapping';
export type FileType = 'excel' | 'csv' | 'pdf';

export interface UploadedFile {
  id: string;
  original_filename: string;
  file_path: string;
  file_type: FileType;
  file_size_bytes: number;
  status: FileStatus;
  error_message: string | null;
  uploaded_by: string;
  row_count: number | null;
  created_at: string;
  updated_at: string;
}

// ── Cargo Space ──
export type CargoStatus = 'available' | 'reserved' | 'expired';

export interface CargoSpace {
  id: string;
  uploaded_file_id: string | null;
  region: string;
  warehouse_name: string;
  airline_code: string | null;
  origin_port: string | null;
  dest_port: string | null;
  available_cbm: number;
  available_kg: number;
  price_per_cbm: number | null;
  price_per_kg: number | null;
  currency: string;
  valid_from: string;
  valid_to: string;
  cargo_type: string | null;
  cargo_restrictions: string | null;
  contact_info: string | null;
  notes: string | null;
  status: CargoStatus;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ── Chat History ──
export interface ChatHistory {
  id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  context_used: string[] | null;
  created_at: string;
}

// ── Query / Request types ──
export interface CargoQueryFilters {
  region?: string;
  warehouse_name?: string;
  cargo_type?: string;
  status?: CargoStatus;
  valid_from?: string;
  valid_to?: string;
  min_cbm?: number;
  max_cbm?: number;
  min_kg?: number;
  max_kg?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ChatQueryRequest {
  message: string;
  sessionId?: string;
}

export interface ColumnMapping {
  [fieldName: string]: string; // fieldName -> column name in file
}

// ── Auth ──
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserPublic;
}

// ── Express extension ──
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        display_name: string;
        role?: UserRole;
      };
    }
  }
}
