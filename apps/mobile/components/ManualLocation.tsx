import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Linking } from 'react-native';
import { parseManualLocation } from '../lib/manual-location';
import type { UserLocation } from '../lib/location';
import { PillButton } from './ui/PillButton';

export function ManualLocation({ onConfirm, disabled = false }: { onConfirm: (location: UserLocation) => Promise<void>; disabled?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [lat, setLat] = useState(''), [lng, setLng] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <View style={{ gap: 10, marginVertical: 12 }}>
    <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)}>
      <Text style={{ color: '#1F3A2A', textDecorationLine: 'underline' }}>GPS unavailable? Enter confirmed coordinates</Text>
    </Pressable>
    {expanded && <>
      <Text>Demo fallback: copy your actual pickup or officer post coordinates from a map. These are manually confirmed, not GPS-detected.</Text>
      <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.openstreetmap.org').catch(() => setError('Open a map in your browser to find the coordinates.')); }}>
        <Text style={{ color: '#1F3A2A', textDecorationLine: 'underline' }}>Open map to find coordinates</Text>
      </Pressable>
      <TextInput accessibilityLabel="Latitude" placeholder="Latitude, e.g. 28.61390" value={lat} onChangeText={setLat} autoCapitalize="none" style={{ padding: 12, borderWidth: 1, borderColor: '#B8C7BE', borderRadius: 8 }} />
      <TextInput accessibilityLabel="Longitude" placeholder="Longitude, e.g. 77.20900" value={lng} onChangeText={setLng} autoCapitalize="none" style={{ padding: 12, borderWidth: 1, borderColor: '#B8C7BE', borderRadius: 8 }} />
      {!!error && <Text accessibilityLiveRegion="polite" style={{ color: '#B03020' }}>{error}</Text>}
      <PillButton label="I confirm this position — use coordinates" disabled={disabled || busy} loading={busy} onPress={async () => {
        setError(''); setBusy(true);
        try { await onConfirm(parseManualLocation(lat, lng)); setExpanded(false); }
        catch (e: any) { setError(e.message || 'Could not save this location.'); }
        finally { setBusy(false); }
      }} />
    </>}
  </View>;
}
