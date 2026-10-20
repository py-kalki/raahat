import * as turf from '@turf/turf';
import { CORRIDOR_CONFIG } from '@raahat/shared';
import { prisma } from '../prisma';

export interface EligibleOfficerAlert {
  officerId: string;
  userId: string;
  etaSec: number;
  distanceAheadM: number;
  officerLat: number;
  officerLng: number;
}

export interface OfficerToDismiss {
  alertId: string;
  officerId: string;
  userId: string;
}

export class CorridorService {
  /**
   * Evaluates an ambulance location against the trip route and all active on-duty officers.
   */
  async evaluateCorridor(
    tripId: string,
    routeGeoJsonRaw: string,
    ambulanceLat: number,
    ambulanceLng: number,
    currentSpeedMps?: number
  ): Promise<{
    newAlerts: EligibleOfficerAlert[];
    dismissals: OfficerToDismiss[];
  }> {
    const route = JSON.parse(routeGeoJsonRaw);
    const routeLine = turf.lineString(route.coordinates);

    // 1. Snap ambulance position to route line
    const ambulancePoint = turf.point([ambulanceLng, ambulanceLat]);
    const ambulanceSnapped = turf.nearestPointOnLine(routeLine, ambulancePoint, {
      units: 'meters',
    });
    const ambulanceAlongM = ambulanceSnapped.properties.location || 0;

    // Use current vehicle speed if >= 5 m/s (~18 km/h), otherwise fallback to configured default (15 m/s)
    const effectiveSpeed =
      currentSpeedMps && currentSpeedMps >= 5
        ? currentSpeedMps
        : CORRIDOR_CONFIG.DEFAULT_SPEED_MPS;

    // 2. Fetch on-duty officers (fresh location or active on-duty within 30 mins)
    const freshnessCutoff = new Date(
      Date.now() - 30 * 60 * 1000
    );

    const onDutyOfficers = await prisma.officer.findMany({
      where: {
        onDuty: true,
        currentLat: { not: null },
        currentLng: { not: null },
        OR: [
          { lastLocationAt: { gte: freshnessCutoff } },
          { lastLocationAt: null },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // 3. Fetch existing alerts for this trip to prevent re-alerting or identify candidates for dismissal
    const existingAlerts = await prisma.alert.findMany({
      where: { tripId },
      select: {
        id: true,
        officerId: true,
        status: true,
      },
    });

    const existingAlertMap = new Map<string, { id: string; status: string }>();
    existingAlerts.forEach((a) => existingAlertMap.set(a.officerId, { id: a.id, status: a.status }));

    const newAlerts: EligibleOfficerAlert[] = [];
    const dismissals: OfficerToDismiss[] = [];

    for (const officer of onDutyOfficers) {
      if (officer.currentLat === null || officer.currentLng === null) continue;

      const officerPoint = turf.point([officer.currentLng, officer.currentLat]);
      const officerSnapped = turf.nearestPointOnLine(routeLine, officerPoint, {
        units: 'meters',
      });

      // Perpendicular distance to route
      const distanceToRouteM = officerSnapped.properties.dist || 0;
      if (distanceToRouteM > CORRIDOR_CONFIG.CORRIDOR_WIDTH_METERS) {
        continue; // Outside corridor width (300m)
      }

      // Distance along route ahead of ambulance
      const officerAlongM = officerSnapped.properties.location || 0;
      const distanceAheadM = officerAlongM - ambulanceAlongM;

      const existingAlert = existingAlertMap.get(officer.id);

      // Check if ambulance has passed this officer (distanceAhead < -100m)
      if (
        distanceAheadM < CORRIDOR_CONFIG.PASS_DISMISS_THRESHOLD_METERS &&
        existingAlert &&
        existingAlert.status !== 'DISMISSED'
      ) {
        dismissals.push({
          alertId: existingAlert.id,
          officerId: officer.id,
          userId: officer.userId,
        });
        continue;
      }

      // Check if officer is ahead of ambulance and within alert horizon
      if (distanceAheadM > 0 && !existingAlert) {
        const etaSec = distanceAheadM / effectiveSpeed;
        if (etaSec <= CORRIDOR_CONFIG.ALERT_HORIZON_SECONDS) {
          newAlerts.push({
            officerId: officer.id,
            userId: officer.userId,
            etaSec: Math.round(etaSec),
            distanceAheadM: Math.round(distanceAheadM),
            officerLat: officer.currentLat,
            officerLng: officer.currentLng,
          });
        }
      }
    }

    return { newAlerts, dismissals };
  }
}

export const corridorService = new CorridorService();
