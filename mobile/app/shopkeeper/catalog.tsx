import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/localization';
import { API_ROUTES } from '../../src/config/api';

const PRODUCT_CATEGORIES = [
  'Grocery',
  'Dairy & Bread',
  'Snacks & Biscuits',
  'Beverages',
  'Vegetables & Fruits',
  'Personal Care',
];

export default function ShopkeeperCatalog() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Shopkeeper identification
  const [shopkeeperId, setShopkeeperId] = useState((params.shopkeeperId as string) || '');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState('');

  // UI state
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch shop's products
  const fetchProducts = async () => {
    if (!shopkeeperId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_ROUTES.products}?shopkeeperId=${shopkeeperId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.data);
      } else {
        Alert.alert('Error', 'Failed to load products list.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopkeeperId) {
      fetchProducts();
    }
  }, [shopkeeperId]);

  // Handle adding new product
  const handleAddProduct = async () => {
    if (!shopkeeperId) {
      Alert.alert('ID Required', 'Please enter a valid Shopkeeper ID.');
      return;
    }

    if (!name || !price || !stockQuantity) {
      Alert.alert('Details Missing', 'Please fill in the product Name, Price, and Stock.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(API_ROUTES.products, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopkeeperId,
          name,
          description,
          price: parseFloat(price),
          stockQuantity: parseInt(stockQuantity),
          category,
          imageUrl: imageUrl || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Success ✓', 'Product successfully added.');
        setName('');
        setDescription('');
        setPrice('');
        setStockQuantity('');
        setImageUrl('');
        fetchProducts(); // Refresh inventory list
      } else {
        Alert.alert('Error', data.message || 'Failed to add product.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Server Error', 'Failed to add product. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🏪 Catalog Manager</Text>
      <Text style={styles.subtitle}>Manage your store inventory items</Text>

      {/* Shopkeeper ID Settings */}
      <View style={styles.card}>
        <Text style={styles.label}>Store ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste Shopkeeper ID here"
          placeholderTextColor={COLORS.textMuted}
          value={shopkeeperId}
          onChangeText={setShopkeeperId}
        />
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchProducts}>
          <Text style={styles.refreshBtnText}>🔄 Load Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Add New Product Form */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Add New Product</Text>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Aashirvaad Atta 5kg, Amul Butter 100g"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Short Description</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., fresh stock, pack of 2"
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 150"
              placeholderTextColor={COLORS.textMuted}
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Stock Quantity *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 20"
              placeholderTextColor={COLORS.textMuted}
              value={stockQuantity}
              onChangeText={setStockQuantity}
            />
          </View>
        </View>

        <Text style={styles.label}>Select Category</Text>
        <View style={styles.categoryContainer}>
          {PRODUCT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catBadge, category === cat && styles.catBadgeActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catBadgeText, category === cat && styles.catBadgeTextActive]}>
                {cat.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Image URL (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/photo.jpg"
          placeholderTextColor={COLORS.textMuted}
          value={imageUrl}
          onChangeText={setImageUrl}
        />

        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddProduct}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.addBtnText}>🏪 Add to Store Catalog</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Inventory List */}
      <View style={styles.inventorySection}>
        <Text style={styles.inventoryTitle}>Your Inventory ({products.length} Items)</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : products.length === 0 ? (
          <Text style={styles.emptyText}>No products found in this store catalog. Please add items above.</Text>
        ) : (
          products.map((item) => (
            <View key={item.id} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{item.name}</Text>
                <Text style={styles.prodMeta}>Price: ₹{item.price} • Stock: {item.stockQuantity} units</Text>
                <Text style={styles.prodCat}>{item.category.split(' ')[0]}</Text>
              </View>
              {item.stockQuantity === 0 && (
                <View style={styles.outBadge}>
                  <Text style={styles.outBadgeText}>OUT OF STOCK</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => router.replace('/shopkeeper/dashboard')}
      >
        <Text style={styles.backBtnText}>Go Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 10,
  },
  label: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
  },
  refreshBtn: {
    backgroundColor: COLORS.border,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  refreshBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  catBadge: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  catBadgeActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#064E3B',
  },
  catBadgeText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  catBadgeTextActive: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 18,
  },
  addBtnText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  inventorySection: {
    marginTop: 10,
  },
  inventoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  productRow: {
    backgroundColor: COLORS.cardBackground,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prodName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  prodMeta: {
    color: COLORS.accent,
    fontSize: 12,
    marginTop: 2,
  },
  prodCat: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  outBadge: {
    backgroundColor: '#991B1B',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  outBadgeText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: 'bold',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
});
