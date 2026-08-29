import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconTag, IconCheck, IconX, IconArrowBackUp, IconArrowUpRight, IconInbox
} from '@tabler/icons-react-native';

export default function PriceOffersScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [offers, setOffers] = useState({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchMyOffers();
    }, [])
  );

  async function fetchMyOffers() {
    try {
      const response = await api.get('/my-offers');
      setOffers(response.data || { sent: [], received: [] });
    } catch (error) {
      console.log('Error fetching my offers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchMyOffers();
  }

  async function handleOfferResponse(offerId, status) {
    try {
      await api.post(`/offers/${offerId}/respond`, { status });
      Alert.alert('Success', `Offer ${status}!`);
      fetchMyOffers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not update offer.');
    }
  }

  function renderOfferCard({ item }) {
    const isReceived = activeTab === 'received';

    return (
      <View style={[styles.offerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.offerCardHeader}>
          <Text style={[styles.offerTitle, { color: colors.text }]} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.offerPartyText, { color: colors.subText }]}>
          {isReceived ? 'Buyer: ' : 'Seller: '}
          <Text style={{ fontWeight: 'bold', color: colors.text }}>
            {isReceived ? item.buyer?.name : item.seller?.name}
          </Text>
        </Text>

        <View style={styles.priceRow}>
          <Text style={[styles.offerPriceText, { color: colors.text }]}>
            Offered Price: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>GH₵ {item.offer_price}</Text>
          </Text>
          {item.listing?.price && (
            <Text style={[styles.originalPriceText, { color: colors.subTextLight }]}>
              Listing Price: GH₵ {item.listing.price}
            </Text>
          )}
        </View>

        {item.message ? (
          <Text style={[styles.offerNote, { backgroundColor: colors.bg, color: colors.subText }]}>
            "{item.message}"
          </Text>
        ) : null}

        {isReceived && item.status === 'pending' && (
          <View style={styles.offerActionRow}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleOfferResponse(item.id, 'accepted')}
            >
              <IconCheck size={14} color="#fff" />
              <Text style={styles.acceptBtnText}>Accept Offer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleOfferResponse(item.id, 'declined')}
            >
              <IconX size={14} color="#c62828" />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const currentData = activeTab === 'received' ? (offers.received || []) : (offers.sent || []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Segmented Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'received' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('received')}
        >
          <IconInbox size={16} color={activeTab === 'received' ? '#fff' : colors.subText} />
          <Text style={[styles.tabBtnText, { color: activeTab === 'received' ? '#fff' : colors.subText }]}>
            Received ({offers.received?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'sent' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('sent')}
        >
          <IconArrowUpRight size={16} color={activeTab === 'sent' ? '#fff' : colors.subText} />
          <Text style={[styles.tabBtnText, { color: activeTab === 'sent' ? '#fff' : colors.subText }]}>
            Sent ({offers.sent?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOfferCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <IconTag size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                {activeTab === 'received' ? 'No price offers received yet.' : 'No price offers sent yet.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', padding: 6, margin: 16, borderRadius: 10, borderWidth: 1, gap: 6 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  tabBtnText: { fontSize: 13, fontWeight: 'bold' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  offerCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  offerCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  offerTitle: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: '#eee' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  status_pending: { backgroundColor: '#fff3e0' },
  status_accepted: { backgroundColor: '#e8f5e9' },
  status_declined: { backgroundColor: '#ffebee' },
  offerPartyText: { fontSize: 13, marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  offerPriceText: { fontSize: 14 },
  originalPriceText: { fontSize: 12 },
  offerNote: { padding: 8, borderRadius: 6, fontSize: 12, fontStyle: 'italic', marginVertical: 6 },
  offerActionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2e7d32', paddingVertical: 8, borderRadius: 6 },
  acceptBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ffebee', paddingVertical: 8, borderRadius: 6 },
  declineBtnText: { color: '#c62828', fontSize: 12, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
