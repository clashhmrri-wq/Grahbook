import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { COLORS } from '../../src/constants/localization';
import { API_ROUTES } from '../../src/config/api';

export default function CustomerHome() {
  const router = useRouter();

  // Location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Shop states
  const [shops, setShops] = useState<any[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

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
      Alert.alert('Connection Error', 'Could not connect to the backend server. Please verify settings.');
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
          'Please enable location permissions to find nearby stores.'
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

      // Trigger shop search
      await getNearbyShops(lat, lng);
    } catch (err) {
      console.error(err);
      Alert.alert('GPS Error', 'An error occurred while fetching your location. Please check your GPS status.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    locateAndSearch();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛍️ Neighborhood Shops</Text>
        <Text style={styles.subtitle}>Discover local Kirana stores within 2-3 kms.</Text>
      </View>

      {/* GPS Status Card */}
      <View style={styles.locationCard}>
        {latitude && longitude ? (
          <View style={styles.locationSuccess}>
            <Text style={styles.locText}>📍 Location Captured</Text>
            <Text style={styles.coordsText}>Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={locateAndSearch} disabled={locationLoading}>
              <Text style={styles.refreshBtnText}>🔄 Refresh Location</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.locationPrompt}>
            <Text style={styles.locErrorText}>Location could not be captured.</Text>
            <TouchableOpacity style={styles.gpsBtn} onPress={locateAndSearch} disabled={locationLoading}>
              {locationLoading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.gpsBtnText}>📍 Locate Me</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stores List */}
      <View style={styles.storesSection}>
        <Text style={styles.sectionHeading}>Nearby Kirana Stores</Text>

        {shopsLoading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
        ) : shops.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No GrahakBook Kirana stores found within 3 km of your location.
            </Text>
            <Text style={styles.emptySubText}>
              (Tip: Make sure you have registered a shopkeeper with close-by coordinates).
            </Text>
          </View>
        ) : (
          shops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.shopCard}
              onPress={() => router.push(`/customer/shop/${shop.id}`)}
            >
              <View style={styles.shopEmojiContainer}>
                <Text style={styles.shopEmoji}>🏪</Text>
              </View>
              <View style={styles.shopDetails}>
                <Text style={styles.shopName}>{shop.shopName}</Text>
                <Text style={styles.shopOwner}>Owner: {shop.ownerName}</Text>
                <Text style={styles.shopAddress} numberOfLines={1}>{shop.address}</Text>
                <Text style={styles.distanceBadge}>{shop.distance.toFixed(2)} km away</Text>
              </View>
              <Text style={styles.arrowIcon}>➔</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  locationSuccess: {
    flexDirection: 'column',
  },
  locText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  coordsText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  refreshBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  locationPrompt: {
    alignItems: 'center',
  },
  locErrorText: {
    color: COLORS.error,
    marginBottom: 10,
    fontSize: 13,
  },
  gpsBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  gpsBtnText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  storesSection: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  emptySubText: {
    color: COLORS.accent,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  shopCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopEmojiContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  shopEmoji: {
    fontSize: 22,
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  shopOwner: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  shopAddress: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  distanceBadge: {
    color: COLORS.accent,
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 4,
  },
  arrowIcon: {
    color: COLORS.primary,
    fontSize: 18,
    paddingHorizontal: 8,
  },
  backBtn: {
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
});
