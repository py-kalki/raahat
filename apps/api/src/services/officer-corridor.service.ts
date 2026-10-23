import { prisma } from '../prisma';
import { corridorService } from './corridor.service';
import { alertService } from './alert.service';

// An officer can become ready after the driver's first (one-time) GPS update.
// Check existing rides now instead of waiting for another driver movement.
export async function evaluateOfficerActiveTrips(userId: string) {
  const trips = await prisma.trip.findMany({ where: { status: 'ACTIVE' } });
  for (const trip of trips) {
    const lat = trip.currentLat ?? trip.pickupLat;
    const lng = trip.currentLng ?? trip.pickupLng;
    const result = await corridorService.evaluateCorridor(
      trip.id, trip.routeGeoJson, lat, lng, trip.currentSpeed ?? undefined, userId,
    );
    for (const officer of result.newAlerts) {
      await alertService.dispatchAlert(trip.id, officer.officerId, officer.userId,
        officer.etaSec, officer.distanceAheadM, trip.vehicleNumber ?? undefined, lat, lng);
    }
    for (const dismissal of result.dismissals) {
      await alertService.dismissAlert(dismissal.alertId, dismissal.userId);
    }
  }
}
