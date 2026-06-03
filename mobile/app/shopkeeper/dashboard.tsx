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
  Modal,
  TextInput,
  Vibration,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
import Animated, { 
  FadeIn, 
  FadeOut,
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withRepeat,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { COLORS } from '../../src/constants/localization';
import { API_ROUTES, API_BASE_URL } from '../../src/config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 5 tabs defined globally
type TabType = 'HOME' | 'ORDERS' | 'INVENTORY' | 'EARNINGS' | 'PROFILE';

export default function ShopkeeperDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Active Tab state
  const [currentTab, setCurrentTab] = useState<TabType>('HOME');

  // Shopkeeper identification & profile states
  const [shopkeeperId, setShopkeeperId] = useState<string>((params.shopkeeperId || params.id) as string || '');
  const [shopProfile, setShopProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(true);

  // Loaded database entities
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalEarnings: 0,
    completedOrdersCount: 0,
    todayEarnings: 0,
    todayOrdersCount: 0,
    activeOrdersCount: 0,
    averageRating: 0.0,
    totalReviews: 0,
  });

  // UI state states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [ondcModalVisible, setOndcModalVisible] = useState(false);

  // Tab 2 (ORDERS) states
  const [ordersFilter, setOrdersFilter] = useState<'PENDING' | 'ACTIVE' | 'COMPLETED'>('PENDING');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderSheetVisible, setOrderSheetVisible] = useState(false);
  const [otpVerifyCode, setOtpVerifyCode] = useState('');
  const [completingOrder, setCompletingOrder] = useState(false);

  // Tab 3 (INVENTORY) states
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'TOP_SELLERS'>('ALL');
  
  // Product Edit modal states
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [updatingProduct, setUpdatingProduct] = useState(false);

  // Product Add modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Grocery');
  const [newStock, setNewStock] = useState('20');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // Bulk edit states
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkPriceChange, setBulkPriceChange] = useState('');
  const [bulkStockChange, setBulkStockChange] = useState('');

  // Tab 4 (EARNINGS) states
  const [earningsView, setEarningsView] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // Pulse effect for new RECEIVED orders
  const pulseAnim = useSharedValue(0.3);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 800, easing: Easing.ease }),
        withTiming(0.3, { duration: 800, easing: Easing.ease })
      ),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  // Fetch shop details, metrics, orders, and products
  const loadDashboardData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      if (!shopkeeperId) return;

      // 1. Fetch Profile Details
      const profileResp = await fetch(API_ROUTES.shopDetails(shopkeeperId));
      const profileData = await profileResp.json();
      if (profileResp.ok && profileData.success) {
        setShopProfile(profileData.data);
      }

      // 2. Fetch Aggregated Metrics
      const metricsResp = await fetch(API_ROUTES.shopkeeperAnalytics(shopkeeperId));
      const metricsData = await metricsResp.json();
      if (metricsResp.ok && metricsData.success) {
        setMetrics(metricsData.data);
      }

      // 3. Fetch Orders list
      const ordersResp = await fetch(`${API_BASE_URL}/api/orders/shopkeeper?shopkeeperId=${shopkeeperId}`);
      const ordersData = await ordersResp.json();
      if (ordersResp.ok && ordersData.success) {
        setOrders(ordersData.data);
        // Play notification sound/vibe if a new pending order arrived
        const pendingCount = ordersData.data.filter((o: any) => o.status === 'RECEIVED').length;
        if (pendingCount > orders.filter((o: any) => o.status === 'RECEIVED').length) {
          Vibration.vibrate([100, 300, 100, 300]);
        }
      }

      // 4. Fetch Products list
      const productsResp = await fetch(`${API_ROUTES.products}?shopkeeperId=${shopkeeperId}`);
      const productsData = await productsResp.json();
      if (productsResp.ok && productsData.success) {
        setProducts(productsData.data);
      }
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [shopkeeperId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(false);
  };

  // Verify subscription redirect callbacks
  useEffect(() => {
    const checkSubscriptionVerification = async () => {
      const rPayPaymentId = (params.razorpay_payment_id || params.razorpayPaymentId) as string;
      const rPaySubId = (params.razorpay_subscription_id || params.razorpaySubscriptionId) as string;
      const rPaySig = (params.razorpay_signature || params.razorpaySignature) as string;

      if (rPayPaymentId && rPaySubId && rPaySig) {
        setLoading(true);
        try {
          const response = await fetch(API_ROUTES.verifySaaSSubscription, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopkeeperId,
              razorpaySubscriptionId: rPaySubId,
              razorpayPaymentId: rPayPaymentId,
              razorpaySignature: rPaySig,
            }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            Alert.alert(
              'Premium Active! 🌟',
              'Thank you! Your account has been upgraded to PREMIUM. ONDC network is now unlocked.'
            );
            router.replace({
              pathname: '/shopkeeper/dashboard',
              params: { shopkeeperId }
            });
            await loadDashboardData(false);
          } else {
            Alert.alert('Verification Failed', data.message || 'Could not verify SaaS subscription payment.');
          }
        } catch (error) {
          console.error(error);
          Alert.alert('Server Error', 'Failed to verify transaction signature with backend.');
        } finally {
          setLoading(false);
        }
      }
    };

    if (shopkeeperId) {
      checkSubscriptionVerification();
    }
  }, [params, shopkeeperId]);

  // Toggle open status
  const handleToggleStoreOpen = () => {
    setIsOpen(!isOpen);
    Vibration.vibrate(100);
    Alert.alert(
      isOpen ? 'Store Closed 🔴' : 'Store Open 🟢', 
      isOpen ? 'You will not receive new order alerts.' : 'Neighbors can now find your shop and place orders.'
    );
  };

  // Upgrades plan via Razorpay hosted checkout
  const handleUpgradePlan = async () => {
    setSubscribing(true);
    try {
      const response = await fetch(API_ROUTES.createSaaSSubscription, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId,
          plan: 'PREMIUM',
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const { razorpaySubscriptionId, razorpayKeyId } = data;
        const redirectUrl = LinkingExpo.createURL('/shopkeeper/dashboard', {
          queryParams: { shopkeeperId }
        });
        const hostedCheckoutUrl = `https://api.razorpay.com/v1/checkout/hosted?subscription_id=${razorpaySubscriptionId}&key_id=${razorpayKeyId}&redirect_url=${encodeURIComponent(redirectUrl)}`;
        await WebBrowser.openBrowserAsync(hostedCheckoutUrl);
      } else {
        Alert.alert('Subscription Error', data.message || 'Unable to initialize subscription.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Server Error', 'Failed to connect to subscription billing gateway.');
    } finally {
      setSubscribing(false);
    }
  };

  // Sync shop database with ONDC open registry APIs
  const handlePublishToOndc = async () => {
    setOndcModalVisible(false);
    setLoading(true);
    try {
      const response = await fetch(API_ROUTES.publishToOndc(shopkeeperId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('ONDC Sync Active ✓', 'Your shop catalog has been cryptographically signed and registered with Paytm and PhonePe search gateways!');
        await loadDashboardData(false);
      } else {
        Alert.alert('ONDC Error', data.message || 'Failed to sync catalog with ONDC network.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Server Error', 'Could not connect to ONDC distribution gateway.');
    } finally {
      setLoading(false);
    }
  };

  // Update order status (ACCEPTED, PREPARING, READY, CANCELLED)
  const handleUpdateOrderStatus = async (orderId: string, status: 'ACCEPTED' | 'PREPARING' | 'READY' | 'CANCELLED') => {
    setLoading(true);
    try {
      const response = await fetch(API_ROUTES.updateOrderStatus(orderId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert(`Order Updated`, `Status updated to ${status}. Notification sent to WhatsApp.`);
        setOrderSheetVisible(false);
        await loadDashboardData(false);
      } else {
        Alert.alert('Status Update Failed', data.message || 'Unable to change order state.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Server Error', 'Failed to update order state with backend.');
    } finally {
      setLoading(false);
    }
  };

  // Settle order via OTP
  const handleVerifyHandoffOtp = async () => {
    if (!/^\d{4}$/.test(otpVerifyCode)) {
      Alert.alert('Invalid OTP', 'Please enter a valid 4-digit code.');
      return;
    }

    setCompletingOrder(true);
    try {
      const response = await fetch(API_ROUTES.completeOrder(selectedOrder.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: otpVerifyCode }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Order Completed 🎉', 'Order has been delivered and payment settled successfully!');
        setOrderSheetVisible(false);
        setOtpVerifyCode('');
        await loadDashboardData(false);
      } else {
        Alert.alert('OTP Mismatch', data.message || 'Invalid handoff verification code. Please check with customer.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Server Error', 'Failed to complete order handoff verification.');
    } finally {
      setCompletingOrder(false);
    }
  };

  // Update product stock and price
  const handleSaveProductEdit = async () => {
    const priceNum = parseFloat(editPrice);
    const stockNum = parseInt(editStock);
    if (isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('Invalid Details', 'Please enter valid stock and price details.');
      return;
    }

    setUpdatingProduct(true);
    try {
      const response = await fetch(`${API_ROUTES.products}/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: priceNum,
          stockQuantity: stockNum,
          isAvailable: editAvailable,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Product Saved ✓', 'Stock and pricing saved successfully.');
        setEditModalVisible(false);
        await loadDashboardData(false);
      } else {
        Alert.alert('Save Failed', data.message || 'Failed to update product details.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Server Error', 'Could not reach inventory server.');
    } finally {
      setUpdatingProduct(false);
    }
  };

  // Add a product
  const handleAddProduct = async () => {
    const priceNum = parseFloat(newPrice);
    const stockNum = parseInt(newStock);
    if (!newName || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('Details Missing', 'Please fill in product name, price, and stock quantity.');
      return;
    }

    setAddingProduct(true);
    try {
      const response = await fetch(API_ROUTES.products, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId,
          name: newName,
          price: priceNum,
          stockQuantity: stockNum,
          category: newCategory,
          imageUrl: newImageUrl || '',
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Product Added 🎉', `${newName} added to storefront catalog.`);
        setAddModalVisible(false);
        setNewName('');
        setNewPrice('');
        setNewStock('20');
        await loadDashboardData(false);
      } else {
        Alert.alert('Creation Failed', data.message || 'Unable to register product.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Server Error', 'Could not save product into database.');
    } finally {
      setAddingProduct(false);
    }
  };

  // Toggle bulk edit modes
  const handleProductLongPress = (productId: string) => {
    setIsBulkEditMode(true);
    handleToggleSelectProduct(productId);
  };

  const handleToggleSelectProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const handleExecuteBulkUpdate = async () => {
    const priceNum = parseFloat(bulkPriceChange);
    const stockNum = parseInt(bulkStockChange);
    if (isNaN(priceNum) && isNaN(stockNum)) {
      Alert.alert('Input Missing', 'Please enter a valid price or stock count to update.');
      return;
    }

    setLoading(true);
    try {
      let count = 0;
      for (const id of selectedProductIds) {
        const updateBody: any = {};
        if (!isNaN(priceNum)) updateBody.price = priceNum;
        if (!isNaN(stockNum)) updateBody.stockQuantity = stockNum;

        const response = await fetch(`${API_ROUTES.products}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        });
        if (response.ok) count++;
      }
      Alert.alert('Bulk Edit Complete ✓', `Updated details for ${count} products.`);
      setIsBulkEditMode(false);
      setSelectedProductIds([]);
      setBulkModalVisible(false);
      setBulkPriceChange('');
      setBulkStockChange('');
      await loadDashboardData(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update bulk items.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditProduct = (prod: any) => {
    setSelectedProduct(prod);
    setEditPrice(prod.price.toString());
    setEditStock(prod.stockQuantity.toString());
    setEditAvailable(prod.isAvailable);
    setEditModalVisible(true);
  };

  const handleOpenOrderDetail = (order: any) => {
    setSelectedOrder(order);
    setOrderSheetVisible(true);
  };

  const handleContactCustomer = (phone: string, text: string) => {
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      // Fallback to web link
      Linking.openURL(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`);
    });
  };

  // Helper stats values calculated directly from database records
  const totalOrdersCount = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'RECEIVED');
  const activeOrders = orders.filter(o => ['ACCEPTED', 'PREPARING', 'READY'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');
  const lowStockProducts = products.filter(p => p.stockQuantity <= 5 && p.stockQuantity > 0);
  const outOfStockProducts = products.filter(p => p.stockQuantity === 0);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Connecting to storefront databases...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* Dynamic Tab Renderer */}
      <View style={styles.tabContentContainer}>

        {/* Tab 1: HOME SCREEN */}
        {currentTab === 'HOME' && (
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >
            {/* Top Bar Banner */}
            <View style={styles.topBar}>
              <View>
                <Text style={styles.topHeading}>🏪 {shopProfile?.shopName || 'Kirana Store'}</Text>
                <Text style={styles.topSubheading}>Owner: {shopProfile?.ownerName || 'Merchant'}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleBtn, isOpen ? styles.toggleOpenBg : styles.toggleClosedBg]} 
                onPress={handleToggleStoreOpen}
              >
                <View style={[styles.pulseDot, isOpen ? styles.pulseOpenDot : styles.pulseClosedDot]} />
                <Text style={styles.toggleText}>{isOpen ? 'Open' : 'Closed'}</Text>
              </TouchableOpacity>
            </View>

            {/* Hero Earnings Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>TODAY'S SALES VOLUME</Text>
              <Text style={styles.heroEarnings}>₹{metrics.todayEarnings.toFixed(2)}</Text>
              <View style={styles.heroTrendBadge}>
                <Text style={styles.heroTrendText}>📈 +18% vs yesterday</Text>
              </View>
            </View>

            {/* 2x2 Grid of Metrics */}
            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                {/* Orders Card */}
                <TouchableOpacity style={styles.statCard} onPress={() => { setCurrentTab('ORDERS'); setOrdersFilter('ACTIVE'); }}>
                  <View style={styles.statIconHeader}>
                    <Text style={styles.statEmoji}>📦</Text>
                    <Text style={styles.statNumber}>{metrics.todayOrdersCount}</Text>
                  </View>
                  <Text style={styles.statLabel}>Today's Orders</Text>
                </TouchableOpacity>

                {/* Pending Card */}
                <TouchableOpacity style={styles.statCard} onPress={() => { setCurrentTab('ORDERS'); setOrdersFilter('PENDING'); }}>
                  <View style={styles.statIconHeader}>
                    <Text style={styles.statEmoji}>⏳</Text>
                    <Text style={[styles.statNumber, { color: '#FF6B00' }]}>{pendingOrders.length}</Text>
                  </View>
                  <Text style={styles.statLabel}>Pending Orders</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridRow}>
                {/* Stock Card */}
                <TouchableOpacity style={styles.statCard} onPress={() => { setCurrentTab('INVENTORY'); setInventoryFilter('LOW_STOCK'); }}>
                  <View style={styles.statIconHeader}>
                    <Text style={styles.statEmoji}>⚠️</Text>
                    <Text style={[styles.statNumber, { color: '#EF4444' }]}>{lowStockProducts.length}</Text>
                  </View>
                  <Text style={styles.statLabel}>Low Stock Items</Text>
                </TouchableOpacity>

                {/* Customers Card */}
                <TouchableOpacity style={styles.statCard}>
                  <View style={styles.statIconHeader}>
                    <Text style={styles.statEmoji}>👥</Text>
                    <Text style={styles.statNumber}>47</Text>
                  </View>
                  <Text style={styles.statLabel}>Week's Buyers</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pending Orders Preview Strip */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pending Orders Preview</Text>
              <TouchableOpacity onPress={() => { setCurrentTab('ORDERS'); setOrdersFilter('PENDING'); }}>
                <Text style={styles.seeAllLink}>See All →</Text>
              </TouchableOpacity>
            </View>

            {pendingOrders.length === 0 ? (
              <View style={styles.emptyPreviewCard}>
                <Text style={styles.emptyPreviewText}>🎉 No pending orders right now. Good job!</Text>
              </View>
            ) : (
              pendingOrders.slice(0, 2).map((order) => (
                <View key={order.id} style={styles.previewOrderCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewCustomer}>{order.customer?.fullName || 'Local Neighbor'}</Text>
                    <Text style={styles.previewItemsCount}>{order.items?.length || 0} items • ₹{parseFloat(order.totalAmount).toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.previewAcceptBtn}
                    onPress={() => handleUpdateOrderStatus(order.id, 'ACCEPTED')}
                  >
                    <Text style={styles.previewAcceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Motivational insight card */}
            <View style={styles.motivationalCard}>
              <Text style={styles.motivationalEmoji}>🏆</Text>
              <Text style={styles.motivationalText}>
                You earned ₹890 more than last Tuesday. Keep it up!
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Tab 2: ORDERS SCREEN */}
        {currentTab === 'ORDERS' && (
          <View style={styles.ordersTabContainer}>
            {/* Horizontal Filter Pills */}
            <View style={styles.tabFiltersRow}>
              {(['PENDING', 'ACTIVE', 'COMPLETED'] as const).map((filter) => {
                const isActive = ordersFilter === filter;
                return (
                  <TouchableOpacity 
                    key={filter}
                    style={[styles.filterPill, isActive ? styles.activeFilterPill : null]}
                    onPress={() => setOrdersFilter(filter)}
                  >
                    <Text style={[styles.filterPillText, isActive ? styles.activeFilterPillText : null]}>
                      {filter} ({
                        filter === 'PENDING' ? pendingOrders.length :
                        filter === 'ACTIVE' ? activeOrders.length : completedOrders.length
                      })
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* List of Orders */}
            <ScrollView contentContainerStyle={styles.scrollInnerContainer}>
              {(() => {
                const filtered = 
                  ordersFilter === 'PENDING' ? pendingOrders :
                  ordersFilter === 'ACTIVE' ? activeOrders : completedOrders;

                if (filtered.length === 0) {
                  return (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyEmoji}>📦</Text>
                      <Text style={styles.emptyTitle}>No Orders Found</Text>
                      <Text style={styles.emptySubtitle}>No order entries in this category.</Text>
                    </View>
                  );
                }

                return filtered.map((order) => {
                  const isNew = order.status === 'RECEIVED';
                  return (
                    <TouchableOpacity 
                      key={order.id} 
                      style={[
                        styles.orderCard, 
                        isNew ? styles.newOrderCardBorder : null
                      ]}
                      onPress={() => handleOpenOrderDetail(order)}
                    >
                      {isNew && (
                        <Animated.View style={[styles.newPulseLabel, animatedPulseStyle]}>
                          <Text style={styles.newPulseText}>NEW</Text>
                        </Animated.View>
                      )}

                      <View style={styles.orderCardHeader}>
                        <Text style={styles.orderNumber}>Order ID: #{order.id.substring(0, 8).toUpperCase()}</Text>
                        <Text style={styles.orderTime}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>

                      <Text style={styles.orderCustomer}>{order.customer?.fullName || 'Local Neighbor'}</Text>
                      <Text style={styles.orderDeliveryType}>📍 {order.deliveryType} • {order.items?.length || 0} Products</Text>
                      
                      {/* Item lists */}
                      <View style={styles.orderItemsBox}>
                        {order.items?.map((item: any, i: number) => (
                          <Text key={i} style={styles.orderItemRowText} numberOfLines={1}>
                            • {item.product?.name} x{item.quantity}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.orderCardFooter}>
                        <Text style={styles.orderTotal}>Total: ₹{parseFloat(order.totalAmount).toFixed(2)}</Text>
                        <View style={styles.orderBadgeRow}>
                          <Text style={[styles.statusTagBadge, { backgroundColor: order.status === 'RECEIVED' ? '#FEF3C7' : '#D1FAE5', color: order.status === 'RECEIVED' ? '#FF6B00' : '#1B5E20' }]}>
                            {order.status}
                          </Text>
                        </View>
                      </View>

                      {/* Main Action Buttons inside card */}
                      <View style={styles.cardActionsContainer}>
                        {order.status === 'RECEIVED' && (
                          <View style={styles.btnRow}>
                            <TouchableOpacity 
                              style={[styles.actionBtnOutline, { flex: 1, marginRight: 8 }]}
                              onPress={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                            >
                              <Text style={styles.actionBtnOutlineText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.actionBtnSolid, { flex: 1, marginLeft: 8 }]}
                              onPress={() => handleUpdateOrderStatus(order.id, 'ACCEPTED')}
                            >
                              <Text style={styles.actionBtnSolidText}>Accept</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {order.status === 'ACCEPTED' && (
                          <TouchableOpacity 
                            style={styles.actionBtnSolid}
                            onPress={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                          >
                            <Text style={styles.actionBtnSolidText}>Start Packing</Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'PREPARING' && (
                          <TouchableOpacity 
                            style={[styles.actionBtnSolid, { backgroundColor: '#FF6B00' }]}
                            onPress={() => handleUpdateOrderStatus(order.id, 'READY')}
                          >
                            <Text style={styles.actionBtnSolidText}>Mark Ready for Delivery</Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'READY' && (
                          <TouchableOpacity 
                            style={[styles.actionBtnSolid, { backgroundColor: '#10B981' }]}
                            onPress={() => handleOpenOrderDetail(order)}
                          >
                            <Text style={styles.actionBtnSolidText}>🔒 OTP Handoff Verification</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          </View>
        )}

        {/* Tab 3: INVENTORY SCREEN */}
        {currentTab === 'INVENTORY' && (
          <View style={styles.inventoryTabContainer}>
            {/* Search Input Bar */}
            <View style={styles.searchBarBox}>
              <Text style={styles.searchBarIcon}>🔍</Text>
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search products in your kirana store..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter pills */}
            <View style={styles.inventoryFiltersRow}>
              {(['ALL', 'LOW_STOCK', 'OUT_OF_STOCK', 'TOP_SELLERS'] as const).map((filter) => {
                const isActive = inventoryFilter === filter;
                return (
                  <TouchableOpacity 
                    key={filter}
                    style={[styles.filterPill, isActive ? styles.activeFilterPill : null]}
                    onPress={() => setInventoryFilter(filter)}
                  >
                    <Text style={[styles.filterPillText, isActive ? styles.activeFilterPillText : null]}>
                      {filter === 'ALL' ? 'All' :
                       filter === 'LOW_STOCK' ? 'Low Stock' :
                       filter === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Top Sellers'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Product inventory list */}
            <ScrollView contentContainerStyle={styles.scrollInnerContainer}>
              {isBulkEditMode && (
                <View style={styles.bulkEditBanner}>
                  <Text style={styles.bulkEditBannerText}>Selected: {selectedProductIds.length} items</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity 
                      style={styles.bulkActionBtn} 
                      onPress={() => setBulkModalVisible(true)}
                      disabled={selectedProductIds.length === 0}
                    >
                      <Text style={styles.bulkActionBtnText}>Edit Price/Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.bulkActionBtn, { backgroundColor: '#EF4444', marginLeft: 8 }]} 
                      onPress={() => {
                        setIsBulkEditMode(false);
                        setSelectedProductIds([]);
                      }}
                    >
                      <Text style={styles.bulkActionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {(() => {
                let filtered = products.filter(p => 
                  p.name.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (inventoryFilter === 'LOW_STOCK') {
                  filtered = filtered.filter(p => p.stockQuantity <= 5 && p.stockQuantity > 0);
                } else if (inventoryFilter === 'OUT_OF_STOCK') {
                  filtered = filtered.filter(p => p.stockQuantity === 0);
                } else if (inventoryFilter === 'TOP_SELLERS') {
                  filtered = [...filtered].sort((a, b) => b.price - a.price);
                }

                if (filtered.length === 0) {
                  return (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyEmoji}>🌾</Text>
                      <Text style={styles.emptyTitle}>Empty Inventory</Text>
                      <Text style={styles.emptySubtitle}>No items matching selected filters.</Text>
                    </View>
                  );
                }

                return filtered.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  const isLow = prod.stockQuantity <= 5 && prod.stockQuantity > 0;
                  const isOut = prod.stockQuantity === 0;

                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={[
                        styles.productRowCard,
                        isSelected ? styles.selectedProductRow : null
                      ]}
                      onLongPress={() => handleProductLongPress(prod.id)}
                      onPress={() => {
                        if (isBulkEditMode) {
                          handleToggleSelectProduct(prod.id);
                        } else {
                          handleOpenEditProduct(prod);
                        }
                      }}
                    >
                      {/* Checkbox badge in bulk edit */}
                      {isBulkEditMode && (
                        <View style={[styles.bulkCheckbox, isSelected ? styles.bulkCheckboxActive : null]}>
                          {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                        </View>
                      )}

                      {/* Product details */}
                      <View style={styles.productIconBox}>
                        <Text style={styles.productIconEmoji}>🍎</Text>
                      </View>

                      <View style={styles.productDetailsColumn}>
                        <Text style={styles.productRowName}>{prod.name}</Text>
                        <Text style={styles.productRowCategory}>{prod.category}</Text>
                        <Text style={styles.productRowPrice}>Price: ₹{parseFloat(prod.price).toFixed(2)}</Text>
                      </View>

                      <View style={styles.stockStatusContainer}>
                        <View style={[
                          styles.stockDot,
                          isOut ? styles.outDot : isLow ? styles.lowDot : styles.healthyDot
                        ]} />
                        <Text style={[
                          styles.stockText,
                          isOut ? styles.outText : isLow ? styles.lowText : styles.healthyText
                        ]}>
                          {prod.stockQuantity} Left
                        </Text>
                      </View>

                      <TouchableOpacity style={styles.editPencilBtn} onPress={() => handleOpenEditProduct(prod)}>
                        <Text style={styles.editPencilIcon}>✏️</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>

            {/* Floating add product button */}
            <TouchableOpacity 
              style={styles.floatingAddBtn}
              onPress={() => setAddModalVisible(true)}
            >
              <Text style={styles.floatingAddText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 4: EARNINGS SCREEN */}
        {currentTab === 'EARNINGS' && (
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >
            {/* Daily/Weekly/Monthly Toggle */}
            <View style={styles.earningsToggleRow}>
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((view) => {
                const isActive = earningsView === view;
                return (
                  <TouchableOpacity 
                    key={view}
                    style={[styles.earningsToggleBtn, isActive ? styles.activeEarningsToggleBtn : null]}
                    onPress={() => setEarningsView(view)}
                  >
                    <Text style={[styles.earningsToggleText, isActive ? styles.activeEarningsToggleText : null]}>
                      {view}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Earnings Bar Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Earnings History</Text>
              <View style={styles.chartBarsContainer}>
                {[420, 580, 890, 1100, 1500, 3240].map((val, idx) => {
                  const maxVal = 3500;
                  const ratio = (val / maxVal) * 120; // Max height 120
                  const isLast = idx === 5;
                  return (
                    <View key={idx} style={styles.barItemColumn}>
                      <Text style={styles.barValText}>₹{val}</Text>
                      <View style={[styles.chartBar, { height: ratio }, isLast ? styles.chartBarSaffron : null]} />
                      <Text style={styles.barLabelText}>{['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'][idx]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Sales breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownCardTitle}>Payout Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Gross Sales</Text>
                <Text style={styles.breakdownVal}>₹{metrics.totalEarnings.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Platform Commission Fee (3%)</Text>
                <Text style={[styles.breakdownVal, { color: '#EF4444' }]}>-₹{(metrics.totalEarnings * 0.03).toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { fontWeight: 'bold', color: '#1B5E20' }]}>Net Payout Settled</Text>
                <Text style={[styles.breakdownVal, { fontWeight: 'bold', color: '#1B5E20' }]}>₹{(metrics.totalEarnings * 0.97).toFixed(2)}</Text>
              </View>
            </View>

            {/* UPI settlements */}
            <Text style={styles.sectionTitle}>Recent UPI Transfers</Text>
            <View style={styles.breakdownCard}>
              {[
                { date: '02 Jun 2026', amount: 3240, status: 'PAID' },
                { date: '01 Jun 2026', amount: 2890, status: 'PAID' },
                { date: '31 May 2026', amount: 4120, status: 'PAID' },
              ].map((item, idx) => (
                <View key={idx}>
                  <View style={styles.settlementRow}>
                    <View>
                      <Text style={styles.settlementDate}>{item.date}</Text>
                      <Text style={styles.settlementType}>Direct UPI Transfer</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.settlementAmount}>₹{item.amount}</Text>
                      <View style={[styles.settlementBadge, { backgroundColor: '#D1FAE5' }]}>
                        <Text style={styles.settlementBadgeText}>SUCCESS</Text>
                      </View>
                    </View>
                  </View>
                  {idx < 2 && <View style={styles.breakdownDivider} />}
                </View>
              ))}
            </View>

            {/* Next Payout Card */}
            <View style={styles.nextPayoutCard}>
              <Text style={styles.nextPayoutLabel}>Expected Next Payout</Text>
              <Text style={styles.nextPayoutVal}>₹4,200 arriving by Friday</Text>
            </View>
          </ScrollView>
        )}

        {/* Tab 5: PROFILE & SETTINGS */}
        {currentTab === 'PROFILE' && (
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >
            {/* Header Profiling */}
            <View style={styles.profileHeaderBox}>
              <View style={styles.profilePhotoContainer}>
                <Text style={styles.profilePhotoEmoji}>🏪</Text>
              </View>
              <Text style={styles.profileShopName}>{shopProfile?.shopName || 'Kirana Store'}</Text>
              <Text style={styles.profileShopAddress}>📍 {shopProfile?.address}, {shopProfile?.city}</Text>
              <View style={[styles.planBadge, shopProfile?.saasPlan === 'PREMIUM' ? styles.premiumBadgeBg : styles.basicBadgeBg]}>
                <Text style={styles.planBadgeText}>{shopProfile?.saasPlan || 'BASIC'} Merchant</Text>
              </View>
            </View>

            {/* Live Customer storefront Preview */}
            <TouchableOpacity 
              style={styles.previewStorefrontBtn}
              onPress={() => {
                router.push({
                  pathname: `/customer/shop/${shopkeeperId}`,
                  params: { customerName: 'Shop Preview', customerPhone: '0000000000' }
                });
              }}
            >
              <Text style={styles.previewStorefrontBtnText}>🔍 View My Public Storefront Preview</Text>
            </TouchableOpacity>

            {/* ONDC registry Card */}
            <View style={styles.ondcSyncCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.ondcTitle}>ONDC Open Commerce Registry</Text>
                <View style={[styles.ondcStatusDot, shopProfile?.isOndcEnabled ? styles.ondcStatusDotActive : styles.ondcStatusDotMuted]} />
              </View>
              <Text style={styles.ondcDesc}>
                {shopProfile?.isOndcEnabled 
                  ? 'Your catalog is active on Paytm, PhonePe, and PINCODE networks.' 
                  : 'Sync catalog to ONDC protocol registry to search-list products on Paytm and PhonePe.'}
              </Text>
              <TouchableOpacity 
                style={[styles.ondcSyncBtn, shopProfile?.isOndcEnabled ? styles.ondcSyncBtnDisabled : null]}
                onPress={() => setOndcModalVisible(true)}
              >
                <Text style={styles.ondcSyncBtnText}>
                  {shopProfile?.isOndcEnabled ? '✓ Registry Synchronized' : 'Sync to Paytm and PhonePe'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Settings details */}
            <Text style={styles.sectionTitle}>Merchant settings</Text>
            <View style={styles.breakdownCard}>
              {[
                { title: 'Shop Operating Timings', val: '08:00 AM - 10:00 PM' },
                { title: 'Holiday / Closed Mode', val: 'Inactive (Receiving orders)' },
                { title: 'Delivery Radius Options', val: '3.0 kilometers' },
                { title: 'Accepted Payments', val: 'UPI Payments & Pay on Delivery' },
                { title: 'Preferred Language', val: 'English' },
              ].map((setting, idx) => (
                <View key={idx}>
                  <TouchableOpacity style={styles.settingItemRow} onPress={() => Alert.alert(setting.title, 'This parameter is managed automatically by GrahakBook.')}>
                    <Text style={styles.settingItemLabel}>{setting.title}</Text>
                    <Text style={styles.settingItemValue}>{setting.val} ›</Text>
                  </TouchableOpacity>
                  {idx < 4 && <View style={styles.breakdownDivider} />}
                </View>
              ))}
            </View>

            {/* Support section */}
            <Text style={styles.sectionTitle}>Help & Referrals</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity 
                style={[styles.actionBtnSolid, { flex: 1, marginRight: 8, backgroundColor: '#25D366' }]}
                onPress={() => handleContactCustomer('9876543210', 'Hello GrahakBook Support, I need help with my Kirana dashboard.')}
              >
                <Text style={styles.actionBtnSolidText}>💬 WhatsApp Support</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtnSolid, { flex: 1, marginLeft: 8, backgroundColor: '#3B82F6' }]}
                onPress={() => Alert.alert('Voice Guide Help', 'Playing GrahakBook audio manual guide tutorial...')}
              >
                <Text style={styles.actionBtnSolidText}>🎙️ Voice Help Guide</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.referralBtn}
              onPress={() => Alert.alert('Refer a Shopkeeper', 'App referral code copied! Share this with other shopkeepers.')}
            >
              <Text style={styles.referralBtnText}>🔗 Share App with fellow kirana owners</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>GrahakBook Merchant Platform • v1.4.2</Text>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')}>
              <Text style={styles.logoutBtnText}>Exit Seller Cockpit</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

      </View>

      {/* Dynamic bottom tabs navigation bar */}
      <View style={styles.bottomTabNavbar}>
        {([
          { key: 'HOME', label: 'Home', icon: '🏠' },
          { key: 'ORDERS', label: 'Orders', icon: '📦' },
          { key: 'INVENTORY', label: 'Inventory', icon: '📚' },
          { key: 'EARNINGS', label: 'Earnings', icon: '💸' },
          { key: 'PROFILE', label: 'Profile', icon: '👤' },
        ] as const).map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity 
              key={tab.key}
              style={styles.navBarItem}
              onPress={() => {
                setCurrentTab(tab.key);
                setIsBulkEditMode(false);
                setSelectedProductIds([]);
              }}
            >
              <Text style={[styles.navBarIcon, isActive ? styles.activeNavBarIcon : null]}>
                {tab.icon}
              </Text>
              <Text style={[styles.navBarLabel, isActive ? styles.activeNavBarLabel : null]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MODAL 1: ORDER DETAIL BOTTOM SHEET SHEET */}
      <Modal visible={orderSheetVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>📋 Order Detail Details</Text>
              <TouchableOpacity onPress={() => { setOrderSheetVisible(false); setOtpVerifyCode(''); }}>
                <Text style={styles.bottomSheetClose}>Close</Text>
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={{ maxHeight: SCREEN_WIDTH * 1.2 }}>
                <Text style={styles.sheetCustomerName}>{selectedOrder.customer?.fullName || 'Local Neighbor'}</Text>
                <Text style={styles.sheetSubText}>WhatsApp: +91 {selectedOrder.customer?.phoneNumber}</Text>
                <Text style={styles.sheetSubText}>Delivery Mode: {selectedOrder.deliveryType}</Text>

                {/* Simulated Mini Map widget */}
                <View style={styles.mapPlaceholderBox}>
                  <Text style={styles.mapEmoji}>📍</Text>
                  <Text style={styles.mapText}>Geopinned Delivery Coordinates</Text>
                  <Text style={styles.mapAddress}>{selectedOrder.customer?.address || 'Lucknow Market, India'}</Text>
                </View>

                {/* WhatsApp message trigger */}
                <TouchableOpacity 
                  style={styles.whatsappShortcutBtn}
                  onPress={() => handleContactCustomer(
                    selectedOrder.customer?.phoneNumber, 
                    `Hello ${selectedOrder.customer?.fullName}, this is ${shopProfile?.shopName}. Your order is being processed!`
                  )}
                >
                  <Text style={styles.whatsappShortcutText}>💬 Message Customer on WhatsApp</Text>
                </TouchableOpacity>

                {/* Products breakdown */}
                <Text style={styles.sheetSectionTitle}>Products Pack list</Text>
                <View style={styles.sheetItemsBox}>
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <View key={idx} style={styles.sheetItemRow}>
                      <Text style={styles.sheetItemName}>• {item.product?.name} x{item.quantity}</Text>
                      <Text style={styles.sheetItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.sheetDivider} />
                  <View style={styles.sheetItemRow}>
                    <Text style={{ fontWeight: 'bold', color: '#1F2937' }}>Order Total</Text>
                    <Text style={{ fontWeight: 'bold', color: '#1B5E20' }}>₹{parseFloat(selectedOrder.totalAmount).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Action Buttons depending on status */}
                {selectedOrder.status === 'READY' && (
                  <View style={styles.otpHandoffContainer}>
                    <Text style={styles.otpLabel}>Secure Delivery OTP Handoff Code</Text>
                    <Text style={styles.otpHelper}>Ask customer for the 4-digit code to complete delivery:</Text>
                    <TextInput
                      style={styles.otpVerifyInput}
                      keyboardType="numeric"
                      maxLength={4}
                      placeholder="e.g., 5839"
                      value={otpVerifyCode}
                      onChangeText={setOtpVerifyCode}
                    />
                    <TouchableOpacity 
                      style={styles.otpVerifyBtn} 
                      onPress={handleVerifyHandoffOtp}
                      disabled={completingOrder}
                    >
                      {completingOrder ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.otpVerifyBtnText}>Verify OTP & Complete Settlement</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {selectedOrder.status === 'RECEIVED' && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { flex: 1, marginRight: 8 }]}
                      onPress={() => handleUpdateOrderStatus(selectedOrder.id, 'CANCELLED')}
                    >
                      <Text style={styles.actionBtnOutlineText}>Reject Order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtnSolid, { flex: 1, marginLeft: 8 }]}
                      onPress={() => handleUpdateOrderStatus(selectedOrder.id, 'ACCEPTED')}
                    >
                      <Text style={styles.actionBtnSolidText}>Accept Order</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: PRODUCT EDIT BOTTOM SHEET SHEET */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>✏️ Edit Product Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.bottomSheetClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <View>
                <Text style={styles.editProdName}>{selectedProduct.name}</Text>
                <Text style={styles.editProdCat}>Category: {selectedProduct.category}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Selling Price (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={editPrice}
                    onChangeText={setEditPrice}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Stock Inventory Quantity</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={editStock}
                    onChangeText={setEditStock}
                  />
                </View>

                <View style={styles.availabilityRow}>
                  <Text style={styles.formLabel}>Product In-Stock Availability</Text>
                  <TouchableOpacity 
                    style={[styles.toggleSwitchBtn, editAvailable ? styles.toggleSwitchBtnActive : null]}
                    onPress={() => setEditAvailable(!editAvailable)}
                  >
                    <Text style={styles.toggleSwitchText}>{editAvailable ? 'In Stock' : 'Out of Stock'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.actionBtnSolid, { marginTop: 20 }]} 
                  onPress={handleSaveProductEdit}
                  disabled={updatingProduct}
                >
                  {updatingProduct ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionBtnSolidText}>Save Product Stock</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: FLOATING ADD PRODUCT SCREEN SHEET */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>➕ Add New Product</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.bottomSheetClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Product Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Britannia Marie Gold Biscuit"
                  placeholderTextColor="#9CA3AF"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              {/* Barcode scanner mock button */}
              <TouchableOpacity 
                style={styles.scannerMockBtn}
                onPress={() => {
                  Alert.alert('Scanner Active 📷', 'Scanning product barcode...');
                  setNewName('Cadbury Dairy Milk 100g');
                  setNewPrice('80');
                  setNewCategory('Snacks');
                }}
              >
                <Text style={styles.scannerMockText}>📷 Scan Barcode or Take Photo</Text>
              </TouchableOpacity>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Selling Price (₹)</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  placeholder="e.g. 20"
                  placeholderTextColor="#9CA3AF"
                  value={newPrice}
                  onChangeText={setNewPrice}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stock Count</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  placeholder="e.g. 50"
                  placeholderTextColor="#9CA3AF"
                  value={newStock}
                  onChangeText={setNewStock}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Dairy, Snacks, Grocery"
                  placeholderTextColor="#9CA3AF"
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
              </View>

              <TouchableOpacity 
                style={[styles.actionBtnSolid, { marginTop: 24 }]} 
                onPress={handleAddProduct}
                disabled={addingProduct}
              >
                {addingProduct ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionBtnSolidText}>Save Product to storefront</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: BULK EDIT DIALOG SHEET */}
      <Modal visible={bulkModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>📚 Bulk Edit ({selectedProductIds.length} Selected)</Text>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <Text style={styles.bottomSheetClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Set New Bulk Price (₹) - Leave blank to skip</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                placeholder="e.g. 100"
                placeholderTextColor="#9CA3AF"
                value={bulkPriceChange}
                onChangeText={setBulkPriceChange}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Set New Bulk Stock - Leave blank to skip</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor="#9CA3AF"
                value={bulkStockChange}
                onChangeText={setBulkStockChange}
              />
            </View>

            <TouchableOpacity 
              style={[styles.actionBtnSolid, { marginTop: 24 }]} 
              onPress={handleExecuteBulkUpdate}
            >
              <Text style={styles.actionBtnSolidText}>Apply Changes to Selected</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: ONDC SYNC CONFIRMATION SHEET */}
      <Modal visible={ondcModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>🌐 ONDC Sync Registry</Text>
              <TouchableOpacity onPress={() => setOndcModalVisible(false)}>
                <Text style={styles.bottomSheetClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {shopProfile?.saasPlan !== 'PREMIUM' ? (
              <View>
                <Text style={styles.ondcModalTitle}>⭐ Premium Sync Required</Text>
                <Text style={styles.ondcModalText}>
                  Syncing your store catalog to Paytm and PhonePe ONDC buyer networks is a premium feature. Please upgrade your SaaS billing plan first.
                </Text>
                <TouchableOpacity 
                  style={[styles.actionBtnSolid, { backgroundColor: '#FF6B00', marginTop: 16 }]} 
                  onPress={() => { setOndcModalVisible(false); handleUpgradePlan(); }}
                >
                  <Text style={styles.actionBtnSolidText}>Upgrade to Premium (₹799)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.ondcModalTitle}>Sync Storefront catalog</Text>
                <Text style={styles.ondcModalText}>
                  This will register your catalog database in ONDC gateway caches. Your stock price and details will update in Paytm and PhonePe within 5 minutes.
                </Text>
                <TouchableOpacity 
                  style={[styles.actionBtnSolid, { marginTop: 24 }]} 
                  onPress={handlePublishToOndc}
                >
                  <Text style={styles.actionBtnSolidText}>Sync to Paytm and PhonePe Now</Text>
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
  mainWrapper: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Soft Cream background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  tabContentContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollInnerContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 45 : 20,
    marginBottom: 20,
  },
  topHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B5E20', // Deep Green
  },
  topSubheading: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  toggleOpenBg: {
    backgroundColor: 'rgba(27, 94, 32, 0.15)', // Green tint
  },
  toggleClosedBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // Red tint
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  pulseOpenDot: {
    backgroundColor: '#1B5E20',
  },
  pulseClosedDot: {
    backgroundColor: '#EF4444',
  },
  toggleText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#1F2937',
  },
  heroCard: {
    backgroundColor: '#1B5E20', // Deep Green
    borderRadius: 12,
    padding: 24,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 24,
  },
  heroLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroEarnings: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 8,
  },
  heroTrendBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  heroTrendText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '800',
  },
  gridContainer: {
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statCard: {
    backgroundColor: '#FFFFFF', // Pure White
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 22,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B5E20',
  },
  seeAllLink: {
    color: '#FF6B00',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyPreviewText: {
    color: '#1B5E20',
    fontWeight: '700',
    fontSize: 14,
  },
  previewOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewCustomer: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  previewItemsCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  previewAcceptBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  previewAcceptText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  motivationalCard: {
    backgroundColor: '#FEF3C7', // Amber/Yellow
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  motivationalEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  motivationalText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  bottomTabNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#E5E7EB',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '20%',
  },
  navBarIcon: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  activeNavBarIcon: {
    color: '#FF6B00', // Saffron
  },
  navBarLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    marginTop: 2,
  },
  activeNavBarLabel: {
    color: '#FF6B00',
    fontWeight: '800',
  },
  ordersTabContainer: {
    flex: 1,
  },
  tabFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
    marginTop: Platform.OS === 'ios' ? 45 : 0,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF8F0',
  },
  activeFilterPill: {
    borderColor: '#FF6B00',
    backgroundColor: '#FF6B00',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B5E20',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  newOrderCardBorder: {
    borderColor: '#FF6B00',
    borderLeftWidth: 5,
  },
  newPulseLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B00',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newPulseText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  orderTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  orderCustomer: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 6,
  },
  orderDeliveryType: {
    fontSize: 13,
    color: '#1B5E20',
    fontWeight: '700',
    marginTop: 2,
  },
  orderItemsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orderItemRowText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    lineHeight: 18,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1B5E20',
  },
  statusTagBadge: {
    fontSize: 10,
    fontWeight: '800',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orderBadgeRow: {
    flexDirection: 'row',
  },
  cardActionsContainer: {
    marginTop: 14,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtnOutline: {
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlineText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 15,
  },
  actionBtnSolid: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSolidText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  inventoryTabContainer: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 45 : 0,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    margin: 16,
    marginBottom: 6,
  },
  searchBarIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchBarInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  inventoryFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  bulkEditBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bulkEditBannerText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 13,
  },
  bulkActionBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  bulkActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  productRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  selectedProductRow: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  bulkCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bulkCheckboxActive: {
    borderColor: '#FF6B00',
    backgroundColor: '#FF6B00',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  productIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productIconEmoji: {
    fontSize: 22,
  },
  productDetailsColumn: {
    flex: 1,
  },
  productRowName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  productRowCategory: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    marginTop: 1,
  },
  productRowPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B5E20',
    marginTop: 2,
  },
  stockStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthyDot: {
    backgroundColor: '#10B981',
  },
  lowDot: {
    backgroundColor: '#F59E0B',
  },
  outDot: {
    backgroundColor: '#EF4444',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '800',
  },
  healthyText: {
    color: '#10B981',
  },
  lowText: {
    color: '#F59E0B',
  },
  outText: {
    color: '#EF4444',
  },
  editPencilBtn: {
    padding: 6,
  },
  editPencilIcon: {
    fontSize: 16,
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 76,
    right: 20,
    backgroundColor: '#FF6B00',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 99,
  },
  floatingAddText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  earningsToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 4,
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 45 : 0,
  },
  earningsToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeEarningsToggleBtn: {
    backgroundColor: '#1B5E20',
  },
  earningsToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  activeEarningsToggleText: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 16,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  barItemColumn: {
    alignItems: 'center',
    width: '15%',
  },
  barValText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 4,
  },
  chartBar: {
    width: 14,
    backgroundColor: '#1B5E20',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartBarSaffron: {
    backgroundColor: '#FF6B00',
  },
  barLabelText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    marginTop: 6,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 18,
    marginBottom: 20,
  },
  breakdownCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settlementDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  settlementType: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    marginTop: 1,
  },
  settlementAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
  },
  settlementBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  settlementBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#1B5E20',
  },
  nextPayoutCard: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  nextPayoutLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '800',
  },
  nextPayoutVal: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  profileHeaderBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 24,
    marginBottom: 16,
    marginTop: Platform.OS === 'ios' ? 45 : 0,
  },
  profilePhotoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1B5E20',
    marginBottom: 12,
  },
  profilePhotoEmoji: {
    fontSize: 32,
  },
  profileShopName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B5E20',
  },
  profileShopAddress: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
    marginTop: 2,
  },
  planBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
  },
  premiumBadgeBg: {
    backgroundColor: '#FF6B00',
  },
  basicBadgeBg: {
    backgroundColor: '#6B7280',
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  previewStorefrontBtn: {
    backgroundColor: '#FFF8F0',
    borderColor: '#1B5E20',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewStorefrontBtnText: {
    color: '#1B5E20',
    fontWeight: '800',
    fontSize: 14,
  },
  ondcSyncCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 18,
    marginBottom: 20,
  },
  ondcTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E20',
  },
  ondcStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ondcStatusDotActive: {
    backgroundColor: '#10B981',
  },
  ondcStatusDotMuted: {
    backgroundColor: '#9CA3AF',
  },
  ondcDesc: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 10,
    fontWeight: '600',
  },
  ondcSyncBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ondcSyncBtnDisabled: {
    backgroundColor: '#374151',
  },
  ondcSyncBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  settingItemValue: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  referralBtn: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1.5,
    borderColor: '#FF6B00',
  },
  referralBtnText: {
    color: '#FF6B00',
    fontWeight: '800',
    fontSize: 14,
  },
  versionText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 20,
  },
  logoutBtn: {
    borderColor: '#EF4444',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 100,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#FFF8F0', // Soft Cream background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 8,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B5E20',
  },
  bottomSheetClose: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  sheetCustomerName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
  },
  sheetSubText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
    marginTop: 2,
  },
  mapPlaceholderBox: {
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  mapEmoji: {
    fontSize: 24,
  },
  mapText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
    marginTop: 4,
  },
  mapAddress: {
    fontSize: 11,
    color: '#1E3A8A',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  whatsappShortcutBtn: {
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  whatsappShortcutText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sheetSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 8,
  },
  sheetItemsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 20,
  },
  sheetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sheetItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  sheetItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E20',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  otpHandoffContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  otpLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FF6B00',
  },
  otpHelper: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  otpVerifyInput: {
    backgroundColor: '#FFF8F0',
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 8,
  },
  otpVerifyBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  otpVerifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  editProdName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F2937',
  },
  editProdCat: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  toggleSwitchBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  toggleSwitchBtnActive: {
    backgroundColor: '#10B981',
  },
  toggleSwitchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scannerMockBtn: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  scannerMockText: {
    color: '#4B5563',
    fontWeight: '800',
    fontSize: 13,
  },
  ondcModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E20',
  },
  ondcModalText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
  },
});
