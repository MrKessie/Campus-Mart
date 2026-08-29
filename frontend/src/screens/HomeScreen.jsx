import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, RefreshControl, ScrollView, Alert, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  IconSearch, IconBook, IconDeviceMobile, IconShirt,
  IconSoup, IconArmchair, IconPencil, IconSchool,
  IconCamera, IconPalette, IconScissors, IconCar, IconBox,
  IconBellRinging, IconHeart, IconHeartFilled, IconX,
  IconFlame, IconSparkles, IconTag, IconAdjustmentsHorizontal,
  IconPackage, IconCheck
} from '@tabler/icons-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;

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

const FILTER_TAGS = [
  { id: 'all', label: 'All Items', icon: IconFlame },
  { id: 'recent', label: 'Newest', icon: IconSparkles },
  { id: 'under50', label: 'Under GH₵ 50', icon: IconTag },
  { id: 'textbooks', label: 'Course Books', icon: IconBook },
  { id: 'services', label: 'Services', icon: IconSchool },
];

export default function HomeScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeFilterTag, setActiveFilterTag] = useState('all');
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showToast } = useToast();

  // 350ms debounce for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch when debouncedSearch or category changes
  useEffect(() => {
    fetchListings(1, debouncedSearch, selectedCategory);
  }, [debouncedSearch, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchWatchlist();
    }, [])
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isSaved) {
        setSavedIds(prev => prev.filter(id => id !== listingId));
        showToast('Removed from Watchlist', 'info');
        await api.delete(`/watchlist/${listingId}`);
      } else {
        setSavedIds(prev => [...prev, listingId]);
        showToast('Saved to Watchlist ❤️', 'success');
        await api.post('/watchlist', { listing_id: listingId });
      }
    } catch (e) {
      console.log('Error toggling watchlist:', e);
      showToast('Could not update watchlist', 'error');
    }
  }

  async function fetchListings(pageNum = 1, searchTerm = debouncedSearch, categoryId = selectedCategory, isRefresh = false) {
    if (pageNum === 1) {
      if (!isRefresh) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = { page: pageNum };
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryId) params.category_id = categoryId;
      const response = await api.get('/listings', { params });
      
      const responseData = response.data;
      const newItems = responseData.data || (Array.isArray(responseData) ? responseData : []);
      const currentPage = responseData.current_page || pageNum;
      const lastPage = responseData.last_page || (newItems.length < 15 ? currentPage : currentPage + 1);

      if (pageNum === 1) {
        setListings(newItems);
      } else {
        setListings(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const filteredNew = newItems.filter(i => !existingIds.has(i.id));
          return [...prev, ...filteredNew];
        });
      }

      setPage(currentPage);
      setHasMore(currentPage < lastPage);
    } catch (error) {
      console.log('Error fetching listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  function handleLoadMore() {
    if (!loading && !loadingMore && hasMore) {
      fetchListings(page + 1, debouncedSearch, selectedCategory);
    }
  }

  function handleSearch() {
    setDebouncedSearch(search);
  }

  function clearSearch() {
    setSearch('');
    setDebouncedSearch('');
  }

  function handleCategoryPress(categoryId) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
  }

  function handleFilterTagPress(tagId) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilterTag(tagId);
  }

  function onRefresh() {
    setRefreshing(true);
    fetchListings(1, debouncedSearch, selectedCategory, true);
    fetchWatchlist();
  }

  async function saveSearchAlert() {
    if (!search.trim()) {
      showToast('Please enter a search keyword first', 'warning');
      return;
    }
    try {
      await api.post('/saved-searches', {
        keyword: search.trim(),
        category_id: selectedCategory,
      });
      showToast(`Search alert saved for "${search.trim()}" 🔔`, 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not save search alert.', 'error');
    }
  }

  // Client-side quick filter tags
  const displayedListings = useMemo(() => {
    let result = [...listings];
    if (activeFilterTag === 'under50') {
      result = result.filter(item => Number(item.price) <= 50);
    } else if (activeFilterTag === 'textbooks') {
      result = result.filter(item => item.course_code || item.category?.name === 'Textbooks');
    } else if (activeFilterTag === 'services') {
      result = result.filter(item => item.is_service === 1 || ['Tutoring', 'Photography', 'Graphic Design', 'Hair & Beauty', 'Transport'].includes(item.category?.name));
    } else if (activeFilterTag === 'recent') {
      result = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return result;
  }, [listings, activeFilterTag]);

  function renderSkeleton() {
    return (
      <View style={styles.skeletonGrid}>
        {[1, 2, 3, 4].map(idx => (
          <View key={idx} style={[styles.skeletonCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
            <View style={{ padding: 10 }}>
              <View style={[styles.skeletonLine, { width: '80%', backgroundColor: colors.border }]} />
              <View style={[styles.skeletonLine, { width: '45%', marginTop: 8, backgroundColor: colors.border }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderListing({ item }) {
    const isSaved = savedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            shadowColor: colors.cardShadow || '#000',
          }
        ]}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ListingDetail', { listing: item })}
      >
        <View style={styles.cardImageContainer}>
          {item.image ? (
            <Image
              source={{ uri: getImageUrl(item.image) }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.noImage, { backgroundColor: colors.bg }]}>
              <IconBox size={28} color={colors.subTextLight} />
              <Text style={[styles.noImageText, { color: colors.subTextLight }]}>No Photo</Text>
            </View>
          )}

          {/* Top badges on image */}
          <View style={styles.imageOverlayTop}>
            {item.course_code ? (
              <View style={styles.courseBadge}>
                <Text style={styles.courseBadgeText}>{item.course_code}</Text>
              </View>
            ) : item.category?.name ? (
              <View style={[styles.categoryTag, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.categoryTagText, { color: colors.primary }]}>{item.category.name}</Text>
              </View>
            ) : <View />}

            <TouchableOpacity
              style={styles.cardHeartBtn}
              onPress={() => toggleWatchlist(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isSaved ? (
                <IconHeartFilled size={18} color="#e53935" />
              ) : (
                <IconHeart size={18} color="rgba(0,0,0,0.5)" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.cardBottomRow}>
            <View style={styles.pricePill}>
              <Text style={[styles.cardPrice, { color: colors.primary }]}>
                GH₵ {item.price}
              </Text>
            </View>
            {item.user?.name ? (
              <Text style={[styles.sellerName, { color: colors.subTextLight }]} numberOfLines={1}>
                {item.user.name.split(' ')[0]}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search & Top Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.cardBg }]}>
            <IconSearch size={18} color={colors.subTextLight} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search textbooks, electronics..."
              placeholderTextColor={colors.subTextLight}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={{ padding: 4, marginRight: 2 }}>
                <IconX size={16} color={colors.subTextLight} />
              </TouchableOpacity>
            )}
            {search.trim().length > 0 && (
              <TouchableOpacity onPress={saveSearchAlert} style={styles.alertBtn}>
                <IconBellRinging size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Category Pills Carousel */}
      <View style={[styles.categorySection, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {/* All Category Pill */}
          <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => handleCategoryPress(null)}
          >
            <View style={[
              styles.categoryIconCircle,
              { backgroundColor: selectedCategory === null ? colors.primary : colors.bg, borderColor: colors.border }
            ]}>
              <IconFlame size={20} color={selectedCategory === null ? '#fff' : colors.subText} />
            </View>
            <Text
              style={[
                styles.categoryLabel,
                { color: selectedCategory === null ? colors.primary : colors.text, fontWeight: selectedCategory === null ? 'bold' : '500' }
              ]}
              numberOfLines={1}
            >
              All
            </Text>
          </TouchableOpacity>

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
                  {
                    backgroundColor: isSelected ? colors.primary : colors.bg,
                    borderColor: isSelected ? colors.primary : colors.border
                  }
                ]}>
                  <IconComponent size={20} color={isSelected ? '#fff' : colors.subText} />
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? 'bold' : '500' }
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Quick Filter / Sort Chips */}
      <View style={[styles.filterBar, { backgroundColor: colors.bg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TAGS.map(tag => {
            const TagIcon = tag.icon;
            const isActive = activeFilterTag === tag.id;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.cardBg,
                    borderColor: isActive ? colors.primary : colors.border
                  }
                ]}
                onPress={() => handleFilterTagPress(tag.id)}
              >
                <TagIcon size={14} color={isActive ? '#fff' : colors.subText} style={{ marginRight: 4 }} />
                <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.subText, fontWeight: isActive ? 'bold' : '600' }]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Feed Header */}
      <View style={styles.feedHeader}>
        <Text style={[styles.feedTitle, { color: colors.text }]}>
          {selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.name : 'Campus Feed'}
        </Text>
        <Text style={[styles.feedCount, { color: colors.subTextLight }]}>
          {displayedListings.length} {displayedListings.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Listings Grid */}
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={displayedListings}
          keyExtractor={item => item.id.toString()}
          renderItem={renderListing}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center', width: '100%' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconPackage size={52} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No items found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subTextLight }]}>
                {search ? `No listings match "${search}"` : 'Try selecting another category or filter.'}
              </Text>
              {(search || selectedCategory || activeFilterTag !== 'all') && (
                <TouchableOpacity
                  style={[styles.resetBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => {
                    setSearch('');
                    setSelectedCategory(null);
                    setActiveFilterTag('all');
                    fetchListings('', null);
                  }}
                >
                  <Text style={[styles.resetBtnText, { color: colors.primary }]}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 44 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  alertBtn: { padding: 4, marginLeft: 2 },

  categorySection: { paddingVertical: 12, borderBottomWidth: 1 },
  categoryScroll: { paddingHorizontal: 12 },
  categoryItem: { alignItems: 'center', marginHorizontal: 5, width: 62 },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 11, textAlign: 'center' },

  filterBar: { paddingVertical: 8 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12 },

  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  feedTitle: { fontSize: 16, fontWeight: 'bold' },
  feedCount: { fontSize: 12 },

  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  card: {
    width: CARD_WIDTH,
    margin: 6,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageContainer: {
    width: '100%',
    height: 135,
    position: 'relative',
    backgroundColor: '#eaeaea',
  },
  cardImage: { width: '100%', height: '100%' },
  noImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 11, marginTop: 4 },
  imageOverlayTop: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseBadge: {
    backgroundColor: '#1E3A5F',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  courseBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  categoryTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryTagText: { fontSize: 9, fontWeight: 'bold' },
  cardHeartBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cardInfo: { padding: 10 },
  cardTitle: { fontWeight: '600', fontSize: 13, minHeight: 34, lineHeight: 17 },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  pricePill: {},
  cardPrice: { fontWeight: 'bold', fontSize: 15 },
  sellerName: { fontSize: 11, maxWidth: 60 },

  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    margin: 6,
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  skeletonImage: { width: '100%', height: 130 },
  skeletonLine: { height: 12, borderRadius: 6 },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resetBtnText: { fontSize: 13, fontWeight: 'bold' },
});