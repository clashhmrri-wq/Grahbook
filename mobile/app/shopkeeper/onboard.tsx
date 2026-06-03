import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LOCALIZATION, COLORS } from '../../src/constants/localization';
import { API_ROUTES } from '../../src/config/api';

export default function ShopkeeperOnboard() {
  const router = useRouter();

  // Form states
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saasPlan, setSaasPlan] = useState<'BASIC' | 'PREMIUM'>('BASIC');

  // Location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // App submission states
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Fetch device GPS coordinates using expo-location
  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Needed',
          LOCALIZATION.locationPermissionError
        );
        setLocationLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(currentLocation.coords.latitude);
      setLongitude(currentLocation.coords.longitude);
      Alert.alert('GPS Success ✓', 'Aapki dukaan ki coordinates capture ho gayi hain (Dukaan coordinates captured).');
    } catch (err) {
      console.error(err);
      Alert.alert('Location Error', 'GPS coordinate fetch karne mein dikkat aayi. Kripya GPS enable karein.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Submit onboarding details to Node/Express backend API
  const handleOnboard = async () => {
    // Front-end validations
    if (!ownerName || !shopName || !phoneNumber || !pinCode || !address || !city) {
      Alert.alert('Details Missing', 'Kripya sabhi fields enter karein (कृपया सभी फ़ील्ड भरें).');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('Location Missing', 'Kripya GPS location set karein taaki neighborhood customers aapko dhoondh sakein.');
      return;
    }

    setSubmitting(true);

    try {
      // Connect to the Express backend endpoint.
      const API_URL = API_ROUTES.shopkeeperOnboard;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerName,
          shopName,
          phoneNumber,
          pinCode,
          address,
          city,
          latitude,
          longitude,
          saasPlan,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessData(data);
      } else {
        // Handle validation/duplication error from express
        Alert.alert(
          'Onboarding Failure',
          data.hinglishMessage || data.message || 'Sahi details fill karein.'
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Server Error',
        'Backend se connect nahi ho paya. Kripya check karein ki server chal raha hai.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>{LOCALIZATION.successTitle}</Text>
        <Text style={styles.successText}>{successData.hinglish.welcome}</Text>
        <Text style={styles.successSubText}>{successData.hinglish.subscriptionInfo}</Text>

        <View style={styles.receiptContainer}>
          <Text style={styles.receiptLabel}>Dukaan ID:</Text>
          <Text style={styles.receiptValue}>{successData.data.id}</Text>

          <Text style={styles.receiptLabel}>Plan Type:</Text>
          <Text style={styles.receiptValue}>{successData.data.saasPlan} (Trial Active)</Text>
        </View>

        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => router.push('/shopkeeper/dashboard')}
        >
          <Text style={styles.dashboardBtnText}>Go to Dashboard (डैशबोर्ड पर जाएं)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>{LOCALIZATION.welcomeTitle}</Text>
      <Text style={styles.headerSubTitle}>{LOCALIZATION.welcomeSubtitle}</Text>

      <View style={styles.card}>
        {/* Owner Name Input */}
        <Text style={styles.label}>{LOCALIZATION.ownerNameLabel}</Text>
        <TextInput
          style={styles.input}
          placeholder={LOCALIZATION.ownerNamePlaceholder}
          placeholderTextColor={COLORS.textMuted}
          value={ownerName}
          onChangeText={setOwnerName}
        />

        {/* Shop Name Input */}
        <Text style={styles.label}>{LOCALIZATION.shopNameLabel}</Text>
        <TextInput
          style={styles.input}
          placeholder={LOCALIZATION.shopNamePlaceholder}
          placeholderTextColor={COLORS.textMuted}
          value={shopName}
          onChangeText={setShopName}
        />

        {/* WhatsApp Mobile Phone Input */}
        <Text style={styles.label}>{LOCALIZATION.phoneLabel}</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder={LOCALIZATION.phonePlaceholder}
          placeholderTextColor={COLORS.textMuted}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        <Text style={styles.inputHelper}>{LOCALIZATION.phoneHelper}</Text>

        {/* Address Input */}
        <Text style={styles.label}>{LOCALIZATION.addressLabel}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder={LOCALIZATION.addressPlaceholder}
          placeholderTextColor={COLORS.textMuted}
          value={address}
          onChangeText={setAddress}
        />

        {/* PIN Code & City Inline */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>{LOCALIZATION.pincodeLabel}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={LOCALIZATION.pincodePlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={pinCode}
              onChangeText={setPinCode}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>{LOCALIZATION.cityLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={LOCALIZATION.cityPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>

        {/* GPS location coordinates button */}
        <Text style={styles.label}>{LOCALIZATION.locationTitle}</Text>
        {latitude && longitude ? (
          <TouchableOpacity style={[styles.locationBtn, styles.locationBtnSuccess]} onPress={fetchLocation}>
            <Text style={styles.locationBtnText}>{LOCALIZATION.locationBtnActive}</Text>
            <Text style={styles.coordsText}>Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.locationBtn} onPress={fetchLocation} disabled={locationLoading}>
            {locationLoading ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Text style={styles.locationBtnText}>📍 {LOCALIZATION.locationBtnFetch}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* SaaS Subscription tier selections */}
        <Text style={styles.label}>{LOCALIZATION.saasTitle}</Text>
        <View style={styles.planSelector}>
          <TouchableOpacity
            style={[styles.planCard, saasPlan === 'BASIC' && styles.planCardSelected]}
            onPress={() => setSaasPlan('BASIC')}
          >
            <Text style={[styles.planName, saasPlan === 'BASIC' && styles.planTextSelected]}>
              {LOCALIZATION.saasBasicTitle}
            </Text>
            <Text style={styles.planDesc}>{LOCALIZATION.saasBasicDesc}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, saasPlan === 'PREMIUM' && styles.planCardSelected]}
            onPress={() => setSaasPlan('PREMIUM')}
          >
            <Text style={[styles.planName, saasPlan === 'PREMIUM' && styles.planTextSelected]}>
              {LOCALIZATION.saasPremiumTitle}
            </Text>
            <Text style={styles.planDesc}>{LOCALIZATION.saasPremiumDesc}</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Form Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleOnboard}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.submitBtnText}>{LOCALIZATION.submitBtn}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
  },
  headerSubTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 40,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputHelper: {
    fontSize: 11,
    color: COLORS.accent,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  locationBtn: {
    backgroundColor: COLORS.border,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  locationBtnSuccess: {
    backgroundColor: '#064E3B',
    borderColor: COLORS.primary,
  },
  locationBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  coordsText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  planSelector: {
    flexDirection: 'column',
    marginTop: 4,
  },
  planCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#064E3B',
  },
  planName: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  planTextSelected: {
    color: COLORS.accent,
  },
  planDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  successText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  successSubText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  receiptContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 32,
  },
  receiptLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  receiptValue: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dashboardBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  dashboardBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
