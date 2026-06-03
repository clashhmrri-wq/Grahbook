import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/localization';

export default function CustomerHome() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛍️ Grahak Corner</Text>
        <Text style={styles.subtitle}>Discover nearby kirana stores in your 2-3km neighborhood.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dukaan Khojein (दुकान खोजें)</Text>
        <Text style={styles.cardText}>
          Aapki locations capture karke aas-paas ki verified kiranon ki list yahan dikhegi.
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.backBtnText}>Vapas Jayein (वापस जाएं)</Text>
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
    marginBottom: 40,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 6,
    lineHeight: 20,
  },
  backBtn: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
