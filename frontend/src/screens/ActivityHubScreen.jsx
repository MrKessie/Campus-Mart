import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  IconTag, IconShieldCheck, IconCalendarEvent, IconCheck, IconX,
  IconClock, IconArrowUpRight, IconArrowDownLeft, IconInbox,
  IconPackage, IconAlertCircle, IconHourglassHigh
} from '@tabler/icons-react-native';

export default function ActivityHubScreen({ route, navigation }) {
  const { initialTab } = route.params || {};
  const [mainTab, setMainTab] = useState(initialTab || 'offers'); // 'offers' | 'escrow' | 'bookings'
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showToast } = useToast();

  // Sub-tab states
  const [offersSubTab, setOffersSubTab] = useState('received'); // 'received' | 'sent'
  const [escrowSubTab, setEscrowSubTab] = useState('buyer'); // 'buyer' | 'seller'
  const [bookingsSubTab, setBookingsSubTab] = useState('provider'); // 'provider' | 'client'

  // Data states
  const [offers, setOffers] = useState({ sent: [], received: [] });
  const [escrows, setEscrows] = useState({ as_buyer: [], as_seller: [] });
  const [appointments, setAppointments] = useState({ as_client: [], as_provider: [] });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [])
  );

  async function fetchAllData() {
    try {
      const [offersRes, escrowsRes, appointmentsRes] = await Promise.all([
        api.get('/my-offers'),
        api.get('/my-escrows'),
        api.get('/my-appointments'),
      ]);

      setOffers(offersRes.data || { sent: [], received: [] });
      setEscrows(escrowsRes.data || { as_buyer: [], as_seller: [] });
      setAppointments(appointmentsRes.data || { as_client: [], as_provider: [] });
    } catch (error) {
      console.log('Error fetching activity hub data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchAllData();
  }

  // --- Offers Actions ---
  async function handleOfferResponse(offerId, status) {
    Haptics.notificationAsync(
      status === 'accepted' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    try {
      await api.post(`/offers/${offerId}/respond`, { status });
      showToast(`Offer ${status}!`, status === 'accepted' ? 'success' : 'info');
      fetchAllData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not update offer.', 'error');
    }
  }

  // --- Escrow Actions ---
  async function handleReleaseEscrow(escrowId) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.post(`/escrow/${escrowId}/release`);
      showToast('Escrow Payment Released! 🎉', 'success');
      fetchAllData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not release escrow payment.', 'error');
    }
  }

  // --- Appointment Actions ---
  async function handleAppointmentStatus(appointmentId, status) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/appointments/${appointmentId}/status`, { status });
      showToast(`Appointment marked as ${status}!`, 'info');
      fetchAllData();
    } catch (error) {
      showToast('Could not update appointment status.', 'error');
    }
  }

  // Pending count badges
  const pendingOffersCount = (offers.received || []).filter(o => o.status === 'pending').length;
  const activeEscrowsCount = (escrows.as_buyer || []).filter(e => e.status === 'held_in_escrow').length;
  const pendingBookingsCount = (appointments.as_provider || []).filter(a => a.status === 'pending').length;

  // --- Render Functions ---
  function renderOfferCard({ item }) {
    const isReceived = offersSubTab === 'received';
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
            <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.partyText, { color: colors.subText }]}>
          {isReceived ? 'From Buyer: ' : 'To Seller: '}
          <Text style={{ fontWeight: 'bold', color: colors.text }}>
            {isReceived ? item.buyer?.name : item.seller?.name}
          </Text>
        </Text>

        <View style={styles.priceRow}>
          <Text style={[styles.priceHighlight, { color: colors.text }]}>
            Offered: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>GH₵ {item.offer_price}</Text>
          </Text>
          {item.listing?.price ? (
            <Text style={[styles.originalPrice, { color: colors.subTextLight }]}>
              Listing: GH₵ {item.listing.price}
            </Text>
          ) : null}
        </View>

        {item.message ? (
          <Text style={[styles.noteBox, { backgroundColor: colors.bg, color: colors.subText }]}>
            "{item.message}"
          </Text>
        ) : null}

        {isReceived && item.status === 'pending' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#059669' }]}
              onPress={() => handleOfferResponse(item.id, 'accepted')}
            >
              <IconCheck size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Accept Offer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}
              onPress={() => handleOfferResponse(item.id, 'declined')}
            >
              <IconX size={14} color="#dc2626" />
              <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function renderEscrowCard({ item }) {
    const isBuyer = escrowSubTab === 'buyer';
    const isReleased = item.status === 'released';

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: isReleased ? '#d1fae5' : '#fef3c7' }]}>
            <Text style={[styles.statusBadgeText, { color: isReleased ? '#059669' : '#d97706' }]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.priceHighlight, { color: colors.text }]}>
          Amount Held: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>GH₵ {item.amount}</Text>
        </Text>

        <Text style={[styles.partyText, { color: colors.subText }]}>
          {isBuyer ? `Seller: ${item.seller?.name || 'N/A'}` : `Buyer: ${item.buyer?.name || 'N/A'}`}
        </Text>

        <Text style={[styles.refText, { color: colors.subTextLight }]}>
          Paystack Ref: {item.reference}
        </Text>

        {isBuyer && item.status === 'held_in_escrow' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#059669', marginTop: 10 }]}
            onPress={() => handleReleaseEscrow(item.id)}
          >
            <IconCheck size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Confirm Delivery & Release Payment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderAppointmentCard({ item }) {
    const isClient = item.client_id === user?.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
            <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.partyText, { color: colors.subText }]}>
          {isClient ? `Provider: ${item.provider?.name || 'N/A'}` : `Client: ${item.client?.name || 'N/A'}`}
        </Text>

        <View style={styles.timeRow}>
          <IconClock size={16} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.text }]}>
            {item.appointment_date} at {item.time_slot}
          </Text>
        </View>

        {item.notes ? (
          <Text style={[styles.noteBox, { backgroundColor: colors.bg, color: colors.subText }]}>
            "{item.notes}"
          </Text>
        ) : null}

        {!isClient && item.status === 'pending' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#059669' }]}
              onPress={() => handleAppointmentStatus(item.id, 'confirmed')}
            >
              <IconCheck size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Confirm Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}
              onPress={() => handleAppointmentStatus(item.id, 'cancelled')}
            >
              <IconX size={14} color="#dc2626" />
              <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Get current active data
  const currentOffers = offersSubTab === 'received' ? (offers.received || []) : (offers.sent || []);
  const currentEscrows = escrowSubTab === 'buyer' ? (escrows.as_buyer || []) : (escrows.as_seller || []);
  const currentBookings = bookingsSubTab === 'provider' ? (appointments.as_provider || []) : (appointments.as_client || []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Main Segmented Navigation Bar */}
      <View style={[styles.mainTabBar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'offers' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setMainTab('offers')}
        >
          <View style={{ position: 'relative' }}>
            <IconTag size={18} color={mainTab === 'offers' ? colors.primary : colors.subText} />
            {pendingOffersCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingOffersCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.mainTabBtnText, { color: mainTab === 'offers' ? colors.primary : colors.subText }]}>
            Price Offers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'escrow' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setMainTab('escrow')}
        >
          <View style={{ position: 'relative' }}>
            <IconShieldCheck size={18} color={mainTab === 'escrow' ? colors.primary : colors.subText} />
            {activeEscrowsCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: '#059669' }]}>
                <Text style={styles.tabBadgeText}>{activeEscrowsCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.mainTabBtnText, { color: mainTab === 'escrow' ? colors.primary : colors.subText }]}>
            Escrow Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'bookings' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setMainTab('bookings')}
        >
          <View style={{ position: 'relative' }}>
            <IconCalendarEvent size={18} color={mainTab === 'bookings' ? colors.primary : colors.subText} />
            {pendingBookingsCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingBookingsCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.mainTabBtnText, { color: mainTab === 'bookings' ? colors.primary : colors.subText }]}>
            Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-tab Pill Switcher */}
      <View style={styles.subTabContainer}>
        {mainTab === 'offers' && (
          <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.subTabBtn, offersSubTab === 'received' && { backgroundColor: colors.primary }]}
              onPress={() => setOffersSubTab('received')}
            >
              <IconInbox size={15} color={offersSubTab === 'received' ? '#fff' : colors.subText} />
              <Text style={[styles.subTabText, { color: offersSubTab === 'received' ? '#fff' : colors.subText }]}>
                Received ({offers.received?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, offersSubTab === 'sent' && { backgroundColor: colors.primary }]}
              onPress={() => setOffersSubTab('sent')}
            >
              <IconArrowUpRight size={15} color={offersSubTab === 'sent' ? '#fff' : colors.subText} />
              <Text style={[styles.subTabText, { color: offersSubTab === 'sent' ? '#fff' : colors.subText }]}>
                Sent ({offers.sent?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mainTab === 'escrow' && (
          <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.subTabBtn, escrowSubTab === 'buyer' && { backgroundColor: colors.primary }]}
              onPress={() => setEscrowSubTab('buyer')}
            >
              <IconArrowUpRight size={15} color={escrowSubTab === 'buyer' ? '#fff' : colors.subText} />
              <Text style={[styles.subTabText, { color: escrowSubTab === 'buyer' ? '#fff' : colors.subText }]}>
                Payments Made ({escrows.as_buyer?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, escrowSubTab === 'seller' && { backgroundColor: colors.primary }]}
              onPress={() => setEscrowSubTab('seller')}
            >
              <IconArrowDownLeft size={15} color={escrowSubTab === 'seller' ? '#fff' : colors.subText} />
              <Text style={[styles.subTabText, { color: escrowSubTab === 'seller' ? '#fff' : colors.subText }]}>
                Received ({escrows.as_seller?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mainTab === 'bookings' && (
          <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.subTabBtn, bookingsSubTab === 'provider' && { backgroundColor: colors.primary }]}
              onPress={() => setBookingsSubTab('provider')}
            >
              <IconCalendarEvent size={15} color={bookingsSubTab === 'provider' ? '#fff' : colors.subText} />
              <Text style={[styles.subTabText, { color: bookingsSubTab === 'provider' ? '#fff' : colors.subText }]}>
                Client Bookings ({appointments.as_provider?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, bookingsSubTab === 'client' && { backgroundColor: colors.primary }]}
              onPress={() => setBookingsSubTab('client')}
            >
              <IconClock size={15} color={bookingsSubTab === 'client' ? '#fff' : colors.subText} />
              <Text style={[styles.subTabText, { color: bookingsSubTab === 'client' ? '#fff' : colors.subText }]}>
                My Requests ({appointments.as_client?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Content List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={
            mainTab === 'offers' ? currentOffers :
            mainTab === 'escrow' ? currentEscrows :
            currentBookings
          }
          keyExtractor={(item) => item.id.toString()}
          renderItem={
            mainTab === 'offers' ? renderOfferCard :
            mainTab === 'escrow' ? renderEscrowCard :
            renderAppointmentCard
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconPackage size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No records found</Text>
              <Text style={[styles.emptyStateSub, { color: colors.subTextLight }]}>
                {mainTab === 'offers' ? 'No price negotiations in this tab.' :
                 mainTab === 'escrow' ? 'No escrow payment records found.' :
                 'No service booking appointments yet.'}
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
  mainTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  mainTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  mainTabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#e53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  subTabContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  subTabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  subTabText: { fontSize: 12, fontWeight: 'bold' },

  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#eee' },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  status_pending: { backgroundColor: '#fef3c7' },
  status_accepted: { backgroundColor: '#d1fae5' },
  status_confirmed: { backgroundColor: '#d1fae5' },
  status_declined: { backgroundColor: '#fee2e2' },
  status_cancelled: { backgroundColor: '#fee2e2' },

  partyText: { fontSize: 13, marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  priceHighlight: { fontSize: 13 },
  originalPrice: { fontSize: 12 },
  refText: { fontSize: 11, marginTop: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  timeText: { fontSize: 13, fontWeight: '600' },
  noteBox: { padding: 8, borderRadius: 8, fontSize: 12, fontStyle: 'italic', marginVertical: 6 },

  actionButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyStateTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  emptyStateSub: { fontSize: 13, textAlign: 'center' },
});
