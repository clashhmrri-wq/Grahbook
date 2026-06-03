import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/localization';
import { API_ROUTES } from '../../src/config/api';

export default function CustomerOrders() {
  const router = useRouter();
  const { customerId, customerName } = useLocalSearchParams();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch(API_ROUTES.customerOrders(customerId as string));
      const data = await response.json();
      if (response.ok && data.success) {
        setOrders(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch order history.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Connection Error', 'Could not load your orders. Check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchOrders();
    }
  }, [customerId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' }; // Soft Gray
      case 'ACCEPTED':
        return { bg: '#EBF5FF', text: '#2563EB', border: '#BFDBFE' }; // Blue
      case 'PREPARING':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7' }; // Yellow
      case 'READY':
        return { bg: '#FDF2F8', text: '#DB2777', border: '#FBCFE8' }; // Pink
      case 'COMPLETED':
        return { bg: '#ECFDF5', text: '#0C831F', border: '#A7F3D0' }; // Green
      case 'CANCELLED':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }; // Red
      default:
        return { bg: '#F9FAFB', text: '#1F2937', border: '#E5E7EB' };
    }
  };

  const handleContactMerchant = (phone: string, shopName: string, orderId: string) => {
    const text = `Hello ${shopName}, I'm checking in on my GrahakBook Order #${orderId.substring(0, 8)}. Please let me know the status!`;
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp.');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Fetching your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Header (Vibrant Yellow Banner) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>◀ Shop profile</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 My Order History</Text>
        <Text style={styles.subtitle}>Account: {customerName || 'Guest Customer'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You haven't placed any orders yet!</Text>
            <Text style={styles.emptySubText}>Select items from nearby shops and complete checkout to see them here.</Text>
          </View>
        ) : (
          orders.map((order) => {
            const statusStyle = getStatusStyle(order.status);
            const showOTP = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Shop & Status header */}
                <View style={styles.orderCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>🏪 {order.shopkeeper.shopName}</Text>
                    <Text style={styles.orderDate}>
                      Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN')} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{order.status}</Text>
                  </View>
                </View>

                {/* Items summary */}
                <View style={styles.itemsSection}>
                  {order.items.map((item: any) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemDetail}>
                        {item.quantity} x {item.product.name}
                      </Text>
                      <Text style={styles.itemPrice}>₹{(item.quantity * parseFloat(item.price)).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.divider} />

                {/* Totals info */}
                <View style={styles.totalsRow}>
                  <Text style={styles.deliveryMethod}>
                    Handoff: {order.deliveryType === 'SELF_PICKUP' ? '🚶 Self Pickup' : '🏠 Home Delivery'}
                  </Text>
                  <Text style={styles.totalAmount}>Total Paid: ₹{parseFloat(order.totalAmount).toFixed(2)}</Text>
                </View>

                {/* Verification OTP for secure handoff */}
                {showOTP && (
                  <View style={styles.otpCard}>
                    <Text style={styles.otpLabel}>Verification OTP for Shopowner</Text>
                    <Text style={styles.otpValue}>{order.otpCode || '1789'}</Text>
                    <Text style={styles.otpHelp}>
                      Show this 4-digit verification code to the merchant upon delivery/pickup.
                    </Text>
                  </View>
                )}

                {/* Contact merchant button */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.contactBtn}
                    onPress={() =>
                      handleContactMerchant(
                        order.shopkeeper.phoneNumber,
                        order.shopkeeper.shopName,
                        order.id
                      )
                    }
                  >
                    <Text style={styles.contactBtnText}>💬 Message Store via WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 45,
    paddingBottom: 18,
    backgroundColor: COLORS.accent, // Yellow Header
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: '#1F2937',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    color: '#1F2937',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 10,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginTop: 40,
    elevation: 1,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  orderCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  shopName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  orderDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemsSection: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  itemDetail: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  itemPrice: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryMethod: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  totalAmount: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  otpCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  otpLabel: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  otpValue: {
    color: '#D97706',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    marginVertical: 4,
  },
  otpHelp: {
    color: '#6B7280',
    fontSize: 10,
    textAlign: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  contactBtn: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  contactBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
