import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  IconBox, IconPencil, IconTrash, IconPlus,
  IconCheck, IconX, IconTag
} from '@tabler/icons-react-native';

export default function MyListingsScreen({ navigation }) {
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
      fetchMyListings(1);
    }, [])
  );

  async function fetchMyListings(pageNum = 1, isRefresh = false) {
    if (pageNum === 1) {
      if (!isRefresh) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await api.get('/my-listings', { params: { page: pageNum } });
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
      console.log('Error fetching my listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  function handleLoadMore() {
    if (!loading && !loadingMore && hasMore) {
      fetchMyListings(page + 1);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchMyListings(1, true);
  }

  async function toggleStatus(listing) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/listings/${listing.id}/toggle-status`);
      const newStatus = listing.status === 'available' ? 'SOLD' : 'AVAILABLE';
      showToast(`Listing marked as ${newStatus}!`, 'success');
      fetchMyListings(1);
    } catch (error) {
      showToast('Could not update listing status.', 'error');
    }
  }

  async function deleteListing(id) {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          try {
            await api.delete(`/listings/${id}`);
            showToast('Listing deleted', 'info');
            fetchMyListings(1);
          } catch (error) {
            showToast('Could not delete listing.', 'error');
          }
        }
      }
    ]);
  }

  function renderListingItem({ item }) {
    const isAvailable = item.status === 'available';

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          {item.image ? (
            <Image
              source={{ uri: getImageUrl(item.image) }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={[styles.noImageThumb, { backgroundColor: colors.bg }]}>
              <IconBox size={24} color={colors.subTextLight} />
            </View>
          )}

          <View style={styles.cardDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: isAvailable ? '#e8f5e9' : '#ffebee' }]}>
                <Text style={[styles.statusText, { color: isAvailable ? '#2e7d32' : '#c62828' }]}>
                  {isAvailable ? 'AVAILABLE' : 'SOLD'}
                </Text>
              </View>
            </View>

            <Text style={[styles.price, { color: colors.primary }]}>
              GH₵ {item.price}
            </Text>

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {item.category && (
                <View style={[styles.miniBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.miniBadgeText, { color: colors.primary }]}>{item.category.name}</Text>
                </View>
              )}
              {item.course_code ? (
                <View style={[styles.miniBadge, { backgroundColor: '#e3f2fd' }]}>
                  <Text style={[styles.miniBadgeText, { color: '#1565c0' }]}>{item.course_code}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isAvailable ? '#fff3e0' : '#e8f5e9' }]}
            onPress={() => toggleStatus(item)}
          >
            {isAvailable ? (
              <>
                <IconCheck size={14} color="#e65100" />
                <Text style={[styles.actionBtnText, { color: '#e65100' }]}>Mark Sold</Text>
              </>
            ) : (
              <>
                <IconTag size={14} color="#2e7d32" />
                <Text style={[styles.actionBtnText, { color: '#2e7d32' }]}>Mark Available</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.inputBg }]}
            onPress={() => navigation.navigate('EditListing', { listing: item })}
          >
            <IconPencil size={14} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#ffebee' }]}
            onPress={() => deleteListing(item.id)}
          >
            <IconTrash size={14} color="#c62828" />
            <Text style={[styles.actionBtnText, { color: '#c62828' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderListingItem}
          contentContainerStyle={styles.listContainer}
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
            <View style={styles.emptyBox}>
              <IconBox size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>You haven't posted any listings yet.</Text>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateListing')}
              >
                <IconPlus size={18} color="#fff" />
                <Text style={styles.createBtnText}>Post New Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { padding: 16 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', padding: 12, gap: 12 },
  thumbnail: { width: 70, height: 70, borderRadius: 8 },
  noImageThumb: { width: 70, height: 70, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardDetails: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  price: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 10, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, padding: 8, gap: 8, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
