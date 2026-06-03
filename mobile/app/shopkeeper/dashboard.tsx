import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/localization';
import { API_ROUTES } from '../../src/config/api';

export default function ShopkeeperDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Shopkeeper ID from parameters
  const [shopkeeperId, setShopkeeperId] = useState<string>((params.shopkeeperId || params.id) as string || '');
  const [shopkeepersList, setShopkeepersList] = useState<any[]>([]);
  const [shopProfile, setShopProfile] = useState<any>(null);
  
  // Dashboard Metrics
  const [metrics, setMetrics] = useState({
    totalEarnings: 0,
    completedOrdersCount: 0,
    todayEarnings: 0,
    todayOrdersCount: 0,
    activeOrdersCount: 0,
    averageRating: 0.0,
    totalReviews: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load shop list if no ID is selected (fallback search helper)
  const fetchShopkeepers = async () => {
    try {
      const response = await fetch(API_ROUTES.shopkeepers);
      const data = await response.json();
      if (response.ok && data.success) {
        setShopkeepersList(data.data);
        if (data.data.length > 0 && !shopkeeperId) {
          setShopkeeperId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching shops list:', error);
    }
  };

  // Fetch shop details and metrics
  const loadDashboardData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      if (!shopkeeperId) {
        await fetchShopkeepers();
        setLoading(false);
        return;
      }

      // 1. Fetch Profile Details
      const profileResp = await fetch(API_ROUTES.shopDetails(shopkeeperId));
      const profileData = await profileResp.json();
      if (profileResp.ok && profileData.success) {
        setShopProfile(profileData.data);
      }

      // 2. Fetch Aggregated Metrics
      const metricsResp = await fetch(API_ROUTES.shopkeeperAnalytics(shopkeeperId));
      const metricsData = await metricsResp.json();
      if (metricsResp.ok && metricsData.success) {
        setMetrics(metricsData.data);
      }

      // Fetch list for switcher config
      await fetchShopkeepers();
    } catch (err) {
      console.error(err);
      Alert.alert('Connection Error', 'Could not load store metrics. Verify backend server is live.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [shopkeeperId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.bgDark }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading dashboard metrics...</Text>
      </View>
    );
  }

  // Fallback: If no shopkeepers exist in the system database
  if (!shopkeeperId && shopkeepersList.length === 0) {
    return (
      <View style={[styles.noShopContainer, { backgroundColor: COLORS.bgDark }]}>
        <Text style={styles.noShopEmoji}>🏪</Text>
        <Text style={styles.noShopTitle}>No Kirana Store Found</Text>
        <Text style={styles.noShopSubtitle}>Please onboard your store to access the seller dashboard.</Text>
        <TouchableOpacity
          style={styles.onboardBtn}
          onPress={() => router.replace('/shopkeeper/onboard')}
        >
          <Text style={styles.onboardBtnText}>Register Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.replace('/')}>
          <Text style={styles.exitBtnText}>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: COLORS.bgDark }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header Banner */}
      <View style={[styles.header, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
        <Text style={styles.logoText}>🏪 GrahakBook Seller Cockpit</Text>
        <Text style={styles.shopTitle}>{shopProfile?.shopName || 'Kirana Store'}</Text>
        <Text style={styles.shopOwner}>Owner: {shopProfile?.ownerName || 'Merchant'}</Text>
        <Text style={styles.shopAddress}>{shopProfile?.address}, {shopProfile?.city}</Text>
      </View>

      {/* Switch Shop Dev selector if there are multiple shops */}
      {shopkeepersList.length > 1 && (
        <View style={styles.switchShopCard}>
          <Text style={styles.switchShopLabel}>Switch Active Store (Dev Mode):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.switchRow}>
            {shopkeepersList.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={[
                  styles.switchOption, 
                  { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark },
                  shop.id === shopkeeperId && styles.switchOptionActive
                ]}
                onPress={() => setShopkeeperId(shop.id)}
              >
                <Text style={[styles.switchOptionText, shop.id === shopkeeperId && styles.switchOptionTextActive]}>
                  {shop.shopName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* active orders notification badge */}
      {metrics.activeOrdersCount > 0 && (
        <TouchableOpacity 
          style={styles.activeOrdersAlert}
          onPress={() => router.push({
            pathname: '/shopkeeper/orders',
            params: { shopkeeperId }
          })}
        >
          <Text style={styles.activeOrdersAlertText}>
            🔔 You have {metrics.activeOrdersCount} pending active orders! Tap to fulfill.
          </Text>
        </TouchableOpacity>
      )}

      {/* Today's Sales summary cards */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
          <Text style={styles.statVal}>{metrics.todayOrdersCount}</Text>
          <Text style={styles.statLbl}>Dispatches</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
          <Text style={[styles.statVal, { color: COLORS.accent }]}>₹{metrics.todayEarnings.toFixed(2)}</Text>
          <Text style={styles.statLbl}>Sales</Text>
        </View>
      </View>

      {/* All Time Performance Analytics */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Store Performance Metrics</Text>
      </View>
      <View style={[styles.analyticsCard, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
        <View style={styles.analyticRow}>
          <Text style={styles.analyticLabel}>Total Settle Volume</Text>
          <Text style={[styles.analyticValue, { color: COLORS.primary }]}>₹{metrics.totalEarnings.toFixed(2)}</Text>
        </View>
        <View style={[styles.analyticDivider, { backgroundColor: COLORS.borderDark }]} />
        <View style={styles.analyticRow}>
          <Text style={styles.analyticLabel}>Completed Delivery Count</Text>
          <Text style={[styles.analyticValue, { color: '#F3F4F6' }]}>{metrics.completedOrdersCount}</Text>
        </View>
        <View style={[styles.analyticDivider, { backgroundColor: COLORS.borderDark }]} />
        <View style={styles.analyticRow}>
          <Text style={styles.analyticLabel}>Average Customer Rating</Text>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingText}>⭐ {metrics.averageRating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({metrics.totalReviews} local feedback)</Text>
          </View>
        </View>
      </View>

      {/* Dashboard Quick Navigation Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => router.push({
            pathname: '/shopkeeper/orders',
            params: { shopkeeperId }
          })}
        >
          <Text style={styles.actionBtnText}>📦 incoming orders dispatch manager</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.borderDark }]}
          onPress={() => router.push({
            pathname: '/shopkeeper/catalog',
            params: { shopkeeperId }
          })}
        >
          <Text style={[styles.actionBtnText, { color: '#F3F4F6' }]}>📚 catalog inventory manager</Text>
        </TouchableOpacity>
      </View>

      {/* Logout button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.backBtnText}>Exit Cockpit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  noShopContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noShopEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noShopTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  noShopSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 24,
  },
  onboardBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  onboardBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exitBtn: {
    borderWidth: 1,
    borderColor: '#2D2D34',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  exitBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  header: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shopTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
  },
  shopOwner: {
    fontSize: 13,
    color: '#F3F4F6',
    marginTop: 4,
  },
  shopAddress: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  switchShopCard: {
    marginBottom: 20,
  },
  switchShopLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
  },
  switchOption: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  switchOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(12, 131, 31, 0.15)',
  },
  switchOptionText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  switchOptionTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  activeOrdersAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  activeOrdersAlertText: {
    color: COLORS.accent,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLbl: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  analyticsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  analyticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  analyticLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  analyticValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  analyticDivider: {
    height: 1,
    marginVertical: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: COLORS.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  ratingCount: {
    color: '#9CA3AF',
    fontSize: 11,
    marginLeft: 4,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionBtn: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  backBtn: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  backBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 13,
  },
});
