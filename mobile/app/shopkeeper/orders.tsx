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
        fetchOrders(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to update order status.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to communicate status updates.');
    }
  };

  const openOtpModal = (order: any) => {
    setSelectedOrder(order);
    setOtpInput('');
    setOtpModalVisible(true);
  };

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
        Alert.alert('Verified! ✓', 'Handoff OTP matches. Order completed successfully!');
        setOtpModalVisible(false);
        fetchOrders(false);
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return { bg: '#2D2D34', text: '#9CA3AF', label: 'Received' };
      case 'ACCEPTED':
        return { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', label: 'Accepted' };
      case 'PREPARING':
        return { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Preparing Saman' };
      case 'READY':
        return { bg: 'rgba(236,72,153,0.15)', text: '#EC4899', label: 'Ready' };
      case 'COMPLETED':
        return { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Completed' };
      case 'CANCELLED':
        return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Cancelled' };
      default:
        return { bg: '#2D2D34', text: '#F3F4F6', label: status };
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.bgDark }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading store orders...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: COLORS.bgDark }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>◀ Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📦 Active Dispatches</Text>
        <Text style={styles.subtitle}>Fulfill incoming orders and verify OTP codes.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {orders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
            <Text style={styles.emptyText}>No orders received yet.</Text>
            <Text style={styles.emptySubText}>
              Ensure customer coordinates match your location radius to enable store discovery.
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const statusStyle = getStatusStyle(order.status);

            return (
              <View key={order.id} style={[styles.orderCard, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>👤 {order.customer.fullName}</Text>
                    <Text style={styles.customerPhone}>📞 WhatsApp: {order.customer.phoneNumber}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                  </View>
                </View>

                {/* Handoff Type */}
                <Text style={styles.deliveryPreference}>
                  Preference: {order.deliveryType === 'SELF_PICKUP' ? '🚶 Customer Pickup' : '🏠 Home Delivery'}
                </Text>
                {order.deliveryType === 'HOME_DELIVERY' && order.customer.address ? (
                  <Text style={styles.deliveryAddress}>Address: {order.customer.address}</Text>
                ) : null}

                {/* Items box */}
                <View style={[styles.itemsBox, { backgroundColor: COLORS.bgDark }]}>
                  {order.items.map((item: any) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemDetail}>
                        {item.quantity} x {item.product.name}
                      </Text>
                      <Text style={styles.itemCost}>₹{(item.quantity * parseFloat(item.price)).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[styles.divider, { backgroundColor: COLORS.borderDark }]} />
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLbl}>Payout Value</Text>
                    <Text style={styles.totalVal}>₹{parseFloat(order.totalAmount).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
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
                      <Text style={styles.btnText}>Start Packing</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'PREPARING' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnReady]}
                      onPress={() => handleUpdateStatus(order.id, 'READY')}
                    >
                      <Text style={styles.btnText}>Mark Packed & Ready</Text>
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

                  {/* Cancel Button */}
                  {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnCancel]}
                      onPress={() =>
                        Alert.alert('Confirm Cancel', 'Cancel this order from your dispatch queue?', [
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
          <View style={[styles.modalContent, { backgroundColor: COLORS.cardDark, borderColor: COLORS.borderDark }]}>
            <Text style={styles.modalHeading}>🛡️ Verify Handoff Code</Text>
            <Text style={styles.modalSubheading}>
              Ask the customer for the 4-digit code shown on their order receipt.
            </Text>

            <TextInput
              style={[styles.otpInput, { backgroundColor: COLORS.bgDark, color: COLORS.accent, borderColor: COLORS.borderDark }]}
              keyboardType="numeric"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="#4B5563"
              value={otpInput}
              onChangeText={setOtpInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnClose, { borderColor: COLORS.borderDark }]}
                onPress={() => setOtpModalVisible(false)}
                disabled={verifyingOtp}
              >
                <Text style={styles.modalBtnCloseText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnVerify]}
                onPress={handleVerifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color={COLORS.bgDark} />
                ) : (
                  <Text style={styles.modalBtnVerifyText}>Verify OTP</Text>
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
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 45,
    paddingBottom: 18,
    borderBottomWidth: 1,
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
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  customerPhone: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  deliveryPreference: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  deliveryAddress: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemsBox: {
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
    color: '#FFFFFF',
    fontSize: 12,
  },
  itemCost: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLbl: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  totalVal: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
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
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  btnCancel: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
  },
  btnCancelText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    width: '85%',
    padding: 24,
    alignItems: 'center',
  },
  modalHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubheading: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  otpInput: {
    borderWidth: 1,
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
  },
  modalBtnCloseText: {
    color: '#9CA3AF',
    fontWeight: '700',
  },
  modalBtnVerify: {
    backgroundColor: COLORS.primary,
  },
  modalBtnVerifyText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
