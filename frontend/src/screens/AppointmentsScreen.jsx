import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { IconCalendarEvent, IconCheck, IconX, IconClock } from '@tabler/icons-react-native';

export default function AppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState({ as_client: [], as_provider: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchMyAppointments();
    }, [])
  );

  async function fetchMyAppointments() {
    try {
      const response = await api.get('/my-appointments');
      setAppointments(response.data || { as_client: [], as_provider: [] });
    } catch (error) {
      console.log('Error fetching appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchMyAppointments();
  }

  async function handleAppointmentStatus(appointmentId, status) {
    try {
      await api.post(`/appointments/${appointmentId}/status`, { status });
      Alert.alert('Success', `Appointment marked as ${status}!`);
      fetchMyAppointments();
    } catch (error) {
      Alert.alert('Error', 'Could not update appointment status.');
    }
  }

  function renderAppointmentCard({ item }) {
    const isClient = item.client_id === user?.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.partyText, { color: colors.subText }]}>
          {isClient ? `Service Provider: ${item.provider?.name || 'N/A'}` : `Client: ${item.client?.name || 'N/A'}`}
        </Text>

        <View style={styles.timeRow}>
          <IconClock size={16} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.text }]}>
            {item.appointment_date} at {item.time_slot}
          </Text>
        </View>

        {item.notes ? (
          <Text style={[styles.noteText, { backgroundColor: colors.bg, color: colors.subText }]}>
            "{item.notes}"
          </Text>
        ) : null}

        {!isClient && item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => handleAppointmentStatus(item.id, 'confirmed')}
            >
              <IconCheck size={14} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirm Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleAppointmentStatus(item.id, 'cancelled')}
            >
              <IconX size={14} color="#c62828" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const allAppointments = [...(appointments.as_client || []), ...(appointments.as_provider || [])];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={allAppointments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAppointmentCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <IconCalendarEvent size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>No service appointments booked yet.</Text>
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
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: '#eee' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  status_pending: { backgroundColor: '#fff3e0' },
  status_confirmed: { backgroundColor: '#e8f5e9' },
  status_cancelled: { backgroundColor: '#ffebee' },
  partyText: { fontSize: 13, marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  timeText: { fontSize: 13, fontWeight: '600' },
  noteText: { padding: 8, borderRadius: 6, fontSize: 12, fontStyle: 'italic', marginVertical: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2e7d32', paddingVertical: 8, borderRadius: 6 },
  confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ffebee', paddingVertical: 8, borderRadius: 6 },
  cancelBtnText: { color: '#c62828', fontSize: 12, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
