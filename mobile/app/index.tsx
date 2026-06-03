import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { COLORS } from '../src/constants/localization';
import { API_ROUTES } from '../src/config/api';

WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState(false);

  // First-time user setup modal
  const [setupVisible, setSetupVisible] = useState(false);
  const [tempGoogleData, setTempGoogleData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [registering, setRegistering] = useState(false);

  // Initialize official Expo Google Sign-In request provider
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 'android_client_id_placeholder',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || 'ios_client_id_placeholder',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || 'web_client_id_placeholder',
  });

  // Handle Google OAuth callback ticket response
  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      const idToken = response.authentication.idToken;
      // Fetch user profile info from Google UserInfo endpoint using the token
      fetchGoogleProfile(response.authentication.accessToken, idToken);
    }
  }, [response]);

  const fetchGoogleProfile = async (accessToken: string, idToken: string | undefined) => {
    setLoggingIn(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await userInfoResponse.json();

      if (userInfoResponse.ok && profile) {
        setTempGoogleData({
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          idToken,
        });
        
        // Prompt first-time user to verify phone number for WhatsApp alerts integration
        setSetupVisible(true);
      } else {
        Alert.alert('OAuth Error', 'Failed to retrieve Google profile metadata.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Could not reach Google authentication server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegisterAccount = async () => {
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setRegistering(true);
    try {
      const response = await fetch(API_ROUTES.customerLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          fullName: tempGoogleData?.name,
          idToken: tempGoogleData?.idToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSetupVisible(false);
        // Direct route to the unified marketplace discovery home
        router.replace({
          pathname: '/customer/home',
          params: {
            customerId: data.data.id,
            customerName: data.data.fullName,
            customerPhone: data.data.phoneNumber,
            googleProfilePic: tempGoogleData?.picture || '',
            googleEmail: tempGoogleData?.email || '',
          },
        });
      } else {
        Alert.alert('Registration Failed', data.message || 'Verification rejected by server.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Failed to complete registration checkout.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.logoText}>🏪 GrahakBook</Text>
        <Text style={styles.tagline}>Hyperlocal Community Commerce Platform</Text>
      </View>

      <View style={styles.cardContainer}>
        <Text style={styles.introHeading}>Connect with Neighborhood Kiranas</Text>
        <Text style={styles.introText}>
          Discover local grocery stores within a 2-3 km radius. Complete secure digital checkouts directly with neighborhood merchants.
        </Text>

        <TouchableOpacity 
          style={styles.googleBtn}
          onPress={() => promptAsync()}
          disabled={loggingIn || !request}
        >
          <View style={styles.googleIconBox}>
            <Text style={styles.googleIconText}>G</Text>
          </View>
          {loggingIn ? (
            <ActivityIndicator color="#1F2937" size="small" />
          ) : (
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>

        {/* Developer Sandbox Bypass Button */}
        <TouchableOpacity
          style={styles.sandboxBtn}
          onPress={async () => {
            // Bypass OAuth for local sandbox test configurations
            const dummyIdToken = 'dummy_token_approved';
            setTempGoogleData({
              name: 'Test Customer',
              email: 'testcustomer@gmail.com',
              picture: 'https://lh3.googleusercontent.com/a/default-user',
              idToken: dummyIdToken,
            });
            setSetupVisible(true);
          }}
        >
          <Text style={styles.sandboxBtnText}>🛠️ Dev Sandbox Bypass (OAuth Bypass)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for Indian Kirana Stores</Text>
        <Text style={styles.commissionText}>SaaS-Enabled Distribution • Zero Service Fee Commissions</Text>
      </View>

      {/* Account Verification Mobile Setup Sheet */}
      <Modal visible={setupVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📱 Link Mobile Number</Text>
            <Text style={styles.modalSubtitle}>
              Welcome, {tempGoogleData?.name}! Please enter your WhatsApp number to receive real-time order alerts.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WhatsApp Mobile Number</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., 9876543210"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <TouchableOpacity 
              style={styles.verifyBtn} 
              onPress={handleRegisterAccount}
              disabled={registering}
            >
              {registering ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Complete Setup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F4F6F8', // Fresh Light Gray Background
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0C831F', // Brand Organic Green
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '700',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF', // Clean White Elevated Card
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  introHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  introText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
    fontWeight: '500',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  googleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  googleBtnText: {
    color: '#1F2937',
    fontWeight: '800',
    fontSize: 14,
  },
  sandboxBtn: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  sandboxBtnText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  commissionText: {
    fontSize: 11,
    color: '#0C831F',
    marginTop: 4,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  inputGroup: {
    marginVertical: 20,
  },
  inputLabel: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyBtn: {
    backgroundColor: '#0C831F',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
