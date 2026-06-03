import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/constants/localization';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.logoText}>📦 GrahakBook</Text>
        <Text style={styles.tagline}>Your Local Neighborhood Commerce Platform</Text>
      </View>

      <View style={styles.cardContainer}>
        <Text style={styles.introHeading}>Welcome to GrahakBook!</Text>
        <Text style={styles.introText}>
          Digitize your Kirana store. Connect directly with customers within 2-3 kms. Zero high commissions.
        </Text>

        <TouchableOpacity 
          style={styles.roleButtonShop}
          onPress={() => router.push('/shopkeeper/onboard')}
        >
          <Text style={styles.buttonEmoji}>🏪</Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>I am a Shopkeeper</Text>
            <Text style={styles.buttonSubtitle}>Register & Manage Your Store</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.roleButtonCust}
          onPress={() => router.push('/customer/home')}
        >
          <Text style={styles.buttonEmoji}>🛍️</Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>I am a Customer</Text>
            <Text style={styles.buttonSubtitle}>Browse & Order From Nearby Shops</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for Indian Kirana Stores</Text>
        <Text style={styles.commissionText}>3-5% Order Fee • ₹299 SaaS • No Hidden Charges</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  taglineHindi: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  introHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  roleButtonShop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  roleButtonCust: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  buttonSubtitle: {
    fontSize: 12,
    color: '#D1FAE5',
    marginTop: 2,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  commissionText: {
    fontSize: 11,
    color: COLORS.accent,
    marginTop: 4,
    fontWeight: '500',
  },
});
