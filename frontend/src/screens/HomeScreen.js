import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, RefreshControl, ScrollView, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconSearch, IconBook, IconDeviceMobile, IconShirt,
  IconSoup, IconArmchair, IconPencil, IconSchool,
  IconCamera, IconPalette, IconScissors, IconCar, IconBox, IconPlus,
  IconBellRinging, IconHeart, IconHeartFilled
} from '@tabler/icons-react-native';

const CATEGORIES = [
  { id: 1, name: 'Textbooks', icon: IconBook },
  { id: 2, name: 'Electronics', icon: IconDeviceMobile },
  { id: 3, name: 'Clothing', icon: IconShirt },
  { id: 4, name: 'Food & Drinks', icon: IconSoup },
  { id: 5, name: 'Furniture', icon: IconArmchair },
  { id: 6, name: 'Stationery', icon: IconPencil },
  { id: 7, name: 'Tutoring', icon: IconSchool },
  { id: 8, name: 'Photography', icon: IconCamera },
  { id: 9, name: 'Graphic Design', icon: IconPalette },
  { id: 10, name: 'Hair & Beauty', icon: IconScissors },
  { id: 11, name: 'Transport', icon: IconCar },
  { id: 12, name: 'Other', icon: IconBox },
];

export default function HomeScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user } = useAuth();
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchListings(search, selectedCategory);
      fetchWatchlist();
    }, [search, selectedCategory])
  );

  async function fetchWatchlist() {
    try {
      const response = await api.get('/watchlist');
      const list = response.data.data || response.data || [];
      setSavedIds(list.map(item => item.id));
    } catch (e) {
      console.log('Error fetching watchlist:', e);
    }
  }

  async function toggleWatchlist(listingId) {
    const isSaved = savedIds.includes(listingId);
    try {
      if (isSaved) {
        setSavedIds(prev => prev.filter(id => id !== listingId));
        await api.delete(`/watchlist/${listingId}`);
      } else {
        setSavedIds(prev => [...prev, listingId]);
        await api.post('/watchlist', { listing_id: listingId });
      }
    } catch (e) {
      console.log('Error toggling watchlist:', e);
    }
  }

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

  async function saveSearchAlert() {
    if (!search.trim()) {
      Alert.alert('Empty Search', 'Please enter a keyword to save a search alert.');
      return;
    }
    try {
      await api.post('/saved-searches', {
        keyword: search.trim(),
        category_id: selectedCategory,
      });
      Alert.alert('Search Alert Saved! 🔔', `We will notify you whenever new items matching "${search.trim()}" are posted.`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not save search alert.');
    }
  }

  function renderListing({ item }) {
    const isSaved = savedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={() => navigation.navigate('ListingDetail', { listing: item })}
      >
        <View style={{ position: 'relative' }}>
          {item.image ? (
            <Image
              source={{ uri: getImageUrl(item.image) }}
              style={styles.cardImage}
            />
          ) : (
            <View style={[styles.noImage, { backgroundColor: colors.bg }]}>
              <IconBox size={32} color={colors.subTextLight} />
              <Text style={[styles.noImageText, { color: colors.subTextLight }]}>No Image</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cardHeartBtn}
            onPress={() => toggleWatchlist(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isSaved ? (
              <IconHeartFilled size={20} color="#e53935" />
            ) : (
              <IconHeart size={20} color="rgba(0,0,0,0.5)" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cardInfo}>
          {item.course_code ? (
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>{item.course_code}</Text>
            </View>
          ) : null}
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.cardPrice, { color: colors.primary }]}>GH₵ {item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
            <IconSearch size={18} color={colors.subTextLight} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search CampusMart..."
              placeholderTextColor={colors.subTextLight}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
            />
            {search.trim().length > 0 && (
              <TouchableOpacity onPress={saveSearchAlert} style={{ padding: 4 }}>
                <IconBellRinging size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Category Pills */}
      <View style={[styles.categorySection, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map(cat => {
            const IconComponent = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(cat.id)}
              >
                <View style={[
                  styles.categoryIconCircle,
                  { backgroundColor: isSelected ? colors.primary : colors.primaryLight }
                ]}>
                  <IconComponent size={22} color={isSelected ? '#fff' : colors.primary} />
                </View>
                <Text style={[styles.categoryLabel, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: colors.bannerBg }]}>
        <Text style={styles.bannerText}>🎓 UEW Student Marketplace</Text>
        <Text style={styles.bannerSubtext}>Buy & Sell with fellow students</Text>
      </View>

      {/* Post Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('CreateListing')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <IconPlus size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.createButtonText}>Post a Listing</Text>
        </View>
      </TouchableOpacity>

      {/* Listings Grid */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id.toString()}
          renderItem={renderListing}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.subTextLight }]}>No listings found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, paddingTop: 44 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: 14 },

  categorySection: { paddingVertical: 10, borderBottomWidth: 1 },
  categoryScroll: { paddingHorizontal: 8 },
  categoryItem: { alignItems: 'center', marginHorizontal: 6, width: 64 },
  categoryIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  categoryLabel: { fontSize: 10, textAlign: 'center' },

  banner: { margin: 10, borderRadius: 8, padding: 14, alignItems: 'center' },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bannerSubtext: { color: '#ccc', fontSize: 12, marginTop: 2 },

  createButton: { marginHorizontal: 10, marginBottom: 8, borderRadius: 8, padding: 12, alignItems: 'center' },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  card: { flex: 1, margin: 5, borderRadius: 6, overflow: 'hidden', elevation: 2, borderWidth: 1 },
  cardImage: { width: '100%', height: 130 },
  cardHeartBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', zIndex: 10, elevation: 3 },
  noImage: { width: '100%', height: 130, justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 12 },
  cardInfo: { padding: 8 },
  courseBadge: { alignSelf: 'flex-start', backgroundColor: '#e3f2fd', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  courseBadgeText: { color: '#1565c0', fontSize: 10, fontWeight: 'bold' },
  cardTitle: { fontWeight: '500', fontSize: 13, minHeight: 34 },
  cardPrice: { fontWeight: 'bold', fontSize: 15, marginTop: 6 },

  listContent: { padding: 5 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});