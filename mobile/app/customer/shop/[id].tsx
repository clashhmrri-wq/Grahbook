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
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../src/constants/localization';
import { API_ROUTES } from '../../../src/config/api';

export default function ShopDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Shopkeeper ID

  // Core shop data states
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Tab view: 'catalog' or 'reviews'
  const [activeTab, setActiveTab] = useState<'catalog' | 'reviews'>('catalog');

  // Cart state: Record of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});

  // Checkout modal states
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Customer credentials / details form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'SELF_PICKUP' | 'HOME_DELIVERY'>('SELF_PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [savedCustomer, setSavedCustomer] = useState<any>(null);

  // Review posting form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [postingReview, setPostingReview] = useState(false);

  // Fetch shop details and products
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch shop profile
      const shopResponse = await fetch(API_ROUTES.shopDetails(id as string));
      const shopData = await shopResponse.json();

      // 2. Fetch inventory products
      const prodResponse = await fetch(`${API_ROUTES.products}?shopkeeperId=${id}`);
      const prodData = await prodResponse.json();

      if (shopResponse.ok && shopData.success) {
        setShop(shopData.data);
      }
      if (prodResponse.ok && prodData.success) {
        setProducts(prodData.data);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Failed to load store data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reviews list
  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const response = await fetch(API_ROUTES.shopReviews(id as string));
      const data = await response.json();
      if (response.ok && data.success) {
        setReviews(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
      loadReviews();
    }
  }, [id]);

  // Cart actions
  const addToCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId] > 1) {
        updated[productId] -= 1;
      } else {
        delete updated[productId];
      }
      return updated;
    });
  };

  // Calculate cart totals
  const getCartTotals = () => {
    let totalItems = 0;
    let totalPrice = 0;
    const itemsList: any[] = [];

    Object.entries(cart).forEach(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        totalItems += qty;
        totalPrice += qty * parseFloat(product.price);
        itemsList.push({
          productId: product.id,
          quantity: qty,
          price: parseFloat(product.price),
          name: product.name,
        });
      }
    });

    return { totalItems, totalPrice, itemsList };
  };

  const { totalItems: totalItemsCount, totalPrice: totalPriceCount } = getCartTotals();

  // Reset checkout state
  const openCheckout = () => {
    if (totalItemsCount === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart first.');
      return;
    }
    setCheckoutStep('details');
    setCheckoutVisible(true);
  };

  // Submit Customer Info / Login
  const handleProceedToPayment = async () => {
    if (!savedCustomer) {
      // Validate customer info input
      if (!customerName.trim()) {
        Alert.alert('Details Required', 'Please enter your full name.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(customerPhone)) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    if (deliveryType === 'HOME_DELIVERY' && !deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your physical delivery address.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Authenticate / Register Customer in backend
      let customerId = savedCustomer?.id;

      if (!savedCustomer) {
        const loginResponse = await fetch(API_ROUTES.customerLogin, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: customerPhone,
            fullName: customerName,
            address: deliveryType === 'HOME_DELIVERY' ? deliveryAddress : undefined,
          }),
        });
        const loginData = await loginResponse.json();

        if (loginResponse.ok && loginData.success) {
          setSavedCustomer(loginData.data);
          customerId = loginData.data.id;
        } else {
          Alert.alert('Registration Failed', loginData.message || 'Failed to authenticate your details.');
          setIsProcessing(false);
          return;
        }
      }

      // 2. Initialize Order in Database (status RECEIVED)
      const { itemsList } = getCartTotals();
      const orderResponse = await fetch(API_ROUTES.createOrder, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: id,
          customerId,
          deliveryType,
          totalAmount: totalPriceCount,
          items: itemsList.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const orderData = await orderResponse.json();

      if (orderResponse.ok && orderData.success) {
        setCreatedOrder(orderData.data);
        setCheckoutStep('payment');
      } else {
        Alert.alert('Order Placement Failed', orderData.message || 'Could not place your order.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Connection Error', 'Failed to communicate with checkout APIs.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform Mock Payment Handoff (Razorpay flow simulation)
  const handleSimulatePayment = async () => {
    if (!createdOrder) return;

    setIsProcessing(true);
    try {
      // 1. Ask backend for razorpay initialization credentials
      const payResponse = await fetch(API_ROUTES.createPaymentOrder, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrder.id,
          amount: parseFloat(createdOrder.totalAmount),
        }),
      });
      const payData = await payResponse.json();

      if (!payResponse.ok || !payData.success) {
        Alert.alert('Payment Error', payData.message || 'Failed to initialize payment.');
        setIsProcessing(false);
        return;
      }

      // 2. Submit Mock Verification signature back to mark status as ACCEPTED
      const verifyResponse = await fetch(API_ROUTES.verifyPayment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrder.id,
          razorpayOrderId: payData.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Math.floor(100000 + Math.random() * 900000)}`,
          razorpaySignature: 'mock_signature_approved',
        }),
      });
      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok && verifyData.success) {
        // Clear customer cart
        setCart({});
        setCheckoutStep('success');
      } else {
        Alert.alert('Verification Failed', verifyData.message || 'Could not settle the checkout transaction.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Connection Error', 'Failed to execute payment callback simulation.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Post neighborhood review
  const handlePostReview = async () => {
    if (!savedCustomer) {
      Alert.alert('Login Required', 'Please enter your name and phone under checkout first to authenticate.');
      return;
    }
    if (!newComment.trim()) {
      Alert.alert('Feedback Required', 'Please write a review comment.');
      return;
    }

    setPostingReview(true);
    try {
      const response = await fetch(API_ROUTES.createReview, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: id,
          customerId: savedCustomer.id,
          rating: newRating,
          comment: newComment,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Thank You!', 'Your neighborhood trust review was posted successfully.');
        setNewComment('');
        loadReviews(); // Refresh review list
      } else {
        Alert.alert('Review Failed', data.message || 'Failed to submit review.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to post review.');
    } finally {
      setPostingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading store catalog...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Store details not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Top Shop Info header banner */}
      <View style={styles.shopBanner}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Text style={styles.backArrowText}>◀ Shop Directory</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ordersHistoryBtn} 
            onPress={() => {
              if (savedCustomer) {
                router.push({
                  pathname: '/customer/orders',
                  params: { customerId: savedCustomer.id, customerName: savedCustomer.fullName }
                });
              } else {
                Alert.alert('Login Needed', 'Please place an order or fill details to see your history.');
              }
            }}
          >
            <Text style={styles.ordersHistoryText}>📋 My Orders</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.shopName}>🏪 {shop.shopName}</Text>
        <Text style={styles.shopOwner}>Owner: {shop.ownerName}</Text>
        <Text style={styles.shopAddress}>{shop.address}, {shop.city}</Text>
        <Text style={styles.whatsappNotice}>📞 Contact: {shop.phoneNumber}</Text>
      </View>

      {/* Tabs segment */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'catalog' && styles.tabButtonActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
            📚 Products ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
            ⭐ Reviews ({reviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Catalog lists / Reviews Lists */}
      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === 'catalog' ? (
          <View style={styles.catalogSection}>
            {products.length === 0 ? (
              <Text style={styles.emptyText}>No products available at this store.</Text>
            ) : (
              products.map((item) => {
                const qtyInCart = cart[item.id] || 0;
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                      <Text style={styles.itemPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
                      <Text style={styles.itemCat}>{item.category}</Text>
                    </View>

                    {/* Quantity selector / Add to Cart */}
                    <View style={styles.cartControl}>
                      {qtyInCart > 0 ? (
                        <View style={styles.qtyRow}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                            <Text style={styles.qtyBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyVal}>{qtyInCart}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}>
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addCartBtn} onPress={() => addToCart(item.id)}>
                          <Text style={styles.addCartBtnText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.reviewsSection}>
            {/* Average rating summary banner */}
            <View style={styles.reviewsSummary}>
              <Text style={styles.reviewsSummaryTitle}>Community Trust Rating</Text>
              <Text style={styles.reviewsSummaryStars}>
                {'★'.repeat(Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1))) +
                 '☆'.repeat(5 - Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)))}
              </Text>
              <Text style={styles.reviewsSummaryAvg}>
                {(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1)} / 5.0 Rating Stars
              </Text>
            </View>

            {/* Write review form */}
            <View style={styles.writeReviewCard}>
              <Text style={styles.writeReviewTitle}>Write Store Review</Text>
              <View style={styles.starSelectRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                    <Text style={[styles.starOption, star <= newRating && styles.starOptionSelected]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                placeholder={savedCustomer ? "Share your local feedback here..." : "Fill checkout details first to login & leave review."}
                placeholderTextColor={COLORS.textMuted}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                numberOfLines={3}
                editable={!!savedCustomer}
              />
              <TouchableOpacity 
                style={[styles.postReviewBtn, !savedCustomer && styles.postReviewBtnDisabled]} 
                onPress={handlePostReview}
                disabled={postingReview || !savedCustomer}
              >
                {postingReview ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={styles.postReviewBtnText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Reviews history list */}
            {reviewsLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : reviews.length === 0 ? (
              <Text style={styles.emptyText}>Be the first to review this store!</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{rev.customer.fullName}</Text>
                    <Text style={styles.reviewStars}>{'★'.repeat(rev.rating)}</Text>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                  <Text style={styles.reviewDate}>{new Date(rev.createdAt).toLocaleDateString('en-IN')}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Checkout bar at bottom */}
      {totalItemsCount > 0 && activeTab === 'catalog' && (
        <View style={styles.checkoutBar}>
          <View style={styles.checkoutInfo}>
            <Text style={styles.checkoutQty}>{totalItemsCount} Products</Text>
            <Text style={styles.checkoutPrice}>₹{totalPriceCount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.whatsappCheckoutBtn} onPress={openCheckout}>
            <Text style={styles.whatsappCheckoutText}>Proceed to Checkout 💳</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout Wizard Modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛍️ Secure Order Checkout</Text>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)} disabled={isProcessing}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            {checkoutStep === 'details' && (
              <ScrollView style={styles.modalBody}>
                {savedCustomer ? (
                  <View style={styles.savedUserAlert}>
                    <Text style={styles.savedUserTitle}>✓ Logged In</Text>
                    <Text style={styles.savedUserSub}>Ordering as {savedCustomer.fullName} ({savedCustomer.phoneNumber})</Text>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Enter Customer Name</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g., Ramesh Kumar"
                      placeholderTextColor={COLORS.textMuted}
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                    <Text style={styles.inputLabel}>WhatsApp Mobile Number</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g., 9876543210"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                  </View>
                )}

                {/* Delivery Type Option */}
                <Text style={styles.inputLabel}>Handoff Method</Text>
                <View style={styles.deliveryToggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, deliveryType === 'SELF_PICKUP' && styles.toggleBtnActive]}
                    onPress={() => setDeliveryType('SELF_PICKUP')}
                  >
                    <Text style={[styles.toggleBtnText, deliveryType === 'SELF_PICKUP' && styles.toggleBtnTextActive]}>
                      🚶 Self Pickup
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, deliveryType === 'HOME_DELIVERY' && styles.toggleBtnActive]}
                    onPress={() => setDeliveryType('HOME_DELIVERY')}
                  >
                    <Text style={[styles.toggleBtnText, deliveryType === 'HOME_DELIVERY' && styles.toggleBtnTextActive]}>
                      🏠 Home Delivery
                    </Text>
                  </TouchableOpacity>
                </View>

                {deliveryType === 'HOME_DELIVERY' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Delivery Address</Text>
                    <TextInput
                      style={[styles.inputField, { height: 80 }]}
                      placeholder="Enter house no., landmark, street address..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                    />
                  </View>
                )}

                {/* Cart summary */}
                <View style={styles.checkoutSummaryCard}>
                  <Text style={styles.summaryTitle}>Bill details</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLbl}>Item Total</Text>
                    <Text style={styles.summaryVal}>₹{totalPriceCount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLbl}>Service Fee</Text>
                    <Text style={[styles.summaryVal, { color: COLORS.primary }]}>FREE</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalBillLbl}>Total Amount</Text>
                    <Text style={styles.totalBillVal}>₹{totalPriceCount.toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.proceedPaymentBtn} 
                  onPress={handleProceedToPayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.proceedPaymentText}>Proceed to Payment ➜</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            {checkoutStep === 'payment' && createdOrder && (
              <View style={styles.paymentContainer}>
                <Text style={styles.paymentHeading}>Razorpay Payment Gateway</Text>
                <Text style={styles.paymentSubheading}>Simulate digital UPI checkouts securely via Razorpay sandbox integration.</Text>

                <View style={styles.paymentDetailsCard}>
                  <View style={styles.payRow}>
                    <Text style={styles.payLbl}>Order ID:</Text>
                    <Text style={styles.payVal}>{createdOrder.id.substring(0, 18)}...</Text>
                  </View>
                  <View style={styles.payRow}>
                    <Text style={styles.payLbl}>Customer ID:</Text>
                    <Text style={styles.payVal}>{createdOrder.customerId.substring(0, 18)}...</Text>
                  </View>
                  <View style={styles.payRow}>
                    <Text style={styles.payLbl}>Payable Amount:</Text>
                    <Text style={styles.payTotalVal}>₹{parseFloat(createdOrder.totalAmount).toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.simulatePayBtn} 
                  onPress={handleSimulatePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.simulatePayBtnText}>💰 Settle Razorpay Payment (Demo Success)</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.paymentFooterNote}>
                  * Note: In local development environments, verification tokens are validated on mock modes without live cards.
                </Text>
              </View>
            )}

            {checkoutStep === 'success' && createdOrder && (
              <View style={styles.successContainer}>
                <Text style={styles.successHeading}>🎉 Order Placed Successfully!</Text>
                <Text style={styles.successSub}>Your payment has been settled. Show the OTP below to the store owner upon pickup/delivery.</Text>

                <View style={styles.otpCard}>
                  <Text style={styles.otpLabel}>SECURE HANDOFF OTP</Text>
                  <Text style={styles.otpValue}>{createdOrder.otpCode || '1789'}</Text>
                  <Text style={styles.otpHelper}>Storekeeper will enter this code to mark the order completed.</Text>
                </View>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setCheckoutVisible(false);
                    // Navigate to customer orders history
                    router.push({
                      pathname: '/customer/orders',
                      params: { customerId: createdOrder.customerId, customerName: savedCustomer?.fullName || 'Guest' }
                    });
                  }}
                >
                  <Text style={styles.doneBtnText}>View My Orders</Text>
                </TouchableOpacity>
              </View>
            )}
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
  container: {
    padding: 20,
    paddingBottom: 110, // Leave room for checkout bar
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
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 20,
  },
  shopBanner: {
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    paddingTop: 45,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBackBtn: {
    alignSelf: 'flex-start',
  },
  backArrowText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  ordersHistoryBtn: {
    backgroundColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  ordersHistoryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  shopOwner: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  shopAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  whatsappNotice: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '500',
    marginTop: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  catalogSection: {
    flex: 1,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },
  itemCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  itemPrice: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 6,
  },
  itemCat: {
    color: COLORS.primary,
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  cartControl: {
    marginLeft: 14,
  },
  addCartBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  addCartBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  qtyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  qtyBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyVal: {
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 8,
    fontWeight: 'bold',
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  checkoutInfo: {
    marginRight: 16,
  },
  checkoutQty: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  checkoutPrice: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: 'bold',
  },
  whatsappCheckoutBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  whatsappCheckoutText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: COLORS.textMuted,
  },
  reviewsSection: {
    flex: 1,
  },
  reviewsSummary: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewsSummaryTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewsSummaryStars: {
    color: COLORS.accent,
    fontSize: 24,
    marginVertical: 4,
  },
  reviewsSummaryAvg: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  writeReviewCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  writeReviewTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  starSelectRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starOption: {
    fontSize: 28,
    color: COLORS.border,
    marginRight: 6,
  },
  starOptionSelected: {
    color: COLORS.accent,
  },
  reviewInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  postReviewBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  postReviewBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  postReviewBtnText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 13,
  },
  reviewCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  reviewStars: {
    color: COLORS.accent,
    fontSize: 12,
  },
  reviewComment: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  reviewDate: {
    color: COLORS.border,
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  deliveryToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  toggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  toggleBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: COLORS.primary,
  },
  checkoutSummaryCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLbl: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  summaryVal: {
    color: COLORS.text,
    fontSize: 13,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  summaryRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalBillLbl: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalBillVal: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  proceedPaymentBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  proceedPaymentText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  savedUserAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  savedUserTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  savedUserSub: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 2,
  },
  paymentContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  paymentHeading: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  paymentSubheading: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  paymentDetailsCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  payLbl: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  payVal: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  payTotalVal: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
  },
  simulatePayBtn: {
    backgroundColor: COLORS.accent,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  simulatePayBtnText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: 'bold',
  },
  paymentFooterNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successHeading: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  successSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  otpCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
  },
  otpLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: 'bold',
  },
  otpValue: {
    color: COLORS.accent,
    fontSize: 48,
    fontWeight: '900',
    marginVertical: 10,
    letterSpacing: 6,
  },
  otpHelper: {
    color: COLORS.text,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneBtnText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
