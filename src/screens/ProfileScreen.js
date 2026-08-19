import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert, TextInput, Modal
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchMyListings();
    fetchMyRatings();
  }, []);

  async function fetchMyListings() {
    try {
      const response = await api.get('/my-listings');
      setListings(response.data.data || response.data);
    } catch (error) {
      console.log('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyRatings() {
    try {
      const response = await api.get(`/users/${user.id}/ratings`);
      setRatings(response.data.ratings?.data || []);
    } catch (error) {
      console.log('Error fetching ratings:', error);
    }
  }

  async function toggleStatus(listing) {
    try {
      await api.post(`/listings/${listing.id}/toggle-status`);
      fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Could not update listing status.');
    }
  }

  async function deleteListing(id) {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/listings/${id}`);
            fetchMyListings();
          } catch (error) {
            Alert.alert('Error', 'Could not delete listing.');
          }
        }
      }
    ]);
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
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone && <Text style={styles.phone}>{user?.phone}</Text>}
        <View style={styles.ratingRow}>
  <Text style={styles.ratingText}>
    ⭐ {user?.average_rating || 0} ({user?.rating_count || 0} reviews)
  </Text>
</View>
<View style={styles.trustRow}>
  <Text style={styles.trustScore}>🏆 Trust Score: {user?.trust_score || 0}/100</Text>
  <Text style={styles.trustLevel}>{user?.trust_level || 'New Member'}</Text>
</View>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => {
            setEditName(user?.name || '');
            setEditPhone(user?.phone || '');
            setEditModal(true);
          }}
        >
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* My Listings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Listings</Text>
        {loading ? (
          <ActivityIndicator color="#FF6600" />
        ) : listings.length === 0 ? (
          <Text style={styles.emptyText}>No listings yet.</Text>
        ) : (
          listings.map(item => (
            <View key={item.id} style={styles.listingCard}>
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.listingPrice}>GHC {item.price}</Text>
                <View style={[styles.statusBadge,
                  item.status === 'available' ? styles.statusAvailable : styles.statusSold]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.listingActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EditListing', { listing: item })}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => toggleStatus(item)}
                >
                  <Text style={styles.toggleButtonText}>
                    {item.status === 'available' ? 'Mark Sold' : 'Mark Available'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteListing(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews Received</Text>
        {ratings.length === 0 ? (
          <Text style={styles.emptyText}>No reviews yet.</Text>
        ) : (
          ratings.map(item => (
            <View key={item.id} style={styles.reviewCard}>
              <Text style={styles.reviewStars}>{'⭐'.repeat(item.stars)}</Text>
              <Text style={styles.reviewText}>{item.review || 'No comment'}</Text>
              <Text style={styles.reviewAuthor}>— {item.buyer?.name}</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.modalLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
            />

            <Text style={styles.modalLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. 0241234567"
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveButtonText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#FF6600', padding: 24, alignItems: 'center', paddingTop: 48 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#FF6600' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#fff', fontSize: 14, marginBottom: 4, opacity: 0.85 },
  phone: { color: '#fff', fontSize: 14, marginBottom: 8, opacity: 0.85 },
  ratingRow: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 12 },
  ratingText: { color: '#fff', fontSize: 14 },
  trustRow: { marginTop: 8, alignItems: 'center' },
trustScore: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
trustLevel: { color: '#ffe0cc', fontSize: 12, marginTop: 2 },
  editProfileBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  editProfileBtnText: { color: '#FF6600', fontWeight: 'bold', fontSize: 14 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  emptyText: { color: '#999', textAlign: 'center', padding: 16 },
  listingCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  listingInfo: { marginBottom: 8 },
  listingTitle: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  listingPrice: { color: '#FF6600', fontWeight: 'bold', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  statusAvailable: { backgroundColor: '#e8f5e9' },
  statusSold: { backgroundColor: '#ffebee' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  listingActions: { flexDirection: 'row', gap: 8 },
  editButton: { flex: 1, backgroundColor: '#FFF1E6', borderRadius: 6, padding: 8, alignItems: 'center' },
  editButtonText: { color: '#FF6600', fontSize: 12, fontWeight: 'bold' },
  toggleButton: { flex: 1, backgroundColor: '#FF6600', borderRadius: 6, padding: 8, alignItems: 'center' },
  toggleButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  deleteButton: { flex: 1, backgroundColor: '#ffebee', borderRadius: 6, padding: 8, alignItems: 'center' },
  deleteButtonText: { color: '#c62828', fontSize: 12, fontWeight: 'bold' },
  reviewCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  reviewStars: { fontSize: 16, marginBottom: 4 },
  reviewText: { color: '#555', fontSize: 14, marginBottom: 4 },
  reviewAuthor: { color: '#999', fontSize: 13 },
  logoutButton: { margin: 16, backgroundColor: '#c62828', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 32 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelButtonText: { color: '#333', fontWeight: 'bold' },
  saveButton: { flex: 1, backgroundColor: '#FF6600', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
});