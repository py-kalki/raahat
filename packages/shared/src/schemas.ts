import { z } from 'zod';

export const UserRoleSchema = z.enum(['DRIVER', 'OFFICER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const VerificationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const TripStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']);
export type TripStatus = z.infer<typeof TripStatusSchema>;

export const AlertStatusSchema = z.enum(['PENDING', 'ACKNOWLEDGED', 'DISMISSED']);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

// Auth schemas
export const RegisterInputSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
  name: z.string().min(2),
  role: UserRoleSchema,
  badgeNumber: z.string().optional(),
  vehicleNumber: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string(),
  role: UserRoleSchema,
  verified: z.boolean(),
  verificationStatus: VerificationStatusSchema,
  badgeNumber: z.string().nullable().optional(),
  vehicleNumber: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// Coordinates & Geo
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

// Officer Duty & Location
export const OfficerDutyUpdateSchema = z.object({
  onDuty: z.boolean(),
});
export type OfficerDutyUpdate = z.infer<typeof OfficerDutyUpdateSchema>;

export const OfficerLocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.number().optional(),
});
export type OfficerLocationUpdate = z.infer<typeof OfficerLocationUpdateSchema>;

// Trip schemas
export const CreateTripInputSchema = z.object({
  pickup: CoordinatesSchema.extend({ address: z.string().optional() }),
  drop: CoordinatesSchema.extend({ address: z.string().optional() }),
  vehicleNumber: z.string().optional(),
  emergencyNotes: z.string().optional(),
});
export type CreateTripInput = z.infer<typeof CreateTripInputSchema>;

export const DriverLocationUpdateSchema = z.object({
  tripId: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().optional(), // in m/s
  heading: z.number().optional(), // in degrees
  timestamp: z.number().optional(),
});
export type DriverLocationUpdate = z.infer<typeof DriverLocationUpdateSchema>;

// Alerts
export const EmergencyAlertPayloadSchema = z.object({
  alertId: z.string(),
  tripId: z.string(),
  officerId: z.string(),
  etaSec: z.number(),
  distanceAheadM: z.number(),
  message: z.string(),
  vehicleNumber: z.string().optional(),
  ambulanceLat: z.number(),
  ambulanceLng: z.number(),
});
export type EmergencyAlertPayload = z.infer<typeof EmergencyAlertPayloadSchema>;

export const AlertAckInputSchema = z.object({
  alertId: z.string(),
});
export type AlertAckInput = z.infer<typeof AlertAckInputSchema>;

// Push Token Registration
export const RegisterPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});
export type RegisterPushToken = z.infer<typeof RegisterPushTokenSchema>;
