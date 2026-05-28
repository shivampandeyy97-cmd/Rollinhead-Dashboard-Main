// ============================================================================
// Rollinhead Dashboard — Shared Types
// ============================================================================

// --- Enums ---

export enum UserRole {
  PUBLISHER = 'PUBLISHER',
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum PaymentCycle {
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_45 = 'NET_45',
  NET_60 = 'NET_60',
}

export enum PublisherStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  PENDING = 'PENDING',
}

export enum WebsiteCategory {
  TECHNOLOGY = 'TECHNOLOGY',
  SPORTS = 'SPORTS',
  ENTERTAINMENT = 'ENTERTAINMENT',
  LIFESTYLE = 'LIFESTYLE',
  NEWS = 'NEWS',
  GAMING = 'GAMING',
}

export enum TagType {
  DISPLAY = 'DISPLAY',
  VIDEO = 'VIDEO',
}

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
}

export enum UploadStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum NotificationType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  ALERT = 'ALERT',
  INFO = 'INFO',
}

export enum NotificationDelivery {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

// --- Report Dimensions ---

export type ReportDimension = 'date' | 'month' | 'country' | 'device' | 'website';

// --- API Response Shape ---

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Auth ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

// --- Publisher ---

export interface PublisherSummary {
  id: string;
  companyName: string;
  contactEmail: string;
  status: PublisherStatus;
  paymentCycle: PaymentCycle;
  activeRevShare: number;
  websiteCount: number;
}

// --- Reports ---

export interface ReportFilters {
  startDate: string;
  endDate: string;
  websiteIds?: string[];
  devices?: DeviceType[];
  countries?: string[];
  dimension?: ReportDimension;
}

export interface ReportRow {
  dimensionValue: string;
  impressions: number;
  pageviews: number;
  clicks: number;
  revenue: number;  // Net for publishers, gross for internal
  cpm: number;
}

// --- Metrics ---

export interface OverviewMetrics {
  totalRevenue: number;
  totalImpressions: number;
  totalPageviews: number;
  avgCpm: number;
  revenueChange: number;
  impressionsChange: number;
}
