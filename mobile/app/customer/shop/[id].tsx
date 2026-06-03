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
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../src/constants/localization';
import { API_ROUTES } from '../../../src/config/api';

const { width } = Dimensions.get('window');

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

  // Sidebar Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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
        // Default to first category if available
        const categoriesList = Array.from(new Set(prodData.data.map((p: any) => p.category)));
        if (categoriesList.length > 0) {
          setSelectedCategory(categoriesList[0] as string);
        }
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

  // Extract unique categories
  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Filtered products list
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

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
      Alert.alert('Details Required', 'Please enter your name and phone under checkout first to authenticate.');
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
        loadReviews();
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
      {/* Top Shop Banner (Vibrant Yellow Layout Header) */}
      <View style={styles.shopBanner}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Text style={styles.backArrowText}>◀ Stores</Text>
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
                Alert.alert('Login Needed', 'Register during checkout to see your orders history.');
              }
            }}
          >
            <Text style={styles.ordersHistoryText}>📋 My Orders</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shopMetaRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shopName}>🏪 {shop.shopName}</Text>
            <Text style={styles.shopOwner}>Merchant: {shop.ownerName}</Text>
            <Text style={styles.shopAddress}>{shop.address}, {shop.city}</Text>
          </View>
          <View style={styles.deliveryTag}>
            <Text style={styles.deliveryTagTitle}>EXPRESS</Text>
            <Text style={styles.deliveryTagTime}>10 MINS</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'catalog' && styles.tabButtonActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
            🛍️ Store items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
            ⭐ Trust Reviews ({reviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      {activeTab === 'catalog' ? (
        <View style={styles.catalogContainer}>
          {/* Left Category Sidebar */}
          <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.sidebarTab, selectedCategory === cat && styles.sidebarTabActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.sidebarTabText, selectedCategory === cat && styles.sidebarTabTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Right Product Grid List */}
          <ScrollView style={styles.productScroll} contentContainerStyle={styles.productContent}>
            <Text style={styles.categoryTitle}>{selectedCategory || 'Products'}</Text>
            {filteredProducts.length === 0 ? (
              <Text style={styles.emptyText}>No items listed under this category.</Text>
            ) : (
              filteredProducts.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <View key={item.id} style={styles.productGridCard}>
                    <View style={styles.productMeta}>
                      <Text style={styles.productName}>{item.name}</Text>
                      {item.description ? <Text style={styles.productDesc}>{item.description}</Text> : null}
                      <Text style={styles.productWeight}>500 g</Text> {/* Standardized mock grocery weight */}
                      <Text style={styles.productPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
                    </View>

                    {/* Standardized Blinkit green bordered buttons */}
                    <View style={styles.buttonContainer}>
                      {qty > 0 ? (
                        <View style={styles.activeCounter}>
                          <TouchableOpacity style={styles.counterBtn} onPress={() => removeFromCart(item.id)}>
                            <Text style={styles.counterBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.counterVal}>{qty}</Text>
                          <TouchableOpacity style={styles.counterBtn} onPress={() => addToCart(item.id)}>
                            <Text style={styles.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addItemBtn} onPress={() => addToCart(item.id)}>
                          <Text style={styles.addItemBtnText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.reviewsScroll}>
          {/* Rating Display Summary */}
          <View style={styles.reviewsSummary}>
            <Text style={styles.reviewsSummaryTitle}>Community Trust Rating</Text>
            <Text style={styles.reviewsSummaryAvg}>
              {(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1)} ★
            </Text>
            <Text style={styles.reviewsSummaryCount}>Based on {reviews.length} local ratings</Text>
          </View>

          {/* Write feedback */}
          <View style={styles.writeReviewCard}>
            <Text style={styles.writeReviewTitle}>Leave Local Feedback</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                  <Text style={[styles.starIcon, star <= newRating && styles.starIconActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder={savedCustomer ? "Share your shopping feedback..." : "Please fill checkout details first to login & write reviews."}
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              numberOfLines={3}
              editable={!!savedCustomer}
            />
            <TouchableOpacity 
              style={[styles.submitReviewBtn, !savedCustomer && styles.submitReviewBtnDisabled]} 
              onPress={handlePostReview}
              disabled={postingReview || !savedCustomer}
            >
              {postingReview ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitReviewText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Reviews list */}
          {reviewsLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyText}>Be the first to review this grocery store!</Text>
          ) : (
            reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{rev.customer.fullName}</Text>
                  <Text style={styles.reviewRating}>{'★'.repeat(rev.rating)}</Text>
                </View>
                <Text style={styles.reviewComment}>{rev.comment}</Text>
                <Text style={styles.reviewDate}>{new Date(rev.createdAt).toLocaleDateString('en-IN')}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Blinkit-style Cart drawer */}
      {totalItemsCount > 0 && activeTab === 'catalog' && (
        <View style={styles.cartDrawer}>
          <View>
            <Text style={styles.cartItemsCount}>{totalItemsCount} ITEM{totalItemsCount > 1 ? 'S' : ''}</Text>
            <Text style={styles.cartTotalPrice}>₹{totalPriceCount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={openCheckout}>
            <Text style={styles.checkoutBtnText}>View Cart ➔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout Botttom Sheet Modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Checkout Bill</Text>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)} disabled={isProcessing}>
                <Text style={styles.modalCloseBtn}>Close</Text>
              </TouchableOpacity>
            </View>

            {checkoutStep === 'details' && (
              <ScrollView style={{ marginBottom: 10 }} showsVerticalScrollIndicator={false}>
                {savedCustomer ? (
                  <View style={styles.savedUserBadge}>
                    <Text style={styles.savedUserTitle}>✓ Logged In as {savedCustomer.fullName}</Text>
                    <Text style={styles.savedUserSub}>{savedCustomer.phoneNumber}</Text>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g., Ramesh Kumar"
                      placeholderTextColor="#9CA3AF"
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                    <Text style={styles.inputLabel}>WhatsApp Mobile Number</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g., 9876543210"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                  </View>
                )}

                {/* Delivery toggle */}
                <Text style={styles.inputLabel}>Choose Handoff Type</Text>
                <View style={styles.deliveryRow}>
                  <TouchableOpacity
                    style={[styles.deliveryBtn, deliveryType === 'SELF_PICKUP' && styles.deliveryBtnActive]}
                    onPress={() => setDeliveryType('SELF_PICKUP')}
                  >
                    <Text style={[styles.deliveryBtnText, deliveryType === 'SELF_PICKUP' && styles.deliveryBtnTextActive]}>
                      🚶 Self Pickup
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deliveryBtn, deliveryType === 'HOME_DELIVERY' && styles.deliveryBtnActive]}
                    onPress={() => setDeliveryType('HOME_DELIVERY')}
                  >
                    <Text style={[styles.deliveryBtnText, deliveryType === 'HOME_DELIVERY' && styles.deliveryBtnTextActive]}>
                      🏠 Home Delivery
                    </Text>
                  </TouchableOpacity>
                </View>

                {deliveryType === 'HOME_DELIVERY' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Delivery Address</Text>
                    <TextInput
                      style={[styles.inputField, { height: 60 }]}
                      placeholder="Street name, flat, landmark address..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                    />
                  </View>
                )}

                {/* Bill Summary */}
                <View style={styles.billSummaryCard}>
                  <Text style={styles.billTitle}>Bill Details</Text>
                  <View style={styles.billRow}>
                    <Text style={styles.billLbl}>Subtotal</Text>
                    <Text style={styles.billVal}>₹{totalPriceCount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLbl}>Delivery / Service fee</Text>
                    <Text style={[styles.billVal, { color: COLORS.primary, fontWeight: 'bold' }]}>FREE</Text>
                  </View>
                  <View style={styles.billDivider} />
                  <View style={styles.billRow}>
                    <Text style={styles.billTotalLbl}>Total Payable</Text>
                    <Text style={styles.billTotalVal}>₹{totalPriceCount.toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.proceedPaymentBtn} 
                  onPress={handleProceedToPayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.proceedPaymentText}>Proceed to Payment ➔</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            {checkoutStep === 'payment' && createdOrder && (
              <View style={styles.paymentBox}>
                <Text style={styles.paymentHeading}>Secure Payment Simulation</Text>
                <Text style={styles.paymentSub}>Paying via integrated Razorpay gateway sandbox.</Text>

                <View style={styles.paymentDetails}>
                  <View style={styles.payInfoRow}>
                    <Text style={styles.payInfoLbl}>Paying To:</Text>
                    <Text style={styles.payInfoVal}>{shop.shopName}</Text>
                  </View>
                  <View style={styles.payInfoRow}>
                    <Text style={styles.payInfoLbl}>Amount:</Text>
                    <Text style={styles.payInfoTotal}>₹{parseFloat(createdOrder.totalAmount).toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.simPayBtn} 
                  onPress={handleSimulatePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.simPayBtnText}>💸 Approve Sandbox UPI Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {checkoutStep === 'success' && createdOrder && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>🎉 Order Accepted!</Text>
                <Text style={styles.successSub}>Show the OTP below to the store owner upon handoff.</Text>

                <View style={styles.otpCard}>
                  <Text style={styles.otpLabel}>DELIVERY HANDOFF OTP</Text>
                  <Text style={styles.otpValue}>{createdOrder.otpCode}</Text>
                </View>

                <TouchableOpacity
                  style={styles.viewOrdersBtn}
                  onPress={() => {
                    setCheckoutVisible(false);
                    router.push({
                      pathname: '/customer/orders',
                      params: { customerId: createdOrder.customerId, customerName: savedCustomer?.fullName || 'Guest' }
                    });
                  }}
                >
                  <Text style={styles.viewOrdersText}>Track Order History</Text>
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
    backgroundColor: '#FFFFFF', // Clean White storefront background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 10,
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 15,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  backBtnText: {
    color: '#6B7280',
  },
  shopBanner: {
    backgroundColor: COLORS.accent, // Yellow Header
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBackBtn: {
    alignSelf: 'flex-start',
  },
  backArrowText: {
    color: '#1F2937',
    fontWeight: 'bold',
    fontSize: 14,
  },
  ordersHistoryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  ordersHistoryText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  shopName: {
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '800',
  },
  shopOwner: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  shopAddress: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 1,
  },
  deliveryTag: {
    backgroundColor: '#0C831F', // Blinkit Delivery Badge
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  deliveryTagTitle: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  deliveryTagTime: {
    color: '#FCDB3A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: COLORS.primary,
  },
  tabText: {
    color: '#6B7280',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  catalogContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '25%',
    backgroundColor: '#F3F4F6', // Light gray Category Selector Sidebar
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  sidebarTab: {
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sidebarTabActive: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },
  sidebarTabText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  sidebarTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  productScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  productContent: {
    padding: 14,
    paddingBottom: 100, // Room for cart
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 30,
  },
  productGridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  productMeta: {
    flex: 1,
  },
  productName: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  productDesc: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  productWeight: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },
  productPrice: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  buttonContainer: {
    marginLeft: 14,
  },
  addItemBtn: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  addItemBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  activeCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    elevation: 1,
  },
  counterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  counterBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  counterVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  cartDrawer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
  },
  cartItemsCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cartTotalPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  reviewsScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  reviewsSummary: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewsSummaryTitle: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  reviewsSummaryAvg: {
    fontSize: 32,
    fontWeight: '900',
    color: '#D97706',
    marginVertical: 4,
  },
  reviewsSummaryCount: {
    color: '#6B7280',
    fontSize: 11,
  },
  writeReviewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
  },
  writeReviewTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '800',
  },
  starRow: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  starIcon: {
    fontSize: 28,
    color: '#E5E7EB',
    marginRight: 6,
  },
  starIconActive: {
    color: '#F59E0B',
  },
  reviewInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#1F2937',
    fontSize: 13,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  submitReviewBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitReviewBtnDisabled: {
    backgroundColor: '#BDC3C7',
  },
  submitReviewText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewerName: {
    color: '#1F2937',
    fontWeight: '800',
    fontSize: 13,
  },
  reviewRating: {
    color: '#F59E0B',
    fontSize: 11,
  },
  reviewComment: {
    color: '#4B5563',
    fontSize: 12,
    marginTop: 6,
  },
  reviewDate: {
    color: '#9CA3AF',
    fontSize: 9,
    textAlign: 'right',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    color: COLORS.error,
    fontWeight: 'bold',
    fontSize: 13,
  },
  savedUserBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  savedUserTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  savedUserSub: {
    color: '#4B5563',
    fontSize: 11,
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#1F2937',
    fontSize: 13,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deliveryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
  },
  deliveryBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4',
  },
  deliveryBtnText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  deliveryBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  billSummaryCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
  },
  billTitle: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  billLbl: {
    color: '#6B7280',
    fontSize: 12,
  },
  billVal: {
    color: '#1F2937',
    fontSize: 12,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  billTotalLbl: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '800',
  },
  billTotalVal: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  proceedPaymentBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  proceedPaymentText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  paymentBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  paymentHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  paymentSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  paymentDetails: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginVertical: 20,
  },
  payInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  payInfoLbl: {
    color: '#6B7280',
    fontSize: 12,
  },
  payInfoVal: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
  },
  payInfoTotal: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },
  simPayBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  simPayBtnText: {
    color: '#1F2937',
    fontWeight: '800',
    fontSize: 13,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  successSub: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  otpCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  otpLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  otpValue: {
    color: '#D97706',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
    marginVertical: 6,
  },
  viewOrdersBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  viewOrdersText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
