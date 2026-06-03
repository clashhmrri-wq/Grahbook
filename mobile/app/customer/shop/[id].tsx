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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../src/constants/localization';
import { API_ROUTES } from '../../../src/config/api';

export default function ShopDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Shopkeeper ID

  // Shop & product states
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart state: Record of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});

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
      Alert.alert('Connection Error', 'Store data load karne mein problem aayi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
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
    const itemsList: string[] = [];

    Object.entries(cart).forEach(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        totalItems += qty;
        totalPrice += qty * parseFloat(product.price);
        itemsList.push(`- ${product.name} x ${qty} (₹${(qty * parseFloat(product.price)).toFixed(0)})`);
      }
    });

    return { totalItems, totalPrice, itemsList };
  };

  // Compile cart details and redirect to WhatsApp prefilled text
  const handleWhatsAppOrder = () => {
    const { totalPrice, itemsList } = getCartTotals();
    
    if (totalItemsCount === 0) {
      Alert.alert('Cart Empty', 'Kripya pehle cart mein products add karein.');
      return;
    }

    if (!shop?.phoneNumber) {
      Alert.alert('Error', 'Shopkeeper ka number nahi mila.');
      return;
    }

    // Hinglish text formatting for WhatsApp-native checkout
    const message = `*GrahakBook Order 🏪*\n` +
      `Namaste! Main GrahakBook App se order bhejna chahta hoon:\n` +
      `---------------------------------\n` +
      `${itemsList.join('\n')}\n` +
      `---------------------------------\n` +
      `*Total Amount: ₹${totalPrice.toFixed(2)}*\n\n` +
      `*Mera Address:* [Kripya apna address enter karein]\n` +
      `---------------------------------\n` +
      `GrahakBook se seedhe order - zero customer delivery commissions!`;

    // Format phone number (prepending country code 91 if not present)
    let formattedPhone = shop.phoneNumber;
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('WhatsApp Error', 'Aapke phone mein WhatsApp installed nahi hai.');
        }
      })
      .catch((err) => {
        console.error(err);
        Alert.alert('Error', 'WhatsApp open karne mein problem aayi.');
      });
  };

  const { totalItems: totalItemsCount, totalPrice: totalPriceCount } = getCartTotals();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Dukaan ki list aur items load ho rahe hain...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dukaan details nahi mil payin.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Vapas Jayein</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Shop Info Header */}
        <View style={styles.header}>
          <Text style={styles.shopName}>🏪 {shop.shopName}</Text>
          <Text style={styles.shopOwner}>Owner: {shop.ownerName}</Text>
          <Text style={styles.shopAddress}>{shop.address}, {shop.city}</Text>
          <Text style={styles.whatsappNotice}>📞 WhatsApp: {shop.phoneNumber}</Text>
        </View>

        {/* Product Catalog list */}
        <View style={styles.catalogSection}>
          <Text style={styles.sectionTitle}>Browse Items (सामान की लिस्ट)</Text>

          {products.length === 0 ? (
            <Text style={styles.emptyText}>Dukaan par abhi koi stock available nahi hai.</Text>
          ) : (
            products.map((item) => {
              const qtyInCart = cart[item.id] || 0;
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                    <Text style={styles.itemPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
                    <Text style={styles.itemCat}>{item.category.split(' ')[0]}</Text>
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
      </ScrollView>

      {/* Floating Cart & WhatsApp native Checkout Panel */}
      {totalItemsCount > 0 && (
        <View style={styles.checkoutBar}>
          <View style={styles.checkoutInfo}>
            <Text style={styles.checkoutQty}>{totalItemsCount} Items</Text>
            <Text style={styles.checkoutPrice}>₹{totalPriceCount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.whatsappCheckoutBtn} onPress={handleWhatsAppOrder}>
            <Text style={styles.whatsappCheckoutText}>WhatsApp Order (व्हाट्सएप भेजें) 💬</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 100, // Leave room for checkout bar
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
  header: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    marginTop: 20,
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  shopOwner: {
    fontSize: 14,
    color: COLORS.text,
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
    marginTop: 8,
  },
  catalogSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 30,
  },
  itemCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  itemCat: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  cartControl: {
    marginLeft: 14,
  },
  addCartBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  qtyBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  qtyVal: {
    color: COLORS.text,
    fontSize: 13,
    paddingHorizontal: 6,
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
    fontSize: 18,
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
});
