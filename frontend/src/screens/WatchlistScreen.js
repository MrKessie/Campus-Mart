import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function WatchlistScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchWatchlist();
    }, [])
  );

  async function fetchWatchlist() {
    try {
      const response = await api.get('/watchlist');
      setListings(response.data.data || response.data);
    } catch (error) {
      console.log('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function removeFromWatchlist(listingId) {
    try {
      await api.delete(`/watchlist/${listingId}`);
      setListings(prev => prev.filter(item => item.id !== listingId));
    } catch (error) {
      Alert.alert('Error', 'Could not remove listing.');
    }
  }

  function renderItem({ item }) {
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
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardPrice}>GHC {item.price}</Text>
          <Text style={styles.cardCategory}>{item.category?.name}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromWatchlist(item.id)}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Watchlist</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6600" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWatchlist(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No saved listings yet.</Text>
              <Text style={styles.emptySubText}>Tap the bookmark icon on any listing to save it.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#FF6600', padding: 16, paddingTop: 48 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  card: { flex: 1, backgroundColor: '#fff', margin: 6, borderRadius: 8, overflow: 'hidden', elevation: 2 },
  cardImage: { width: '100%', height: 120 },
  noImage: { width: '100%', height: 120, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#999' },
  cardInfo: { padding: 8 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  cardPrice: { color: '#FF6600', fontWeight: 'bold', marginTop: 4 },
  cardCategory: { color: '#999', fontSize: 12, marginTop: 2 },
  removeButton: { marginTop: 8, backgroundColor: '#ffebee', borderRadius: 6, padding: 6, alignItems: 'center' },
  removeButtonText: { color: '#c62828', fontSize: 12, fontWeight: 'bold' },
  listContent: { padding: 6 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: '#bbb', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});