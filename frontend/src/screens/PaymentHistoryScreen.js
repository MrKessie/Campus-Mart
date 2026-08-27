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
  IconShieldCheck, IconCheck, IconArrowDownLeft, IconArrowUpRight
} from '@tabler/icons-react-native';

export default function PaymentHistoryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('buyer'); // 'buyer' | 'seller'
  const [escrows, setEscrows] = useState({ as_buyer: [], as_seller: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchMyEscrows();
    }, [])
  );

  async function fetchMyEscrows() {
    try {
      const response = await api.get('/my-escrows');
      setEscrows(response.data || { as_buyer: [], as_seller: [] });
    } catch (error) {
      console.log('Error fetching escrows:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchMyEscrows();
  }

  async function handleReleaseEscrow(escrowId) {
    try {
      await api.post(`/escrow/${escrowId}/release`);
      Alert.alert('Escrow Released! 🎉', 'Payment has been released to the seller.');
      fetchMyEscrows();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not release escrow payment.');
    }
  }

  function renderEscrowCard({ item }) {
    const isBuyer = activeTab === 'buyer';
    const isReleased = item.status === 'released';

    return (
      <View style={[styles.escrowCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: isReleased ? '#e8f5e9' : '#fff3e0' }]}>
            <Text style={[styles.statusText, { color: isReleased ? '#2e7d32' : '#e65100' }]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.amountText, { color: colors.text }]}>
          Amount: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>GH₵ {item.amount}</Text>
        </Text>

        <Text style={[styles.partyText, { color: colors.subText }]}>
          {isBuyer ? `Seller: ${item.seller?.name || 'N/A'}` : `Buyer: ${item.buyer?.name || 'N/A'}`}
        </Text>

        <Text style={[styles.refText, { color: colors.subTextLight }]}>
          Reference: {item.reference}
        </Text>

        {isBuyer && item.status === 'held_in_escrow' && (
          <TouchableOpacity
            style={[styles.releaseBtn, { backgroundColor: '#2e7d32' }]}
            onPress={() => handleReleaseEscrow(item.id)}
          >
            <IconCheck size={16} color="#fff" />
            <Text style={styles.releaseBtnText}>Release Payment to Seller</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const currentData = activeTab === 'buyer' ? (escrows.as_buyer || []) : (escrows.as_seller || []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Segmented Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'buyer' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('buyer')}
        >
          <IconArrowUpRight size={16} color={activeTab === 'buyer' ? '#fff' : colors.subText} />
          <Text style={[styles.tabBtnText, { color: activeTab === 'buyer' ? '#fff' : colors.subText }]}>
            Payments Made ({escrows.as_buyer?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'seller' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('seller')}
        >
          <IconArrowDownLeft size={16} color={activeTab === 'seller' ? '#fff' : colors.subText} />
          <Text style={[styles.tabBtnText, { color: activeTab === 'seller' ? '#fff' : colors.subText }]}>
            Payments Received ({escrows.as_seller?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEscrowCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <IconShieldCheck size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                {activeTab === 'buyer' ? 'No escrow payments made yet.' : 'No escrow payments received yet.'}
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
  escrowCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  amountText: { fontSize: 14, marginBottom: 4 },
  partyText: { fontSize: 12, marginBottom: 4 },
  refText: { fontSize: 11, marginBottom: 6 },
  releaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  releaseBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
