import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Dimensions, Alert, Modal, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconStar, IconStarFilled, IconShieldCheck, IconTrophy,
  IconMessage, IconPackage, IconTag, IconBox, IconHeart,
  IconHeartFilled, IconCheck, IconCalendarEvent, IconArrowLeft
} from '@tabler/icons-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;

export default function SellerProfileScreen({ route, navigation }) {
  const { seller: initialSeller, sellerId } = route.params || {};
  const { user: currentUser } = useAuth();
  const { colors } = useTheme();

  const [seller, setSeller] = useState(initialSeller || null);
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'reviews'
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const targetSellerId = seller?.id || sellerId;
  const isOwnProfile = currentUser?.id === targetSellerId;

  useEffect(() => {
    fetchSellerData();
  }, [targetSellerId]);

  async function fetchSellerData() {
    if (!targetSellerId) return;
    try {
      const [userRes, listingsRes, ratingsRes] = await Promise.all([
        api.get(`/users/${targetSellerId}`),
        api.get('/listings', { params: { user_id: targetSellerId } }),
        api.get(`/users/${targetSellerId}/ratings`),
      ]);

      setSeller(userRes.data);
      setListings(listingsRes.data.data || listingsRes.data || []);
      setReviews(ratingsRes.data.ratings?.data || ratingsRes.data.ratings || []);
    } catch (e) {
      console.log('Error loading seller data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchSellerData();
  }

  async function handleStartChat() {
    if (isOwnProfile) {
      Alert.alert('Notice', 'This is your own profile.');
      return;
    }
    setStartingChat(true);
    try {
      // Find one of the seller's active listings to start conversation, or fallback
      const listingId = listings.length > 0 ? listings[0].id : null;
      if (!listingId) {
        Alert.alert('Notice', 'Seller does not have any active listings right now.');
        return;
      }
      const response = await api.post('/conversations', {
        listing_id: listingId
      });
      navigation.navigate('Conversation', { conversation: response.data });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not start conversation.');
    } finally {
      setStartingChat(false);
    }
  }

  async function submitRating() {
    if (selectedStars === 0) {
      Alert.alert('Select Stars', 'Please select at least 1 star.');
      return;
    }
    if (listings.length === 0) {
      Alert.alert('Notice', 'Cannot rate seller without an active listing.');
      return;
    }
    setSubmittingRating(true);
    try {
      await api.post('/ratings', {
        listing_id: listings[0].id,
        stars: selectedStars,
        review: reviewText,
      });
      Alert.alert('Rating Submitted! ⭐', 'Thank you for reviewing this campus seller.');
      setRatingModal(false);
      setSelectedStars(0);
      setReviewText('');
      fetchSellerData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  }

  function renderListingCard({ item }) {
    return (
      <TouchableOpacity
        style={[
          styles.listingCard,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            shadowColor: colors.cardShadow || '#000',
          }
        ]}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ListingDetail', { listing: item })}
      >
        <View style={styles.listingImageContainer}>
          {item.image ? (
            <Image
              source={{ uri: getImageUrl(item.image) }}
              style={styles.listingImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.noImage, { backgroundColor: colors.bg }]}>
              <IconBox size={24} color={colors.subTextLight} />
            </View>
          )}

          {item.course_code ? (
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>{item.course_code}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.listingInfo}>
          <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.listingPrice, { color: colors.primary }]}>
            GH₵ {item.price}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderReviewCard({ item }) {
    return (
      <View style={[styles.reviewCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerInfo}>
            <View style={[styles.miniAvatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.miniAvatarText, { color: colors.primary }]}>
                {item.buyer?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={[styles.reviewerName, { color: colors.text }]}>{item.buyer?.name || 'Anonymous Student'}</Text>
              <Text style={[styles.reviewDate, { color: colors.subTextLight }]}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>

          <View style={styles.starsDisplay}>
            {[1, 2, 3, 4, 5].map(s => (
              <IconStarFilled
                key={s}
                size={14}
                color={s <= item.stars ? '#FFB800' : colors.borderDark}
              />
            ))}
          </View>
        </View>

        {item.review ? (
          <Text style={[styles.reviewContent, { color: colors.subText }]}>
            "{item.review}"
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'listings' ? listings : reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={activeTab === 'listings' ? renderListingCard : renderReviewCard}
          numColumns={activeTab === 'listings' ? 2 : 1}
          key={activeTab} // re-render layout when columns change
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            <View>
              {/* Profile Card Header */}
              <View style={[styles.heroCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.profileTopRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {seller?.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.profileInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.sellerNameHeading, { color: colors.text }]}>{seller?.name}</Text>
                      <View style={styles.verifiedBadge}>
                        <IconShieldCheck size={14} color="#059669" />
                        <Text style={styles.verifiedText}>UEW Verified</Text>
                      </View>
                    </View>

                    <Text style={[styles.sellerEmail, { color: colors.subTextLight }]}>{seller?.email}</Text>

                    <View style={styles.ratingBadgeRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <IconStarFilled size={15} color="#FFB800" />
                        <Text style={[styles.ratingScore, { color: colors.text }]}>
                          {seller?.average_rating || 0}
                        </Text>
                        <Text style={[styles.ratingCountText, { color: colors.subTextLight }]}>
                          ({seller?.rating_count || 0} reviews)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Trust score bar */}
                <View style={[styles.trustScoreCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <IconTrophy size={16} color="#FFB800" />
                      <Text style={[styles.trustScoreLabel, { color: colors.text }]}>Campus Trust Score</Text>
                    </View>
                    <Text style={[styles.trustLevelText, { color: colors.primary }]}>
                      {seller?.trust_score || 50}/100 • {seller?.trust_level || 'Member'}
                    </Text>
                  </View>
                </View>

                {/* Profile Actions */}
                {!isOwnProfile && (
                  <View style={styles.profileActionsRow}>
                    <TouchableOpacity
                      style={[styles.chatSellerBtn, { backgroundColor: colors.primary }]}
                      onPress={handleStartChat}
                      disabled={startingChat}
                    >
                      {startingChat ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <IconMessage size={16} color="#fff" />
                          <Text style={styles.chatSellerBtnText}>Message Seller</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rateSellerBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => setRatingModal(true)}
                    >
                      <IconStarFilled size={15} color={colors.primary} />
                      <Text style={[styles.rateSellerBtnText, { color: colors.primary }]}>Rate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Segmented Tabs Switcher */}
              <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'listings' && { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab('listings')}
                >
                  <IconPackage size={16} color={activeTab === 'listings' ? '#fff' : colors.subText} />
                  <Text style={[styles.tabButtonText, { color: activeTab === 'listings' ? '#fff' : colors.subText }]}>
                    Listings ({listings.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'reviews' && { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab('reviews')}
                >
                  <IconStarFilled size={16} color={activeTab === 'reviews' ? '#fff' : colors.subText} />
                  <Text style={[styles.tabButtonText, { color: activeTab === 'reviews' ? '#fff' : colors.subText }]}>
                    Reviews ({reviews.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconBox size={44} color={colors.subTextLight} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                {activeTab === 'listings' ? 'No active listings' : 'No student reviews yet'}
              </Text>
              <Text style={[styles.emptyStateSub, { color: colors.subTextLight }]}>
                {activeTab === 'listings'
                  ? 'This student currently has no items listed for sale.'
                  : 'Be the first fellow student to leave a review!'}
              </Text>
            </View>
          }
        />
      )}

      {/* Rating Modal */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Rate {seller?.name}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>How was your trading experience?</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedStars(star)}>
                  {selectedStars >= star ? (
                    <IconStarFilled size={34} color="#FFB800" />
                  ) : (
                    <IconStar size={34} color={colors.borderDark} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 75, textAlignVertical: 'top' }]}
              placeholder="Write a review (e.g. quick meetup at North campus, item as described)"
              placeholderTextColor={colors.subTextLight}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => { setRatingModal(false); setSelectedStars(0); setReviewText(''); }}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={submitRating}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 30 },

  heroCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  sellerNameHeading: { fontSize: 18, fontWeight: 'bold' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: { color: '#059669', fontSize: 10, fontWeight: 'bold' },
  sellerEmail: { fontSize: 12, marginTop: 2 },
  ratingBadgeRow: { marginTop: 4 },
  ratingScore: { fontSize: 13, fontWeight: 'bold' },
  ratingCountText: { fontSize: 12 },

  trustScoreCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  trustScoreLabel: { fontSize: 12, fontWeight: '600' },
  trustLevelText: { fontSize: 12, fontWeight: 'bold' },

  profileActionsRow: { flexDirection: 'row', gap: 10 },
  chatSellerBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  chatSellerBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  rateSellerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  rateSellerBtnText: { fontSize: 13, fontWeight: 'bold' },

  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonText: { fontSize: 13, fontWeight: 'bold' },

  listingCard: {
    width: CARD_WIDTH,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
  },
  listingImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#eee',
  },
  listingImage: { width: '100%', height: '100%' },
  noImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  courseBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#1E3A5F',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  courseBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  listingInfo: { padding: 8 },
  listingTitle: { fontSize: 12, fontWeight: '600', minHeight: 32 },
  listingPrice: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },

  reviewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  miniAvatarText: { fontSize: 13, fontWeight: 'bold' },
  reviewerName: { fontSize: 13, fontWeight: 'bold' },
  reviewDate: { fontSize: 10 },
  starsDisplay: { flexDirection: 'row', gap: 2 },
  reviewContent: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyStateTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  emptyStateSub: { fontSize: 12, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { borderRadius: 18, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontWeight: 'bold' },
  modalSubmitBtn: { flex: 1.5, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 10 },
});
