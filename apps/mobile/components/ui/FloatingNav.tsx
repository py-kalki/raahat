import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Home, Compass, Shield, MapPin, User as UserIcon } from 'lucide-react-native';
import { GlassView } from './GlassView';
import { useAuthStore } from '../../store/authStore';

export interface FloatingNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  role?: string;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  currentTab,
  onTabChange,
  role,
}) => {
  const { user } = useAuthStore();
  const activeRole = role || user?.role || 'DRIVER';

  const tabs = useMemo(() => {
    if (activeRole === 'OFFICER') {
      return [
        { id: 'officer', icon: Shield, label: 'Officer' },
        { id: 'corridor', icon: MapPin, label: 'Corridor' },
        { id: 'profile', icon: UserIcon, label: 'Profile' },
      ];
    }
    if (activeRole === 'ADMIN') {
      return [
        { id: 'home', icon: Home, label: 'Dispatch' },
        { id: 'corridor', icon: MapPin, label: 'Corridor' },
        { id: 'profile', icon: UserIcon, label: 'Profile' },
      ];
    }
    // DRIVER (default) - ONLY driver relevant tabs, NO officer guard station
    return [
      { id: 'home', icon: Home, label: 'Home' },
      { id: 'trips', icon: Compass, label: 'Trips' },
      { id: 'corridor', icon: MapPin, label: 'Corridor' },
      { id: 'profile', icon: UserIcon, label: 'Profile' },
    ];
  }, [activeRole]);

  return (
    <View style={styles.wrapper}>
      <GlassView radius="pill" elevation="3" style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={[
                styles.navItem,
                isActive ? styles.activeNavItem : styles.inactiveNavItem,
              ]}
            >
              <Icon
                size={20}
                color={isActive ? '#FFFFFF' : '#2B2F2D'}
                strokeWidth={isActive ? 2.2 : 1.75}
              />
            </Pressable>
          );
        })}
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  navBar: {
    height: 64,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  navItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavItem: {
    backgroundColor: '#111312',
  },
  inactiveNavItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});
