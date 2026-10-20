import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { PillButton } from '../../components/ui/PillButton';
import { useAuthStore } from '../../store/authStore';
import {
  Bell,
  User as UserIcon,
  Star,
  Heart,
  ArrowRight,
  ShieldCheck,
  Navigation,
} from 'lucide-react-native';

export default function DriverHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentTab, setCurrentTab] = useState('home');

  const categories = ['All', 'Trauma Center', 'Safdarjung', 'Fortis', 'Apollo'];

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 7.2 Top Greeting Row */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.welcomeBackText}>Welcome back</Text>
              <Text style={styles.userNameText}>
                Hello {user?.name || 'Driver'}
              </Text>
            </View>

            <View style={styles.greetingActions}>
              <GlassView radius="pill" style={styles.circleBtn}>
                <Bell size={18} color="#111312" />
                <View style={styles.notificationDot} />
              </GlassView>

              <Pressable
                onPress={() => {
                  logout();
                  router.replace('/(auth)/login');
                }}
              >
                <GlassView radius="pill" style={styles.circleBtn}>
                  <UserIcon size={18} color="#111312" />
                </GlassView>
              </Pressable>
            </View>
          </View>

          {/* Headline: Where will you Go Next */}
          <View style={styles.headlineWrapper}>
            <EditorialHeadline
              plainText="Where will you"
              italicText="Dispatch Next"
              size="display-lg"
            />
          </View>

          {/* Section: Recommended Places / Quick Corridor */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Priority Corridors</Text>
          </View>

          {/* 7.7 Hero Recommendation Card */}
          <GlassView radius="lg" elevation="3" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroChipsRow}>
                <View style={styles.popularChip}>
                  <Text style={styles.popularText}>Corridor Ready</Text>
                </View>
                <View style={styles.ratingChip}>
                  <Star size={12} color="#E9B872" fill="#E9B872" />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>

              <View style={styles.heartBtn}>
                <Heart size={16} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.heroBottomArea}>
              <Text style={styles.heroTitle}>AIIMS Trauma Center</Text>
              <Text style={styles.heroDesc}>
                Automated junction clearance via Ring Road corridor (7.4 km)
              </Text>

              <View style={styles.heroActionRow}>
                <View style={styles.officerPill}>
                  <ShieldCheck size={14} color="#6F9A78" />
                  <Text style={styles.officerPillText}>5 Officers On Duty</Text>
                </View>
              </View>
            </View>
          </GlassView>

          {/* CTA: Setup Trip */}
          <View style={styles.ctaBox}>
            <PillButton
              label="Setup Emergency Trip"
              onPress={() => router.push('/driver/trip-setup')}
            />
          </View>

          {/* Section: Explore Places */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore Hospital Hubs</Text>
          </View>

          {/* 7.8 Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                selected={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>

          {/* 7.9 Small Route Cards Grid */}
          <View style={styles.cardsRow}>
            <GlassView radius="md" elevation="2" style={styles.smallCard}>
              <View style={styles.smallCardTop}>
                <View style={styles.smallRating}>
                  <Star size={10} color="#E9B872" fill="#E9B872" />
                  <Text style={styles.smallRatingText}>4.9</Text>
                </View>
                <View style={styles.smallArrow}>
                  <Navigation size={12} color="#111312" />
                </View>
              </View>
              <View style={styles.smallCardBottom}>
                <Text style={styles.smallTitle}>Ring Road</Text>
                <Text style={styles.smallSub}>Arterial North</Text>
              </View>
            </GlassView>

            <GlassView radius="md" elevation="2" style={styles.smallCard}>
              <View style={styles.smallCardTop}>
                <View style={styles.smallRating}>
                  <Star size={10} color="#E9B872" fill="#E9B872" />
                  <Text style={styles.smallRatingText}>4.8</Text>
                </View>
                <View style={styles.smallArrow}>
                  <Navigation size={12} color="#111312" />
                </View>
              </View>
              <View style={styles.smallCardBottom}>
                <Text style={styles.smallTitle}>Civil Lines</Text>
                <Text style={styles.smallSub}>Express Link</Text>
              </View>
            </GlassView>
          </View>
        </ScrollView>

        {/* 7.10 Floating Bottom Nav */}
        <FloatingNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab === 'officer') router.push('/officer');
            if (tab === 'trips') router.push('/driver/trip-setup');
          }}
        />
      </SafeAreaView>
    </FogBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  welcomeBackText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5E6661',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111312',
    marginTop: 2,
  },
  greetingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6F9A78',
  },
  headlineWrapper: {
    marginVertical: 12,
  },
  sectionHeader: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111312',
    letterSpacing: -0.2,
  },
  heroCard: {
    height: 210,
    padding: 18,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(31, 58, 42, 0.92)', // forest-900 rich atmospheric card
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  popularChip: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
  },
  popularText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  ratingChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottomArea: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  heroActionRow: {
    marginTop: 8,
  },
  officerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  officerPillText: {
    fontSize: 11,
    color: '#A9C4AE',
    fontWeight: '500',
  },
  ctaBox: {
    marginVertical: 18,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  smallCard: {
    flex: 1,
    height: 140,
    padding: 14,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  smallCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallRating: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(17, 19, 18, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  smallRatingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111312',
  },
  smallArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardBottom: {
    gap: 2,
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111312',
  },
  smallSub: {
    fontSize: 11,
    color: '#5E6661',
  },
});
