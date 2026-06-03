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

  // Helper to get status color
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return { bg: '#374151', text: '#9CA3AF' }; // Gray
      case 'ACCEPTED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' }; // Blue
      case 'PREPARING':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' }; // Orange/Yellow
      case 'READY':
        return { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899' }; // Pink
      case 'COMPLETED':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' }; // Green
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' }; // Red
      default:
        return { bg: '#2D2D34', text: '#F3F4F6' };
    }
  };

  // Trigger manual WhatsApp contact message
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
      {/* Top Banner Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>◀ Shop Detail</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 My Order History</Text>
        <Text style={styles.subtitle}>Logged in as: {customerName || 'Guest'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You haven't placed any orders yet!</Text>
            <Text style={styles.emptySubText}>Browse items and check out to see your orders here.</Text>
          </View>
        ) : (
          orders.map((order) => {
            const statusStyle = getStatusStyle(order.status);
            const showOTP = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Header: Shop & Status */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.shopName}>🏪 {order.shopkeeper.shopName}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN')} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{order.status}</Text>
                  </View>
                </View>

                {/* Items Summary list */}
                <View style={styles.itemsSection}>
                  {order.items.map((item: any) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemQtyName}>
                        {item.quantity} x {item.product.name}
                      </Text>
                      <Text style={styles.itemPrice}>₹{(item.quantity * parseFloat(item.price)).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.divider} />

                {/* Total & Handoff Type */}
                <View style={styles.totalsRow}>
                  <Text style={styles.deliveryText}>
                    Handoff: {order.deliveryType === 'SELF_PICKUP' ? '🚶 Self Pickup' : '🏠 Home Delivery'}
                  </Text>
                  <Text style={styles.totalAmount}>Total: ₹{parseFloat(order.totalAmount).toFixed(2)}</Text>
                </View>

                {/* Secure Handoff OTP display */}
                {showOTP && (
                  <View style={styles.otpSection}>
                    <Text style={styles.otpLabel}>Verification OTP for Storeowner</Text>
                    <Text style={styles.otpValue}>{order.otpCode || '1789'}</Text>
                    <Text style={styles.otpHelp}>
                      Present this secure OTP to the shopkeeper upon receiving the items.
                    </Text>
                  </View>
                )}

                {/* Actions */}
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
                    <Text style={styles.contactBtnText}>💬 WhatsApp Support</Text>
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
    paddingBottom: 16,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
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
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginTop: 40,
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
  },
  orderCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
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
    fontWeight: 'bold',
  },
  orderDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemsSection: {
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  itemQtyName: {
    color: COLORS.text,
    fontSize: 13,
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
  deliveryText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  totalAmount: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: 'bold',
  },
  otpSection: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  otpLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  otpValue: {
    color: COLORS.accent,
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 4,
    letterSpacing: 4,
  },
  otpHelp: {
    color: COLORS.text,
    fontSize: 10,
    textAlign: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  contactBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  contactBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
