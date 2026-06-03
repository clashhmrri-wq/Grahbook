import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { COLORS } from '../../src/constants/localization';
import { API_ROUTES } from '../../src/config/api';

const GROCERY_CATEGORIES = [
  { id: '1', name: 'Dairy & Milk', emoji: '🥛', color: '#EBF5FF' },
  { id: '2', name: 'Bread & Bakery', emoji: '🍞', color: '#FFFBEB' },
  { id: '3', name: 'Snacks & Munchies', emoji: '🍪', color: '#FDF2F8' },
  { id: '4', name: 'Soft Drinks', emoji: '🥤', color: '#ECFDF5' },
  { id: '5', name: 'Fruits & Vegetables', emoji: '🥬', color: '#F5F5F4' },
  { id: '6', name: 'Atta & Rice', emoji: '🌾', color: '#FFF7ED' },
];

export default function CustomerHome() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Active Customer Session details from Google Login
  const [customerId, setCustomerId] = useState((params.customerId as string) || 'guest_customer_id');
  const [customerName, setCustomerName] = useState((params.customerName as string) || 'Guest Customer');
  const [customerPhone, setCustomerPhone] = useState((params.customerPhone as string) || '9876543210');
  const [googleProfilePic, setGoogleProfilePic] = useState((params.googleProfilePic as string) || '');
  const [googleEmail, setGoogleEmail] = useState((params.googleEmail as string) || 'guest@gmail.com');

  // Account Drawer modal state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [associatedShopId, setAssociatedShopId] = useState<string | null>(null);
  const [checkingShop, setCheckingShop] = useState(false);

  // Location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Shop list states
  const [shops, setShops] = useState<any[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if customer's phone number is already registered as a merchant
  const checkMerchantAssociation = async () => {
    if (!customerPhone) return;
    setCheckingShop(true);
    try {
      const response = await fetch(API_ROUTES.shopkeepers);
      const data = await response.json();
      if (response.ok && data.success) {
        // Find if any shopkeeper phone matches customer's phone number
        const matchingShop = data.data.find(
          (shop: any) => shop.phoneNumber === customerPhone
        );
        if (matchingShop) {
          setAssociatedShopId(matchingShop.id);
        } else {
          setAssociatedShopId(null);
        }
      }
    } catch (error) {
      console.error('Error verifying merchant association:', error);
    } finally {
      setCheckingShop(false);
    }
  };

  // Fetch coordinates and search nearby stores
  const getNearbyShops = async (lat: number, lng: number) => {
    setShopsLoading(true);
    try {
      const url = `${API_ROUTES.nearbyShops}?lat=${lat}&lng=${lng}&radius=3.0`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.success) {
        setShops(data.data);
      } else {
        Alert.alert('Search Error', 'Unable to load nearby stores.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Could not connect to the backend server. Verify your internet.');
    } finally {
      setShopsLoading(false);
    }
  };

  const locateAndSearch = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Needed',
          'Please enable location permissions to find grocery stores nearby.'
        );
        setLocationLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = currentLocation.coords.latitude;
      const lng = currentLocation.coords.longitude;

      setLatitude(lat);
      setLongitude(lng);

      await getNearbyShops(lat, lng);
    } catch (err) {
      console.error(err);
      Alert.alert('GPS Error', 'An error occurred while fetching your location. Please check your GPS status.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    locateAndSearch();
    checkMerchantAssociation();
  }, [customerPhone]);

  const filteredShops = shops.filter((shop) =>
    shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.wrapper}>
      {/* Brand Header Banner with Profile Avatar */}
      <View style={styles.brandHeader}>
        <View style={styles.locationHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTagline}>🚴 Delivering from Nearby Kirana</Text>
            <Text style={styles.locationSummary} numberOfLines={1}>
              {latitude && longitude 
                ? `📍 Pinpointed Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
                : '📍 Fetching location...'
              }
            </Text>
          </View>
          
          {/* Google Profile Avatar Header Trigger */}
          <TouchableOpacity style={styles.avatarBtn} onPress={() => {
            checkMerchantAssociation();
            setDrawerVisible(true);
          }}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Blinkit Style Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores or cities..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Category Circle Grid */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionHeading}>Shop By Category</Text>
          <View style={styles.categoryGrid}>
            {GROCERY_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => {
                  Alert.alert('Category Selected', `Showing grocery items under ${cat.name}`);
                }}
              >
                <View style={[styles.categoryCircle, { backgroundColor: cat.color }]}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Promo banner */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoTitle}>⚡ Free Direct-to-Home Delivery</Text>
          <Text style={styles.promoSub}>Zero order markups. Directly pay local merchants via UPI.</Text>
        </View>

        {/* Nearby Stores Listings */}
        <View style={styles.storesSection}>
          <Text style={styles.sectionHeading}>Kirana Stores Near You</Text>

          {shopsLoading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
          ) : filteredShops.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No stores found nearby.
              </Text>
              <Text style={styles.emptySubText}>
                (Tip: Onboard a local store nearby or refresh GPS coordinates).
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={locateAndSearch}>
                <Text style={styles.retryBtnText}>Retry Location Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredShops.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={styles.shopCard}
                onPress={() => router.push({
                  pathname: `/customer/shop/${shop.id}`,
                  params: { customerId, customerName, customerPhone }
                })}
              >
                {/* Store Header Detail */}
                <View style={styles.shopCardHeader}>
                  <View style={styles.shopIconBox}>
                    <Text style={styles.shopIcon}>🏪</Text>
                  </View>
                  <View style={styles.shopTextColumn}>
                    <Text style={styles.shopName}>{shop.shopName}</Text>
                    <Text style={styles.shopOwner}>Owner: {shop.ownerName}</Text>
                    <Text style={styles.shopAddress} numberOfLines={1}>{shop.address}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ 4.8</Text>
                  </View>
                </View>

                {/* Horizontal divider */}
                <View style={styles.shopDivider} />

                {/* Footer preview badges */}
                <View style={styles.shopFooterRow}>
                  <Text style={styles.distanceText}>🚴 {shop.distance.toFixed(1)} km away</Text>
                  <View style={styles.previewPillsRow}>
                    <View style={styles.pill}><Text style={styles.pillText}>🥛 Fresh Milk</Text></View>
                    <View style={styles.pill}><Text style={styles.pillText}>🌾 Groceries</Text></View>
                    <View style={styles.pill}><Text style={styles.pillText}>⚡ Instant Pickup</Text></View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.backBtnText}>Exit to Welcome Page</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Account Settings Bottom Sheet Drawer */}
      <Modal visible={drawerVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 Google User Account</Text>
              <TouchableOpacity onPress={() => setDrawerVisible(false)}>
                <Text style={styles.modalCloseBtn}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accountCard}>
              <View style={styles.profileRow}>
                <View style={styles.largeAvatarCircle}>
                  <Text style={styles.largeAvatarEmoji}>👤</Text>
                </View>
                <View style={styles.accountText}>
                  <Text style={styles.accountName}>{customerName}</Text>
                  <Text style={styles.accountEmail}>{googleEmail}</Text>
                  <Text style={styles.accountPhone}>WhatsApp: +91 {customerPhone}</Text>
                </View>
              </View>
            </View>

            {/* Merchant Transition Options */}
            <View style={styles.transitionBox}>
              {checkingShop ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : associatedShopId ? (
                // If registered, show "Switch to Seller Cockpit"
                <TouchableOpacity
                  style={[styles.transitionBtn, { backgroundColor: COLORS.primary }]}
                  onPress={() => {
                    setDrawerVisible(false);
                    router.push({
                      pathname: '/shopkeeper/dashboard',
                      params: { shopkeeperId: associatedShopId }
                    });
                  }}
                >
                  <Text style={styles.transitionBtnText}>🏪 Switch to Seller Dashboard</Text>
                </TouchableOpacity>
              ) : (
                // If not registered, show "Become a Seller"
                <TouchableOpacity
                  style={[styles.transitionBtn, { backgroundColor: '#F59E0B' }]}
                  onPress={() => {
                    setDrawerVisible(false);
                    router.push({
                      pathname: '/shopkeeper/onboard',
                      params: { ownerName: customerName, phoneNumber: customerPhone }
                    });
                  }}
                >
                  <Text style={styles.transitionBtnText}>🚀 Start Selling / Become a Seller</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Log Out */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                setDrawerVisible(false);
                router.replace('/');
              }}
            >
              <Text style={styles.logoutBtnText}>Log Out Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  brandHeader: {
    backgroundColor: COLORS.accent, // Yellow banner
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandTagline: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  locationSummary: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  avatarBtn: {
    marginLeft: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 10,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryEmoji: {
    fontSize: 30,
  },
  categoryName: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  promoBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: 'rgba(12, 131, 31, 0.12)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  promoTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  promoSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  storesSection: {
    flex: 1,
  },
  emptyCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  emptySubText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  shopCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  shopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  shopIcon: {
    fontSize: 24,
  },
  shopTextColumn: {
    flex: 1,
  },
  shopName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  shopOwner: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  shopAddress: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  ratingBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  ratingText: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 11,
  },
  shopDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  shopFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  previewPillsRow: {
    flexDirection: 'row',
  },
  pill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 6,
  },
  pillText: {
    color: '#4B5563',
    fontSize: 9,
    fontWeight: '700',
  },
  backBtn: {
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: COLORS.cardBackground,
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 14,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    color: COLORS.error,
    fontWeight: 'bold',
    fontSize: 13,
  },
  accountCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  largeAvatarEmoji: {
    fontSize: 30,
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '800',
  },
  accountEmail: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  accountPhone: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
  },
  transitionBox: {
    marginBottom: 20,
  },
  transitionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  transitionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  logoutBtn: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 13,
  },
});
