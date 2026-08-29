import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api, { getImageUrl } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { IconPackage, IconTrash, IconBookmark } from '@tabler/icons-react-native';

export default function WatchlistScreen({ navigation }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchWatchlist(1);
    }, [])
  );

  async function fetchWatchlist(pageNum = 1, isRefresh = false) {
    if (pageNum === 1) {
      if (!isRefresh) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await api.get('/watchlist', { params: { page: pageNum } });
      const responseData = response.data;
      const newItems = responseData.data || (Array.isArray(responseData) ? responseData : []);
      const currentPage = responseData.current_page || pageNum;
      const lastPage = responseData.last_page || (newItems.length < 15 ? currentPage : currentPage + 1);

      if (pageNum === 1) {
        setListings(newItems);
      } else {
        setListings(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const filtered = newItems.filter(item => !existingIds.has(item.id));
          return [...prev, ...filtered];
        });
      }

      setPage(currentPage);
      setHasMore(currentPage < lastPage);
    } catch (error) {
      console.log('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  function handleLoadMore() {
    if (!loading && !loadingMore && hasMore) {
      fetchWatchlist(page + 1);
    }
  }

  async function removeFromWatchlist(listingId) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.delete(`/watchlist/${listingId}`);
      setListings(prev => prev.filter(item => item.id !== listingId));
      showToast('Removed from Watchlist', 'info');
    } catch (error) {
      showToast('Could not remove listing.', 'error');
    }
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={() => navigation.navigate('ListingDetail', { listing: item })}
      >
        {item.image ? (
          <Image
            source={{ uri: getImageUrl(item.image) }}
            style={styles.cardImage}
          />
        ) : (
          <View style={[styles.noImage, { backgroundColor: colors.bg }]}>
            <IconPackage size={32} color={colors.subTextLight} />
            <Text style={[styles.noImageText, { color: colors.subTextLight }]}>No Image</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardPrice, { color: colors.primary }]}>GH₵ {item.price}</Text>
          <Text style={[styles.cardCategory, { color: colors.subTextLight }]}>{item.category?.name}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromWatchlist(item.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <IconTrash size={12} color="#c62828" />
              <Text style={styles.removeButtonText}>Remove</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>My Watchlist</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
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
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWatchlist(1, true); }} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconBookmark size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No saved listings yet.</Text>
              <Text style={[styles.emptySubText, { color: colors.subTextLight }]}>Tap the bookmark icon on any listing to save it.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 44 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  listContent: { padding: 8 },
  card: { flex: 1, margin: 6, borderRadius: 8, overflow: 'hidden', elevation: 2, borderWidth: 1 },
  cardImage: { width: '100%', height: 120 },
  noImage: { width: '100%', height: 120, justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 12 },
  cardInfo: { padding: 10 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  cardPrice: { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  cardCategory: { fontSize: 12, marginBottom: 8 },
  removeButton: { backgroundColor: '#ffebee', borderRadius: 4, paddingVertical: 4, alignItems: 'center' },
  removeButtonText: { color: '#c62828', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, padding: 32 },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});