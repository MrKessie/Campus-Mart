import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { id: 1, name: 'Textbooks', icon: '📚' },
  { id: 2, name: 'Electronics', icon: '📱' },
  { id: 3, name: 'Clothing', icon: '👕' },
  { id: 4, name: 'Food & Drinks', icon: '🍔' },
  { id: 5, name: 'Furniture', icon: '🪑' },
  { id: 6, name: 'Stationery', icon: '✏️' },
  { id: 7, name: 'Tutoring', icon: '🎓' },
  { id: 8, name: 'Photography', icon: '📷' },
  { id: 9, name: 'Graphic Design', icon: '🎨' },
  { id: 10, name: 'Hair & Beauty', icon: '💇' },
  { id: 11, name: 'Transport', icon: '🚗' },
  { id: 12, name: 'Other', icon: '📦' },
];

export default function HomeScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings(searchTerm = '', categoryId = null) {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (categoryId) params.category_id = categoryId;
      const response = await api.get('/listings', { params });
      setListings(response.data.data || response.data);
    } catch (error) {
      console.log('Error fetching listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSearch() {
    setLoading(true);
    fetchListings(search, selectedCategory);
  }

  function handleCategoryPress(categoryId) {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    setLoading(true);
    fetchListings(search, newCategory);
  }

  function onRefresh() {
    setRefreshing(true);
    fetchListings(search, selectedCategory);
  }

  function renderListing({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ListingDetail', { listing: item })}
      >
        {item.image ? (
          <Image
            source={{ uri: `http://10.204.39.81:8000/storage/${item.image}` }}
            style={styles.cardImage}
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardPrice}>GH₵ {item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Orange Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search CampusMart"
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
            />
          </View>
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categorySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => handleCategoryPress(cat.id)}
            >
              <View style={[
                styles.categoryIconCircle,
                selectedCategory === cat.id && styles.categoryIconCircleActive
              ]}>
                <Text style={styles.categoryIconText}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryLabel} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Flash Sale style banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>🎓 UEW Student Marketplace</Text>
        <Text style={styles.bannerSubtext}>Buy & Sell with fellow students</Text>
      </View>

      {/* Post Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateListing')}
      >
        <Text style={styles.createButtonText}>+ Post a Listing</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6600" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderListing}
          numColumns={2}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No listings found.</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: { backgroundColor: '#FF6600', paddingTop: 48, paddingBottom: 12, paddingHorizontal: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 10, height: 40 },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  headerIcon: { fontSize: 24 },

  categorySection: { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  categoryScroll: { paddingHorizontal: 8 },
  categoryItem: { alignItems: 'center', marginHorizontal: 6, width: 64 },
  categoryIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF1E6', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  categoryIconCircleActive: { backgroundColor: '#FF6600' },
  categoryIconText: { fontSize: 22 },
  categoryLabel: { fontSize: 10, color: '#333', textAlign: 'center' },

  banner: { backgroundColor: '#1E3A5F', margin: 10, borderRadius: 8, padding: 14, alignItems: 'center' },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bannerSubtext: { color: '#ccc', fontSize: 12, marginTop: 2 },

  createButton: { backgroundColor: '#FF6600', marginHorizontal: 10, marginBottom: 8, borderRadius: 8, padding: 12, alignItems: 'center' },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  card: { flex: 1, backgroundColor: '#fff', margin: 5, borderRadius: 6, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  cardImage: { width: '100%', height: 130 },
  noImage: { width: '100%', height: 130, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#999', fontSize: 12 },
  cardInfo: { padding: 8 },
  cardTitle: { fontWeight: '500', fontSize: 13, color: '#333', minHeight: 34 },
  cardPrice: { color: '#FF6600', fontWeight: 'bold', fontSize: 15, marginTop: 6 },

  listContent: { padding: 5 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 },
});