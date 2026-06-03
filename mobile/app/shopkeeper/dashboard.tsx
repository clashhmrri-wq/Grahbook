import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/localization';

export default function ShopkeeperDashboard() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Dukaan Dashboard</Text>
        <Text style={styles.subtitle}>Manage your orders, catalog and ONDC status.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ONDC Network status</Text>
        <Text style={styles.cardStatusText}>Status: Offline (Pending Catalogs)</Text>
        <Text style={styles.hintText}>
          Prathamiq catalog banayein taaki ONDC gateway par register ho sakein.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>0</Text>
          <Text style={styles.statLbl}>Aaj ke Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>₹0.00</Text>
          <Text style={styles.statLbl}>Aaj ki Kamai</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.backBtnText}>Log Out (लॉग आउट)</Text>
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
    marginBottom: 24,
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
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  cardStatusText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 6,
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  statVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLbl: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  backBtn: {
    borderColor: COLORS.error,
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
});
