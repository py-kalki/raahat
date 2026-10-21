import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useOfficerStore } from '../store/officerStore';
import { socketManager } from '../lib/socket';
import { api } from '../lib/api';
import { EmergencyAlertPayload, SOCKET_EVENTS } from '@raahat/shared';
import { OfficerAlertModal } from './ui/OfficerAlertModal';

// Subscribe once for the signed-in officer, including while Demo setup is open.
export function OfficerAlerts() {
  const user = useAuthStore(state => state.user);
  const { activeAlert, setActiveAlert, acknowledgeActiveAlert, isAcknowledging } = useOfficerStore();
  useEffect(() => {
    if (user?.role !== 'OFFICER') return;
    const socket = socketManager.getSocket();
    let active = true, revision = 0;
    const receive = (alert: EmergencyAlertPayload) => { revision++; setActiveAlert(alert); };
    const dismiss = ({ alertId }: { alertId: string }) => {
      revision++;
      if (useOfficerStore.getState().activeAlert?.alertId === alertId) setActiveAlert(null);
    };
    const recover = async () => {
      const before = revision;
      try {
        const alerts = await api.request<EmergencyAlertPayload[]>('/officers/alerts/active');
        if (active && before === revision && !useOfficerStore.getState().activeAlert) setActiveAlert(alerts[0] || null);
      } catch { /* Socket reconnection will retry recovery. */ }
    };
    socket?.on(SOCKET_EVENTS.EMERGENCY_ALERT, receive);
    socket?.on(SOCKET_EVENTS.ALERT_DISMISS, dismiss);
    socket?.on('connect', recover);
    void recover();
    const appState = AppState.addEventListener('change', state => { if (state === 'active') void recover(); });
    return () => {
      active = false;
      socket?.off(SOCKET_EVENTS.EMERGENCY_ALERT, receive);
      socket?.off(SOCKET_EVENTS.ALERT_DISMISS, dismiss);
      socket?.off('connect', recover);
      appState.remove();
    };
  }, [user?.id]);
  if (user?.role !== 'OFFICER') return null;
  return <OfficerAlertModal visible={!!activeAlert} alert={activeAlert}
    onAcknowledge={acknowledgeActiveAlert} isAcknowledging={isAcknowledging}
    onDismiss={() => setActiveAlert(null)} />;
}
