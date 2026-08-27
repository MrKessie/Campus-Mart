import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput, Modal, Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconStarFilled, IconTrophy, IconPencil,
  IconLogout, IconMoon, IconSun, IconBellRinging,
  IconShieldCheck, IconCalendarEvent, IconTag, IconBox, IconChevronRight
} from '@tabler/icons-react-native';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [stats, setStats] = useState({
    listingsCount: 0,
    pendingOffersCount: 0,
    escrowsCount: 0,
    appointmentsCount: 0,
    searchesCount: 0,
  });

  useFocusEffect(
    useCallback(() => {
      fetchDashboardStats();
    }, [])
  );

  async function fetchDashboardStats() {
    try {
      const [listingsRes, offersRes, escrowsRes, appointmentsRes, searchesRes] = await Promise.all([
        api.get('/my-listings'),
        api.get('/my-offers'),
        api.get('/my-escrows'),
        api.get('/my-appointments'),
        api.get('/saved-searches'),
      ]);

      const listingsArr = listingsRes.data.data || listingsRes.data || [];
      const sentPending = (offersRes.data.sent || []).filter(o => o.status === 'pending').length;
      const receivedPending = (offersRes.data.received || []).filter(o => o.status === 'pending').length;
      const escrowsArr = [...(escrowsRes.data.as_buyer || []), ...(escrowsRes.data.as_seller || [])];
      const appointmentsArr = [...(appointmentsRes.data.as_client || []), ...(appointmentsRes.data.as_provider || [])];
      const searchesArr = searchesRes.data || [];

      setStats({
        listingsCount: listingsArr.length,
        pendingOffersCount: sentPending + receivedPending,
        escrowsCount: escrowsArr.length,
        appointmentsCount: appointmentsArr.length,
        searchesCount: searchesArr.length,
      });
    } catch (e) {
      console.log('Error fetching stats:', e);
    }
  }

  async function saveProfile() {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      const response = await api.put('/me', {
        name: editName,
        phone: editPhone,
      });
      if (updateUser) await updateUser(response.data.user);
      Alert.alert('Success', 'Profile updated successfully!');
      setEditModal(false);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Profile Header Card */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.themeToggleRow}>
            {isDark ? <IconMoon size={18} color="#FF6600" /> : <IconSun size={18} color="#fff" />}
            <Text style={[styles.themeToggleText, { color: '#fff' }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: 'rgba(255,255,255,0.4)', true: '#FF6600' }}
              thumbColor={isDark ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone && <Text style={styles.phone}>{user?.phone}</Text>}

        <View style={styles.ratingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconStarFilled size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {user?.average_rating || 0} ({user?.rating_count || 0} reviews)
            </Text>
          </View>
        </View>

        <View style={styles.trustRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconTrophy size={16} color="#FFD700" />
            <Text style={styles.trustScore}>Trust Score: {user?.trust_score || 50}/100</Text>
          </View>
          <Text style={styles.trustLevel}>{user?.trust_level || 'Member'}</Text>
        </View>

        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => {
            setEditName(user?.name || '');
            setEditPhone(user?.phone || '');
            setEditModal(true);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconPencil size={15} color="#FF6600" />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Navigation Menu List */}
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.subText }]}>ACCOUNT DASHBOARD</Text>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => navigation.navigate('MyListings')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF1E6' }]}>
              <IconBox size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.menuTitle, { color: colors.text }]}>My Listings</Text>
              <Text style={[styles.menuSub, { color: colors.subTextLight }]}>{stats.listingsCount} posted items</Text>
            </View>
          </View>
          <IconChevronRight size={20} color={colors.subTextLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => navigation.navigate('PriceOffers')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#fff3e0' }]}>
              <IconTag size={20} color="#e65100" />
            </View>
            <View>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Price Offers</Text>
              <Text style={[styles.menuSub, { color: colors.subTextLight }]}>
                {stats.pendingOffersCount > 0 ? `${stats.pendingOffersCount} pending offers` : 'Sent & received offers'}
              </Text>
            </View>
          </View>
          {stats.pendingOffersCount > 0 && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{stats.pendingOffersCount}</Text>
            </View>
          )}
          <IconChevronRight size={20} color={colors.subTextLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
              <IconShieldCheck size={20} color="#2e7d32" />
            </View>
            <View>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Payment & Escrow History</Text>
              <Text style={[styles.menuSub, { color: colors.subTextLight }]}>{stats.escrowsCount} transactions</Text>
            </View>
          </View>
          <IconChevronRight size={20} color={colors.subTextLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Appointments')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
              <IconCalendarEvent size={20} color="#1565c0" />
            </View>
            <View>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Service Appointments</Text>
              <Text style={[styles.menuSub, { color: colors.subTextLight }]}>{stats.appointmentsCount} bookings</Text>
            </View>
          </View>
          <IconChevronRight size={20} color={colors.subTextLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => navigation.navigate('SavedSearches')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#f3e5f5' }]}>
              <IconBellRinging size={20} color="#7b1fa2" />
            </View>
            <View>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Search Alerts</Text>
              <Text style={[styles.menuSub, { color: colors.subTextLight }]}>{stats.searchesCount} active alerts</Text>
            </View>
          </View>
          <IconChevronRight size={20} color={colors.subTextLight} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <IconLogout size={18} color="#fff" />
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Full Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor={colors.subTextLight}
            />

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Phone Number</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Enter phone number"
              placeholderTextColor={colors.subTextLight}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => setEditModal(false)}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={saveProfile}
                disabled={savingProfile}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 44, alignItems: 'center' },
  topHeaderRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  themeToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  themeToggleText: { fontSize: 12, fontWeight: 'bold' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 4 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FF6600' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  phone: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  ratingRow: { marginTop: 8 },
  ratingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  trustScore: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  trustLevel: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  editProfileBtn: { marginTop: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  editProfileBtnText: { color: '#FF6600', fontSize: 12, fontWeight: 'bold' },

  menuSection: { padding: 16 },
  menuSectionTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  menuTitle: { fontSize: 15, fontWeight: 'bold' },
  menuSub: { fontSize: 12, marginTop: 1 },
  menuBadge: { backgroundColor: '#d32f2f', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginRight: 6 },
  menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#d32f2f', marginHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginTop: 10 },
  logoutBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  modalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
});