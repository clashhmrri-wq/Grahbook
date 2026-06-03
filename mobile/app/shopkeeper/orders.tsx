import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/localization';
import { API_ROUTES } from '../../src/config/api';

export default function ShopkeeperOrders() {
  const router = useRouter();
  const { shopkeeperId } = useLocalSearchParams();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // OTP Verification modal states
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const fetchOrders = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch(API_ROUTES.shopkeeperOrders(shopkeeperId as string));
      const data = await response.json();
      if (response.ok && data.success) {
        setOrders(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch shop orders.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Connection Error', 'Could not load store orders. Please check backend status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (shopkeeperId) {
      fetchOrders();
    }
  }, [shopkeeperId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  // Update order status (ACCEPTED, PREPARING, READY, CANCELLED)
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const response = await fetch(API_ROUTES.updateOrderStatus(orderId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Success', `Order status updated to ${nextStatus}.`);
        fetchOrders(false); // Refresh
      } else {
        Alert.alert('Error', data.message || 'Failed to update order status.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to communicate status updates.');
    }
  };

  // Open OTP verification modal
  const openOtpModal = (order: any) => {
    setSelectedOrder(order);
    setOtpInput('');
    setOtpModalVisible(true);
  };

  // Complete Order via Secure OTP Verification
  const handleVerifyOtp = async () => {
    if (!selectedOrder) return;
    if (!/^\d{4}$/.test(otpInput)) {
      Alert.alert('Invalid OTP', 'Please enter a valid 4-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch(API_ROUTES.completeOrder(selectedOrder.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: otpInput }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Verified! ✓', 'Handoff OTP matches. Order has been successfully COMPLETED.');
        setOtpModalVisible(false);
        fetchOrders(false); // Refresh list
      } else {
        Alert.alert('Verification Failed', data.message || 'OTP does not match. Try again.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Connection failed during verification.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Helper to get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return '#9CA3AF'; // Gray
      case 'ACCEPTED':
        return '#3B82F6'; // Blue
      case 'PREPARING':
        return '#F59E0B'; // Orange/Yellow
      case 'READY':
        return '#EC4899'; // Pink/Purple
      case 'COMPLETED':
        return '#10B981'; // Green
      case 'CANCELLED':
        return '#EF4444'; // Red
      default:
        return '#F3F4F6';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading store orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Header Banner */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>◀ Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📦 Order Dispatch Manager</Text>
        <Text style={styles.subtitle}>Accept orders and verify handoff codes below.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No orders received yet.</Text>
            <Text style={styles.emptySubText}>
              Ensure neighborhood customers register nearby to discover and purchase from your catalog.
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const statusColor = getStatusColor(order.status);

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.customerName}>👤 {order.customer.fullName}</Text>
                    <Text style={styles.customerPhone}>📞 WhatsApp: {order.customer.phoneNumber}</Text>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{order.status}</Text>
                  </View>
                </View>

                {/* Handoff preferences */}
                <Text style={styles.deliveryPreference}>
                  Method: {order.deliveryType === 'SELF_PICKUP' ? '🚶 Self Pickup' : '🏠 Home Delivery'}
                </Text>
                {order.deliveryType === 'HOME_DELIVERY' && order.customer.address ? (
                  <Text style={styles.deliveryAddress}>Address: {order.customer.address}</Text>
                ) : null}

                {/* Items listing */}
                <View style={styles.itemsBox}>
                  {order.items.map((item: any) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemDetail}>
                        {item.quantity} x {item.product.name}
                      </Text>
                      <Text style={styles.itemCost}>₹{(item.quantity * parseFloat(item.price)).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLbl}>Total Earnings</Text>
                    <Text style={styles.totalVal}>₹{parseFloat(order.totalAmount).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Action Buttons based on Status */}
                <View style={styles.actionButtonsRow}>
                  {order.status === 'RECEIVED' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnAccept]}
                      onPress={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                    >
                      <Text style={styles.btnText}>Accept Order</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrepare]}
                      onPress={() => handleUpdateStatus(order.id, 'PREPARING')}
                    >
                      <Text style={styles.btnText}>Start Preparing</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'PREPARING' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnReady]}
                      onPress={() => handleUpdateStatus(order.id, 'READY')}
                    >
                      <Text style={styles.btnText}>Ready for Dispatch</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'READY' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnComplete]}
                      onPress={() => openOtpModal(order)}
                    >
                      <Text style={styles.btnText}>Verify Handoff OTP</Text>
                    </TouchableOpacity>
                  )}

                  {/* Cancel Button (available for non-final states) */}
                  {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnCancel]}
                      onPress={() =>
                        Alert.alert('Confirm Cancel', 'Are you sure you want to cancel this order?', [
                          { text: 'No' },
                          { text: 'Yes, Cancel', onPress: () => handleUpdateStatus(order.id, 'CANCELLED') },
                        ])
                      }
                    >
                      <Text style={styles.btnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* OTP verification Modal */}
      <Modal visible={otpModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>🛡️ Secure OTP Verification</Text>
            <Text style={styles.modalSubheading}>
              Ask the customer for the 4-digit code shown on their order receipt.
            </Text>

            <TextInput
              style={styles.otpInput}
              keyboardType="numeric"
              maxLength={4}
              placeholder="e.g. 1789"
              placeholderTextColor={COLORS.textMuted}
              value={otpInput}
              onChangeText={setOtpInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnClose]}
                onPress={() => setOtpModalVisible(false)}
                disabled={verifyingOtp}
              >
                <Text style={styles.modalBtnCloseText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnVerify]}
                onPress={handleVerifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={styles.modalBtnVerifyText}>Verify & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
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
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  customerPhone: {
    color: COLORS.textMuted,
    fontSize: 12,
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
    fontWeight: 'bold',
  },
  deliveryPreference: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  deliveryAddress: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemsBox: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  itemDetail: {
    color: COLORS.text,
    fontSize: 12,
  },
  itemCost: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLbl: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  totalVal: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  btnAccept: {
    backgroundColor: '#3B82F6',
  },
  btnPrepare: {
    backgroundColor: '#F59E0B',
  },
  btnReady: {
    backgroundColor: '#EC4899',
  },
  btnComplete: {
    backgroundColor: COLORS.primary,
  },
  btnText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnCancel: {
    flex: 0.4,
    borderWidth: 1,
    borderColor: COLORS.error,
    justifyContent: 'center',
  },
  btnCancelText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '85%',
    padding: 24,
    alignItems: 'center',
  },
  modalHeading: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubheading: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.accent,
    borderRadius: 8,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    padding: 10,
    width: '60%',
    letterSpacing: 8,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalBtnClose: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnCloseText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  modalBtnVerify: {
    backgroundColor: COLORS.primary,
  },
  modalBtnVerifyText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
});
