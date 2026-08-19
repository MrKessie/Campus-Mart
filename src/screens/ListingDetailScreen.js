import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  Modal, TextInput
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ListingDetailScreen({ route, navigation }) {
  const { listing } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingWatchlist, setSavingWatchlist] = useState(false);

  async function handleContact() {
    setLoading(true);
    try {
      const response = await api.post('/conversations', {
        listing_id: listing.id
      });
      navigation.navigate('Conversation', { conversation: response.data });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not start conversation.');
    } finally {
      setLoading(false);
    }
  }

  async function submitRating() {
    if (selectedStars === 0) {
      Alert.alert('Select Stars', 'Please select at least 1 star.');
      return;
    }
    setSubmittingRating(true);
    try {
      await api.post('/ratings', {
        listing_id: listing.id,
        stars: selectedStars,
        review: review,
      });
      Alert.alert('Success', 'Your rating has been submitted!');
      setRatingModal(false);
      setSelectedStars(0);
      setReview('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleWatchlist() {
    setSavingWatchlist(true);
    try {
      if (saved) {
        await api.delete(`/watchlist/${listing.id}`);
        setSaved(false);
      } else {
        await api.post('/watchlist', { listing_id: listing.id });
        setSaved(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update watchlist.');
    } finally {
      setSavingWatchlist(false);
    }
  }

  const isOwner = user?.id === listing.user_id;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Product Image */}
        {listing.image ? (
          <Image
            source={{ uri: `http://10.204.39.81:8000/storage/${listing.image}` }}
            style={styles.image}
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageIcon}>📦</Text>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}

        {/* Save Button on image */}
        {!isOwner && (
          <TouchableOpacity
            style={styles.saveFloating}
            onPress={handleWatchlist}
            disabled={savingWatchlist}
          >
            <Text style={styles.saveFloatingText}>{saved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}

        {/* Price & Title */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>GHC {listing.price}</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{listing.category?.name}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Seller Info */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>
              {listing.user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{listing.user?.name}</Text>
            <Text style={styles.sellerRating}>
              {listing.user?.average_rating || 0} stars ({listing.user?.rating_count || 0} reviews)
            </Text>
          </View>
          {!isOwner && (
            <TouchableOpacity
              style={styles.rateSellerBtn}
              onPress={() => setRatingModal(true)}
            >
              <Text style={styles.rateSellerBtnText}>Rate</Text>
            </TouchableOpacity>
          )}
        </View>

        {isOwner && (
          <View style={styles.ownerNote}>
            <Text style={styles.ownerNoteText}>This is your listing</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      {!isOwner && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleContact}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FF6600" size="small" />
              : <>
                  <Text style={styles.chatButtonIcon}>💬</Text>
                  <Text style={styles.chatButtonText}>Chat Seller</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={handleContact}
            disabled={loading}
          >
            <Text style={styles.buyButtonText}>Contact Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rating Modal */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rate {listing.user?.name}</Text>
            <Text style={styles.modalSubtitle}>How was your experience?</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedStars(star)}>
                  <Text style={[styles.star, selectedStars >= star && styles.starSelected]}>
                    {selectedStars >= star ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.starsLabel}>
              {selectedStars === 0 ? 'Tap a star to rate'
                : selectedStars === 1 ? 'Poor'
                : selectedStars === 2 ? 'Fair'
                : selectedStars === 3 ? 'Good'
                : selectedStars === 4 ? 'Very Good'
                : 'Excellent!'}
            </Text>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write a review (optional)"
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setRatingModal(false); setSelectedStars(0); setReview(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitRating}
                disabled={submittingRating}
              >
                {submittingRating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitButtonText}>Submit</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  image: { width: '100%', height: 300 },
  noImage: { width: '100%', height: 300, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  noImageIcon: { fontSize: 48, marginBottom: 8 },
  noImageText: { color: '#999', fontSize: 16 },
  saveFloating: { position: 'absolute', top: 16, right: 16, backgroundColor: '#fff', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  saveFloatingText: { fontSize: 20 },
  priceSection: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#FF6600', marginBottom: 6 },
  title: { fontSize: 18, color: '#333', marginBottom: 10 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF1E6', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#FF6600', fontSize: 12, fontWeight: 'bold' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  description: { fontSize: 14, color: '#555', lineHeight: 22 },
  sellerSection: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF6600', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sellerAvatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  sellerRating: { fontSize: 12, color: '#999', marginTop: 2 },
  rateSellerBtn: { backgroundColor: '#FFF1E6', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  rateSellerBtnText: { color: '#FF6600', fontWeight: 'bold', fontSize: 13 },
  ownerNote: { backgroundColor: '#e8f5e9', margin: 16, borderRadius: 8, padding: 12, alignItems: 'center' },
  ownerNoteText: { color: '#2E7D32', fontWeight: 'bold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', gap: 10 },
  chatButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FF6600', borderRadius: 6, padding: 12, gap: 6 },
  chatButtonIcon: { fontSize: 16 },
  chatButtonText: { color: '#FF6600', fontWeight: 'bold' },
  buyButton: { flex: 2, backgroundColor: '#FF6600', borderRadius: 6, padding: 12, alignItems: 'center' },
  buyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  star: { fontSize: 36, color: '#ddd' },
  starSelected: { color: '#FF6600' },
  starsLabel: { textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 16 },
  reviewInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, color: '#333', textAlignVertical: 'top', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelButtonText: { color: '#333', fontWeight: 'bold' },
  submitButton: { flex: 1, backgroundColor: '#FF6600', borderRadius: 8, padding: 14, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
});