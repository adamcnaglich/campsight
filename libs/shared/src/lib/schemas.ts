import { z } from 'zod';

// ─── User ──────────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  id: z.string(), // Firebase UID
  email: z.string().email(),
  displayName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

// ─── Watch ─────────────────────────────────────────────────────────────────────

export const watchSiteSchema = z.object({
  campsiteId: z.string().min(1),
  campsiteName: z.string().min(1),
  loop: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export const createWatchSchema = z.object({
  campgroundName: z.string().min(1),
  recAreaName: z.string().optional(),
  imageUrl: z.string().optional(),
  sites: z.array(watchSiteSchema).min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

export type CreateWatchDTO = z.infer<typeof createWatchSchema>;

export const updateWatchSchema = z.object({
  isActive: z.boolean().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
});

export type UpdateWatchDTO = z.infer<typeof updateWatchSchema>;

export const watchSiteResponseSchema = z.object({
  id: z.number(),
  campsiteId: z.string(),
  campsiteName: z.string(),
  loop: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
});

export type WatchSite = z.infer<typeof watchSiteResponseSchema>;

export const watchSchema = z.object({
  id: z.number(),
  userId: z.string(),
  campgroundName: z.string(),
  recAreaName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sites: z.array(watchSiteResponseSchema),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type Watch = z.infer<typeof watchSchema>;

// ─── Availability ──────────────────────────────────────────────────────────────

export const availabilityStatusEnum = z.enum([
  'Available',
  'Reserved',
  'Not Available',
  'Not Reservable',
  'Not Reservable Management',
  'Lottery',
  'Open',
]);

export type AvailabilityStatus = z.infer<typeof availabilityStatusEnum>;

export const availabilitySnapshotSchema = z.object({
  id: z.number(),
  watchSiteId: z.number(),
  date: z.string(), // ISO date YYYY-MM-DD
  status: z.string(),
  capturedAt: z.string(),
});

export type AvailabilitySnapshot = z.infer<typeof availabilitySnapshotSchema>;

// Map of ISO date string -> status from recreation.gov API
export type AvailabilityMap = Record<string, string>;

// ─── Notification Log ──────────────────────────────────────────────────────────

export const notificationLogSchema = z.object({
  id: z.number(),
  userId: z.string(),
  watchId: z.number(),
  sentAt: z.string(),
  channel: z.enum(['email', 'push']),
  payload: z.string(), // JSON string
});

export type NotificationLog = z.infer<typeof notificationLogSchema>;

// ─── API Response Wrappers ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Search Types (recreation.gov public API) ──────────────────────────────────

export interface SuggestionResult {
  entityType: 'recarea' | 'campground';
  entityId: string;
  name: string;
  stateCode: string;
  city?: string;
}

export interface CampgroundSearchResult {
  entityId: string;
  name: string;
  city: string;
  stateCode: string;
  previewImageUrl: string;
  latitude: string;
  longitude: string;
  averageRating: number | null;
  numberOfRatings: number;
}

export interface FacilityDetail {
  facilityId: string;
  facilityName: string;
  parentRecAreaId: string;
  parentRecAreaName: string;
}

export interface CampsiteSearchResult {
  campsiteId: string;
  name: string;
  loop: string;
  type: string;
  typeOfUse: string;
  previewImageUrl: string;
  latitude: string;
  longitude: string;
  maxOccupants: number | null;
  maxVehicles: number | null;
  facilityId: string;
  campgroundName: string;
}
