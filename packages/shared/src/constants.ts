export const CORRIDOR_CONFIG = {
  CORRIDOR_WIDTH_METERS: 300,
  ALERT_HORIZON_SECONDS: 240, // 4 mins
  DEFAULT_SPEED_MPS: 15, // ~54 km/h
  LOCATION_FRESHNESS_SECONDS: 60,
  PASS_DISMISS_THRESHOLD_METERS: -100, // Passed officer by 100m
} as const;

export const SOCKET_EVENTS = {
  DRIVER_LOCATION: 'driver:location',
  OFFICER_LOCATION: 'officer:location',
  EMERGENCY_ALERT: 'emergency:alert',
  ALERT_ACK: 'alert:ack',
  ALERT_ACKED: 'alert:acked',
  TRIP_UPDATE: 'trip:update',
  ALERT_DISMISS: 'alert:dismiss',
} as const;

export const APP_NAME = 'Raah';
export const APP_TAGLINE = 'Green Corridor for Life';
