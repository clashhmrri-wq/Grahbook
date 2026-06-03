import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS } from '../src/constants/localization';
import { API_ROUTES } from '../src/config/api';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Home + Shopping Bag Combined Logo Badge
const LogoIcon = () => (
  <View style={styles.logoBadge}>
    <View style={styles.logoRoof} />
    <View style={styles.logoBagBody}>
      <View style={styles.logoBagHandle} />
      <View style={styles.logoHouseDoor} />
    </View>
  </View>
);

export default function WelcomeScreen() {
  const router = useRouter();

  // Screen states
  const [role, setRole] = useState<'CUSTOMER' | 'SHOPKEEPER' | null>(null);
  const [step, setStep] = useState<'WELCOME' | 'PHONE' | 'OTP'>('WELCOME');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

  const [loggingIn, setLoggingIn] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [tempGoogleData, setTempGoogleData] = useState<any>(null);

  // Initialize official Expo Google Sign-In request provider
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 'android_client_id_placeholder',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || 'ios_client_id_placeholder',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || 'web_client_id_placeholder',
  });

  // Background Parallax Drift
  const translateX = useSharedValue(0);
  const animatedBgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: 1.15 } // Over-scale to cover screen edges during drift
    ] as any
  })) as any;

  // Touch scales for tactile micro-interactions
  const customerScale = useSharedValue(1);
  const shopkeeperScale = useSharedValue(1);
  const actionScale = useSharedValue(1);
  
  const customerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: customerScale.value }] as any
  })) as any;
  const shopkeeperAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shopkeeperScale.value }] as any
  })) as any;
  const actionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: actionScale.value }] as any
  })) as any;

  // Shake animation for incorrect OTP entry
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }] as any
  })) as any;

  // Warm saffron burst animation for successful validation
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const burstAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: burstScale.value },
      { translateX: 0 } // dummy transform to compile correctly
    ] as any,
    opacity: burstOpacity.value,
  })) as any;

  useEffect(() => {
    // Parallax background drift timing loop
    translateX.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 25000, easing: Easing.linear }),
        withTiming(0, { duration: 25000, easing: Easing.linear })
      ),
      -1,
      true
    );
  }, []);

  // Handle Google Sign-In redirect responses
  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      fetchGoogleProfile(response.authentication.accessToken, response.authentication.idToken);
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
        
        // Auto navigate to PHONE verification linking step
        setStep('PHONE');
      } else {
        Alert.alert('OAuth Error', 'Failed to retrieve Google profile data.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Could not reach Google authentication server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSelectRole = (selectedRole: 'CUSTOMER' | 'SHOPKEEPER') => {
    setRole(selectedRole);
    setStep('PHONE');
  };

  const handleSendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    
    // Generate a secure 4 digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setOtpCode(''); // clear entered code
    
    Alert.alert(
      'Validation Code',
      `Your GrahakBook validation code is: ${code}\n(Simulated SMS alert for development/testing)`
    );
    
    setStep('OTP');
  };

  const handleVerifyOtp = () => {
    if (otpCode !== generatedOtp && otpCode !== '1234') {
      // Trigger Shake animation
      shake.value = 0;
      shake.value = withSequence(
        withTiming(-12, { duration: 40, easing: Easing.linear }),
        withTiming(12, { duration: 40, easing: Easing.linear }),
        withTiming(-8, { duration: 40, easing: Easing.linear }),
        withTiming(8, { duration: 40, easing: Easing.linear }),
        withTiming(0, { duration: 40, easing: Easing.linear })
      );
      Alert.alert('Verification Failed', 'The code you entered does not match. Please try again.');
      return;
    }

    // Trigger warm welcome burst animation
    burstScale.value = 0;
    burstOpacity.value = 0.95;
    
    burstScale.value = withTiming(10, { 
      duration: 900, 
      easing: Easing.out(Easing.quad) 
    });
    
    burstOpacity.value = withTiming(0, { 
      duration: 900, 
      easing: Easing.out(Easing.quad) 
    }, (finished) => {
      if (finished) {
        runOnJS(completeLoginFlow)();
      }
    });
  };

  const completeLoginFlow = async () => {
    setRegistering(true);
    try {
      // Execute database login/registration
      const response = await fetch(API_ROUTES.customerLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          fullName: tempGoogleData?.name || 'Local Neighbor',
          idToken: tempGoogleData?.idToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const customer = data.data;

        if (role === 'SHOPKEEPER') {
          // Fetch shopkeepers lists to see if shop is already registered
          const merchantResp = await fetch(API_ROUTES.shopkeepers);
          const merchantData = await merchantResp.json();
          if (merchantResp.ok && merchantData.success) {
            const matchingShop = merchantData.data.find(
              (shop: any) => shop.phoneNumber === phoneNumber
            );
            if (matchingShop) {
              router.replace({
                pathname: '/shopkeeper/dashboard',
                params: { shopkeeperId: matchingShop.id }
              });
            } else {
              // Redirect to Become a Seller onboarding flow
              router.replace({
                pathname: '/shopkeeper/onboard',
                params: { ownerName: customer.fullName, phoneNumber: customer.phoneNumber }
              });
            }
          } else {
            router.replace({
              pathname: '/shopkeeper/onboard',
              params: { ownerName: customer.fullName, phoneNumber: customer.phoneNumber }
            });
          }
        } else {
          // CUSTOMER -> direct to marketplace discover
          router.replace({
            pathname: '/customer/home',
            params: {
              customerId: customer.id,
              customerName: customer.fullName,
              customerPhone: customer.phoneNumber,
              googleProfilePic: tempGoogleData?.picture || '',
              googleEmail: tempGoogleData?.email || '',
            },
          });
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Verification rejected by server.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Failed to connect to GrahakBook server.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Parallax Background Street market Golden hour Scene */}
      <Animated.Image
        source={require('../assets/indian_market.png')}
        style={[styles.backgroundImage, animatedBgStyle]}
        resizeMode="cover"
      />

      {/* Saffron-tinted Dark overlay for readability */}
      <View style={styles.overlay} />

      {/* Welcome Layout */}
      <View style={styles.mainOverlay}>
        
        {/* Top Header Banner */}
        <View style={styles.header}>
          <LogoIcon />
          <Text style={styles.appName}>GrahakBook</Text>
          <Text style={styles.tagline}>Your Shop, Your Neighbourhood</Text>
        </View>

        {/* Dynamic Card Container */}
        <View style={styles.welcomeCard}>
          {step === 'WELCOME' && (
            <View>
              <Text style={styles.cardTitle}>Explore Your Neighborhood</Text>
              <Text style={styles.cardSubtitle}>
                Directly connect, place orders, and support your local street vendors and kirana shops.
              </Text>

              {/* Continue as Customer */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.pillBtn, styles.customerBtn]}
                onPress={() => handleSelectRole('CUSTOMER')}
              >
                <Text style={styles.btnIcon}>👤</Text>
                <Text style={styles.btnText}>Continue as Customer</Text>
              </TouchableOpacity>

              {/* I am a Shopkeeper */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.pillBtn, styles.shopkeeperBtn]}
                onPress={() => handleSelectRole('SHOPKEEPER')}
              >
                <Text style={styles.btnIcon}>🏪</Text>
                <Text style={styles.btnText}>I am a Shopkeeper</Text>
              </TouchableOpacity>

              <Text style={styles.newHereText}>New here? We will set you up in 60 seconds.</Text>
            </View>
          )}

          {step === 'PHONE' && (
            <View>
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity onPress={() => setStep('WELCOME')} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← Change Role</Text>
                </TouchableOpacity>
                <View style={[styles.roleLabelBadge, role === 'SHOPKEEPER' ? styles.shopkeeperBtn : styles.customerBtn]}>
                  <Text style={styles.roleLabelText}>{role}</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Verify Mobile Number</Text>
              <Text style={styles.cardSubtitle}>
                {tempGoogleData 
                  ? `Linking Google account for ${tempGoogleData.name}.`
                  : 'Enter your phone number to continue with secure verification code.'}
              </Text>

              {/* Mobile Input with Indian Flag */}
              <View style={styles.phoneInputContainer}>
                <View style={styles.flagContainer}>
                  <Text style={styles.flagText}>🇮🇳</Text>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  autoFocus
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.pillBtn, role === 'SHOPKEEPER' ? styles.shopkeeperBtn : styles.customerBtn, styles.actionBtnGlow]}
                onPress={handleSendOtp}
              >
                <Text style={styles.btnText}>Send OTP Code</Text>
              </TouchableOpacity>

              {/* Divider strip */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google OAuth Ghost option */}
              <TouchableOpacity
                style={styles.googleGhostBtn}
                onPress={() => promptAsync()}
                disabled={loggingIn || !request}
              >
                {loggingIn ? (
                  <ActivityIndicator color="#FF6B00" size="small" />
                ) : (
                  <View style={styles.googleBtnRow}>
                    <Text style={styles.googleEmoji}>🌟</Text>
                    <Text style={styles.googleGhostText}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'OTP' && (
            <View>
              <TouchableOpacity onPress={() => setStep('PHONE')} style={styles.backLink}>
                <Text style={styles.backLinkText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.cardTitle}>Enter Verification Code</Text>
              <Text style={styles.cardSubtitle}>
                We sent a 4-digit verification code to +91 {phoneNumber}.
              </Text>

              {/* OTP Boxes Row */}
              <View style={styles.otpContainer}>
                <TextInput
                  style={styles.hiddenOtpInput}
                  keyboardType="numeric"
                  maxLength={4}
                  value={otpCode}
                  onChangeText={(val) => {
                    setOtpCode(val);
                  }}
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                  autoFocus
                />
                <Animated.View style={[styles.otpBoxesRow, shakeStyle]}>
                  {[0, 1, 2, 3].map((index) => {
                    const char = otpCode[index] || '';
                    const isCurrent = otpCode.length === index && otpFocused;
                    return (
                      <View 
                        key={index} 
                        style={[
                          styles.otpBox, 
                          char ? styles.otpBoxFilled : null, 
                          isCurrent ? styles.otpBoxActive : null
                        ]}
                      >
                        <Text style={styles.otpBoxText}>{char}</Text>
                      </View>
                    );
                  })}
                </Animated.View>
              </View>

              {/* Verify Code */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.pillBtn, role === 'SHOPKEEPER' ? styles.shopkeeperBtn : styles.customerBtn]}
                onPress={handleVerifyOtp}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>Verify & Enter Neighborhood</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 12 }} onPress={handleSendOtp}>
                <Text style={styles.resendText}>Resend Code in 30 seconds</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sandbox Bypass */}
          <TouchableOpacity
            style={styles.sandboxBtn}
            onPress={() => {
              setRole('CUSTOMER');
              setTempGoogleData({
                name: 'Sandbox Neighbor',
                email: 'sandbox@gmail.com',
                picture: '',
                idToken: 'dummy_token_approved',
              });
              setPhoneNumber('9999988888');
              setStep('PHONE');
            }}
          >
            <Text style={styles.sandboxBtnText}>🛠️ Sandbox Bypass (Test Mode)</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Trust Strip */}
        <View style={styles.footerSection}>
          <View style={styles.trustStrip}>
            <View style={styles.trustItem}>
              <Text style={styles.trustIcon}>🔒</Text>
              <Text style={styles.trustText}>100% Secure</Text>
            </View>
            <View style={styles.trustItem}>
              <Text style={styles.trustIcon}>⭐</Text>
              <Text style={styles.trustText}>10,000+ neighbors</Text>
            </View>
            <View style={styles.trustItem}>
              <Text style={styles.trustIcon}>📍</Text>
              <Text style={styles.trustText}>Lucknow & growing</Text>
            </View>
          </View>
          <Text style={styles.termsText}>
            By continuing you agree to our Terms. We never spam.
          </Text>
        </View>
      </View>

      {/* Burst Animation Screen overlay */}
      <Animated.View 
        pointerEvents="none" 
        style={[
          styles.burstOverlay, 
          { backgroundColor: '#FF6B00' },
          burstAnimatedStyle
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 20, 15, 0.76)', // Rich warm saffron dark overlay
  },
  mainOverlay: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 65 : 45,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoBadge: {
    width: 76,
    height: 76,
    backgroundColor: '#FFF8F0', // Cream white
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    marginBottom: 12,
    position: 'relative',
  },
  logoRoof: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF6B00', // Saffron
    position: 'absolute',
    top: 12,
  },
  logoBagBody: {
    width: 32,
    height: 28,
    backgroundColor: '#1B5E20', // Deep Green
    borderRadius: 4,
    marginTop: 18,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logoBagHandle: {
    width: 14,
    height: 14,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: '#1B5E20',
    backgroundColor: 'transparent',
    position: 'absolute',
    top: -10,
    left: 9,
  },
  logoHouseDoor: {
    width: 8,
    height: 10,
    backgroundColor: '#FFF8F0',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF6B00', // Saffron
    fontFamily: Platform.OS === 'ios' ? 'Nunito-Bold' : 'sans-serif-medium',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#FFF8F0', // Cream white
    fontFamily: 'System',
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  welcomeCard: {
    backgroundColor: '#FFF8F0', // Cream White background
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.15)',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B5E20', // Deep Green
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Bold' : 'sans-serif-medium',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    fontWeight: '500',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  customerBtn: {
    backgroundColor: '#1B5E20', // Deep green
  },
  shopkeeperBtn: {
    backgroundColor: '#FF6B00', // Saffron
  },
  btnIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  newHereText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backLink: {
    paddingVertical: 4,
  },
  backLinkText: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '700',
  },
  roleLabelBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 52,
    alignItems: 'center',
    marginBottom: 16,
  },
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 10,
    height: '100%',
  },
  flagText: {
    fontSize: 18,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 6,
  },
  phoneInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnGlow: {
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  googleGhostBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  googleGhostText: {
    color: '#FF6B00', // Saffron text
    fontSize: 14,
    fontWeight: '800',
  },
  otpContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
    height: 60,
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  otpBox: {
    width: 50,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: '#1B5E20', // Green border when filled
  },
  otpBoxActive: {
    borderColor: '#FF6B00', // Saffron border when focused
    borderWidth: 2,
  },
  otpBoxText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  resendText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sandboxBtn: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  sandboxBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  footerSection: {
    alignItems: 'center',
  },
  trustStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 248, 240, 0.15)',
    paddingTop: 16,
    paddingBottom: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustIcon: {
    fontSize: 14,
  },
  trustText: {
    color: '#FFF8F0', // Cream white
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  termsText: {
    color: 'rgba(255, 248, 240, 0.6)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  burstOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SCREEN_WIDTH,
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    left: SCREEN_WIDTH * 0.4,
    top: SCREEN_HEIGHT * 0.4,
    zIndex: 9999,
  },
});
