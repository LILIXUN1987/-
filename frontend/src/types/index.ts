// ════════════════════════════════════════════
// 角色类型体系
// ════════════════════════════════════════════
export const USER_ROLES = ['admin', 'forwarder', 'trader', 'lawyer', 'inspector', 'insurer', 'overseas_agent', 'broker'] as const;
export type UserRole = typeof USER_ROLES[number];

export const RoleGroup = {
  BUSINESS: ['forwarder', 'inspector', 'insurer'] as const satisfies readonly string[],
  RESTRICTED: ['inspector', 'insurer'] as const satisfies readonly string[],
  REQUIRES_CARD: ['forwarder', 'lawyer', 'inspector', 'insurer', 'overseas_agent', 'broker'] as const satisfies readonly string[],
} as const;

export function isBusinessRole(role: string | undefined): boolean {
  return role ? (RoleGroup.BUSINESS as readonly string[]).includes(role) : false;
}
export function isRestrictedRole(role: string | undefined): boolean {
  return role ? (RoleGroup.RESTRICTED as readonly string[]).includes(role) : false;
}

export interface RoleChecks {
  isAdmin: boolean;
  isForwarder: boolean;
  isTrader: boolean;
  isLawyer: boolean;
  isInspector: boolean;
  isInsurer: boolean;
  isOverseasAgent: boolean;
  isBroker: boolean;
  isBusiness: boolean;
  isRestricted: boolean;
}

export function getRoleChecks(role: string | undefined): RoleChecks {
  return {
    isAdmin: role === 'admin',
    isForwarder: role === 'forwarder',
    isTrader: role === 'trader',
    isLawyer: role === 'lawyer',
    isInspector: role === 'inspector',
    isInsurer: role === 'insurer',
    isOverseasAgent: role === 'overseas_agent',
    isBroker: role === 'broker',
    isBusiness: isBusinessRole(role),
    isRestricted: isRestrictedRole(role),
  };
}

// ── User ──
export interface UserPublic {
  id: string;
  username: string;
  display_name: string;
  company_name?: string;
  phone?: string;
  gender?: string;
  card_image?: string;
  email?: string;
  email_verified?: number;
  jc_trans_id?: string;
  wca_id?: string;
  alliance_name?: string;
  alliance_id?: string;
  subscribed_ports?: string;
  signature?: string;
  trial_end?: string;
  referral_code?: string;
  role?: UserRole;
  status?: string;
  is_verified_company?: boolean;
  company_license?: string;
  notify_all_messages_email?: boolean;
  bio?: string;
  avatar?: string;
  is_newbie?: boolean;
  created_at: string;
}

// ── Auth ──
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserPublic;
  company_mates_count?: number;
  company_mates?: { display_name: string; role: string }[];
}

// ── Uploaded File ──
export type FileStatus = 'uploaded' | 'processing' | 'processed' | 'error' | 'pending_mapping';
export type FileType = 'excel' | 'csv' | 'pdf';

export interface UploadedFile {
  id: string;
  original_filename: string;
  file_type: FileType;
  file_size_bytes: number;
  status: FileStatus;
  error_message: string | null;
  row_count: number | null;
  uploaded_by: string;
  created_at: string;
  download_count?: number;
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
  created_at: string;
}

// ── Chat ──
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatHistoryItem {
  id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  context_used: string[] | null;
  created_at: string;
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Dashboard Stats ──
export interface DashboardStats {
  total: number;
  available: number;
  regions: number;
  expired: number;
  users: number;
  categories: Record<string, number>;
}

// ── Admin Stats ──
export interface AdminTodayStats {
  newUsers: number;
  newPush: number;
  searches: number;
  matches: number;
  activeUsers: number;
  dau: number;
  activeForwarders: number;
}

export interface AdminTotalStats {
  users: number;
  cargos: number;
  roleBreakdown: Record<string, number>;
  expiringSoon: number;
}

export interface DailyTrend {
  date: string;
  searches?: number;
  newUsers?: number;
  dau?: number;
}

export interface ActiveUserDetail {
  id: string;
  display_name: string;
  company_name: string;
  role: string;
  search_count: number;
  push_count: number;
}

export interface AdminStatsResponse {
  today: AdminTodayStats;
  total: AdminTotalStats;
  dailySearches: DailyTrend[];
  dailyNewUsers: DailyTrend[];
  dailyActive: DailyTrend[];
  activeUserDetails: ActiveUserDetail[];
  funnel?: { searches: number; matches: number; inquiries: number; messages: number };
}

export interface UserAnalyticsRow {
  id: string;
  username: string;
  display_name: string;
  company_name: string;
  role: string;
  email: string;
  status: string;
  trial_end: string;
  created_at: string;
  search_count: number;
  push_count: number;
  cargo_count: number;
  msg_sent: number;
  msg_received: number;
  total_msgs: number;
}

export interface UserAnalyticsResponse {
  data: UserAnalyticsRow[];
}
