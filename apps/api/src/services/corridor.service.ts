import { prisma } from '../prisma';

export interface EligibleOfficerAlert {
  officerId: string;
  userId: string;
  etaSec: number;
  distanceAheadM: number;
  officerLat: number | null;
  officerLng: number | null;
}
export interface OfficerToDismiss { alertId: string; officerId: string; userId: string; }

export class CorridorService {
  // Demo broadcast: location, duty, route distance and ETA do not gate recipients.
  // Negative ETA/distance mean "not estimated", never an invented arrival time.
  async evaluateCorridor(tripId: string, _route: string, _lat: number, _lng: number,
    _speed?: number, officerUserId?: string): Promise<{ newAlerts: EligibleOfficerAlert[]; dismissals: OfficerToDismiss[] }> {
    const officers = await prisma.officer.findMany({ where: {
      user: { verified: true, role: 'OFFICER' },
      ...(officerUserId ? { userId: officerUserId } : {}),
    } });
    const existing = await prisma.alert.findMany({ where: { tripId }, select: { officerId: true } });
    const notified = new Set(existing.map(alert => alert.officerId));
    return {
      newAlerts: officers.filter(officer => !notified.has(officer.id)).map(officer => ({
        officerId: officer.id, userId: officer.userId, etaSec: -1, distanceAheadM: -1,
        officerLat: officer.currentLat, officerLng: officer.currentLng,
      })),
      dismissals: [],
    };
  }
}
export const corridorService = new CorridorService();
