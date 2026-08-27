import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  Modal, TextInput, Dimensions, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { initializeEscrow, verifyEscrow } from '../services/paystackService';
import {
  IconPackage, IconHeart, IconHeartFilled, IconMessage,
  IconStar, IconStarFilled, IconTag, IconShieldCheck, IconCalendarEvent, IconCheck
} from '@tabler/icons-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '02:00 PM - 03:00 PM',
  '04:00 PM - 05:00 PM',
];

export default function ListingDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;
  const { listing } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingWatchlist, setSavingWatchlist] = useState(false);

  useEffect(() => {
    checkSavedStatus();
  }, []);

  async function checkSavedStatus() {
    try {
      const response = await api.get('/watchlist');
      const list = response.data.data || response.data || [];
      const isSaved = list.some(item => item.id === listing.id);
      setSaved(isSaved);
    } catch (e) {
      console.log('Error checking watchlist status:', e);
    }
  }

  // Phase 1 & 2 States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [offerModal, setOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Phase 3 States: MoMo Escrow & Service Bookings
  const [escrowModal, setEscrowModal] = useState(false);
  const [momoNetwork, setMomoNetwork] = useState('mtn');
  const [momoNumber, setMomoNumber] = useState(user?.phone || '');
  const [processingEscrow, setProcessingEscrow] = useState(false);

  const [bookingModal, setBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTimeSlot, setBookingTimeSlot] = useState(TIME_SLOTS[0]);
  const [bookingNotes, setBookingNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const isService = listing.is_service === 1 ||
    ['Tutoring', 'Photography', 'Graphic Design', 'Hair & Beauty', 'Transport'].includes(listing.category?.name);

  const allImages = Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images
    : listing.image ? [listing.image] : [];

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

  async function handleEscrowPayment() {
    if (!momoNumber.trim()) {
      Alert.alert('Missing Phone', 'Please enter your Mobile Money phone number.');
      return;
    }
    setProcessingEscrow(true);
    try {
      const initData = await initializeEscrow(listing.id, listing.price);
      await verifyEscrow(initData.reference);

      Alert.alert(
        'Escrow Payment Held 🛡️',
        `Payment of GH₵ ${listing.price} via ${momoNetwork.toUpperCase()} MoMo is safely held in Escrow!\n\nReference: ${initData.reference}\n\nFunds will be released to ${listing.user?.name} once you confirm item delivery.`
      );
      setEscrowModal(false);
    } catch (error) {
      Alert.alert('Payment Error', error.response?.data?.message || 'Could not complete MoMo Escrow payment.');
    } finally {
      setProcessingEscrow(false);
    }
  }

  async function handleBookAppointment() {
    if (!bookingDate) {
      Alert.alert('Date Required', 'Please enter a booking date.');
      return;
    }
    setSubmittingBooking(true);
    try {
      await api.post(`/listings/${listing.id}/appointments`, {
        appointment_date: bookingDate,
        time_slot: bookingTimeSlot,
        notes: bookingNotes,
      });
      Alert.alert('Appointment Booked! 📅', `Your appointment for ${bookingDate} (${bookingTimeSlot}) has been requested.`);
      setBookingModal(false);
      setBookingNotes('');
    } catch (error) {
      Alert.alert('Booking Error', error.response?.data?.message || 'Could not book appointment.');
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function submitOffer() {
    if (!offerPrice || isNaN(offerPrice) || Number(offerPrice) <= 0) {
      Alert.alert('Invalid Offer', 'Please enter a valid offer price.');
      return;
    }
    setSubmittingOffer(true);
    try {
      await api.post(`/listings/${listing.id}/offers`, {
        offer_price: offerPrice,
        message: offerMessage,
      });
      Alert.alert('Success', 'Your price offer has been sent to the seller!');
      setOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not submit offer.');
    } finally {
      setSubmittingOffer(false);
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView>
        {/* Product Image Carousel */}
        {allImages.length > 0 ? (
          <View style={{ position: 'relative' }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={e => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                setActiveImageIndex(slide);
              }}
              scrollEventThrottle={16}
            >
              {allImages.map((imgUri, idx) => (
                <Image
                  key={idx}
                  source={{ uri: getImageUrl(imgUri) }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {allImages.length > 1 && (
              <View style={styles.paginationDots}>
                {allImages.map((_, i) => (
                  <View key={i} style={[styles.dot, activeImageIndex === i && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.noImage, { backgroundColor: colors.bg }]}>
            <IconPackage size={48} color={colors.subTextLight} style={{ marginBottom: 8 }} />
            <Text style={[styles.noImageText, { color: colors.subTextLight }]}>No Image</Text>
          </View>
        )}

        {/* Save Button on image */}
        {!isOwner && (
          <TouchableOpacity
            style={[styles.saveFloating, { backgroundColor: colors.cardBg }]}
            onPress={handleWatchlist}
            disabled={savingWatchlist}
          >
            {saved
              ? <IconHeartFilled size={22} color={colors.primary} />
              : <IconHeart size={22} color={colors.subTextLight} />
            }
          </TouchableOpacity>
        )}

        {/* Price, Title & Badges */}
        <View style={[styles.priceSection, { backgroundColor: colors.cardBg }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.price, { color: colors.primary }]}>GH₵ {listing.price}</Text>
              <Text style={[styles.title, { color: colors.text }]}>{listing.title}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.saveDetailBtn,
                { backgroundColor: saved ? '#ffebee' : colors.inputBg, borderColor: saved ? '#e53935' : colors.border }
              ]}
              onPress={handleWatchlist}
              disabled={savingWatchlist}
            >
              {saved ? (
                <>
                  <IconHeartFilled size={18} color="#e53935" />
                  <Text style={[styles.saveDetailBtnText, { color: '#e53935', fontWeight: 'bold' }]}>Saved</Text>
                </>
              ) : (
                <>
                  <IconHeart size={18} color={colors.subText} />
                  <Text style={[styles.saveDetailBtnText, { color: colors.subText }]}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>{listing.category?.name}</Text>
            </View>
            {listing.course_code ? (
              <View style={styles.courseBadgeDetail}>
                <Text style={styles.courseBadgeDetailText}>Course: {listing.course_code}</Text>
              </View>
            ) : null}
            {isService && (
              <View style={{ backgroundColor: '#e8f5e9', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#2e7d32', fontSize: 12, fontWeight: 'bold' }}>📅 Service Listing</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.subText }]}>{listing.description}</Text>
        </View>

        {/* Seller Info */}
        <View style={[styles.sellerSection, { backgroundColor: colors.cardBg }]}>
          <View style={[styles.sellerAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.sellerAvatarText}>
              {listing.user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={[styles.sellerName, { color: colors.text }]}>{listing.user?.name}</Text>
            <Text style={[styles.sellerRating, { color: colors.subTextLight }]}>
              {listing.user?.average_rating || 0} stars ({listing.user?.rating_count || 0} reviews)
            </Text>
          </View>
          {!isOwner && (
            <TouchableOpacity
              style={[styles.rateSellerBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => setRatingModal(true)}
            >
              <Text style={[styles.rateSellerBtnText, { color: colors.primary }]}>Rate</Text>
            </TouchableOpacity>
          )}
        </View>

        {isOwner && (
          <View style={styles.ownerNote}>
            <Text style={styles.ownerNoteText}>This is your listing</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      {!isOwner && (
        <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: bottomInset }]}>
          {isService ? (
            <TouchableOpacity
              style={[styles.escrowBtn, { backgroundColor: '#2e7d32', flex: 1.5 }]}
              onPress={() => setBookingModal(true)}
            >
              <IconCalendarEvent size={18} color="#fff" />
              <Text style={styles.escrowBtnText}>Book Appointment</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.escrowBtn, { backgroundColor: '#2e7d32', flex: 1.5 }]}
              onPress={() => setEscrowModal(true)}
            >
              <IconShieldCheck size={18} color="#fff" />
              <Text style={styles.escrowBtnText}>MoMo Escrow</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.offerButton, { backgroundColor: colors.bg, borderColor: colors.accent }]}
            onPress={() => setOfferModal(true)}
          >
            <IconTag size={16} color={colors.accent} />
            <Text style={[styles.offerButtonText, { color: colors.accent }]}>Offer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chatButton, { borderColor: colors.primary }]}
            onPress={handleContact}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <>
                  <IconMessage size={16} color={colors.primary} />
                  <Text style={[styles.chatButtonText, { color: colors.primary }]}>Chat</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* MoMo Escrow Modal (Paystack) */}
      <Modal visible={escrowModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <IconShieldCheck size={24} color="#2e7d32" />
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Paystack MoMo Escrow</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>
              Funds held safely until you verify receipt of item from {listing.user?.name}.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Amount to Pay</Text>
            <View style={{ backgroundColor: colors.bg, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>GH₵ {listing.price}</Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Select Network</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'mtn', name: 'MTN MoMo' },
                { id: 'vodafone', name: 'Telecel / Voda' },
                { id: 'airteltigo', name: 'AirtelTigo' },
              ].map(net => (
                <TouchableOpacity
                  key={net.id}
                  style={[
                    styles.netChip,
                    { backgroundColor: momoNetwork === net.id ? colors.primary : colors.bg, borderColor: colors.border }
                  ]}
                  onPress={() => setMomoNetwork(net.id)}
                >
                  <Text style={{ color: momoNetwork === net.id ? '#fff' : colors.text, fontSize: 11, fontWeight: 'bold' }}>{net.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Mobile Money Phone Number</Text>
            <TextInput
              style={[styles.offerInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 0241234567"
              placeholderTextColor={colors.subTextLight}
              value={momoNumber}
              onChangeText={setMomoNumber}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.bg }]}
                onPress={() => setEscrowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#2e7d32' }]}
                onPress={handleEscrowPayment}
                disabled={processingEscrow}
              >
                {processingEscrow
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitButtonText}>Pay Now</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Appointment Booking Modal */}
      <Modal visible={bookingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <IconCalendarEvent size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Book Service Appointment</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>
              Schedule a time slot with {listing.user?.name} for "{listing.title}".
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Preferred Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.offerInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 2026-08-30"
              placeholderTextColor={colors.subTextLight}
              value={bookingDate}
              onChangeText={setBookingDate}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Select Time Slot</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {TIME_SLOTS.map((slot, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.slotChip,
                    { backgroundColor: bookingTimeSlot === slot ? colors.primary : colors.bg, borderColor: colors.border }
                  ]}
                  onPress={() => setBookingTimeSlot(slot)}
                >
                  <Text style={{ color: bookingTimeSlot === slot ? '#fff' : colors.text, fontSize: 12, fontWeight: 'bold' }}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Special Notes / Requirements</Text>
            <TextInput
              style={[styles.offerInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top' }]}
              placeholder="e.g. Meet at Central Library room 3..."
              placeholderTextColor={colors.subTextLight}
              value={bookingNotes}
              onChangeText={setBookingNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.bg }]}
                onPress={() => setBookingModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleBookAppointment}
                disabled={submittingBooking}
              >
                {submittingBooking
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitButtonText}>Confirm Booking</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Make Offer Modal */}
      <Modal visible={offerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Make an Offer</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>Listing Price: GH₵ {listing.price}</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Your Offered Price (GH₵)</Text>
            <TextInput
              style={[styles.offerInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 45"
              placeholderTextColor={colors.subTextLight}
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Message to Seller (Optional)</Text>
            <TextInput
              style={[styles.offerInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top' }]}
              placeholder="e.g. Can meet at Central Library today..."
              placeholderTextColor={colors.subTextLight}
              value={offerMessage}
              onChangeText={setOfferMessage}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.bg }]}
                onPress={() => { setOfferModal(false); setOfferPrice(''); setOfferMessage(''); }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={submitOffer}
                disabled={submittingOffer}
              >
                {submittingOffer
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitButtonText}>Send Offer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Rate {listing.user?.name}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>How was your experience?</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedStars(star)}>
                  {selectedStars >= star
                    ? <IconStarFilled size={32} color={colors.primary} />
                    : <IconStar size={32} color={colors.subTextLight} />
                  }
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.starsLabel, { color: colors.subText }]}>
              {selectedStars === 0 ? 'Tap a star to rate'
                : selectedStars === 1 ? 'Poor'
                : selectedStars === 2 ? 'Fair'
                : selectedStars === 3 ? 'Good'
                : selectedStars === 4 ? 'Very Good'
                : 'Excellent!'}
            </Text>

            <TextInput
              style={[styles.reviewInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Write a review (optional)"
              placeholderTextColor={colors.subTextLight}
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.bg }]}
                onPress={() => { setRatingModal(false); setSelectedStars(0); setReview(''); }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
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
  image: { width: SCREEN_WIDTH, height: 300 },
  noImage: { width: '100%', height: 300, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  noImageIcon: { fontSize: 48, marginBottom: 8 },
  noImageText: { color: '#999', fontSize: 16 },
  paginationDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FF6600', width: 20 },
  saveFloating: { position: 'absolute', top: 16, right: 16, backgroundColor: '#fff', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  saveFloatingText: { fontSize: 20 },
  saveDetailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  saveDetailBtnText: { fontSize: 13 },
  priceSection: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#FF6600', marginBottom: 6 },
  title: { fontSize: 18, color: '#333', marginBottom: 10 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF1E6', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#FF6600', fontSize: 12, fontWeight: 'bold' },
  courseBadgeDetail: { alignSelf: 'flex-start', backgroundColor: '#e3f2fd', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  courseBadgeDetailText: { color: '#1565c0', fontSize: 12, fontWeight: 'bold' },
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
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', gap: 8 },
  escrowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 10, gap: 6 },
  escrowBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  netChip: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  slotChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  offerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3A5F', borderRadius: 6, padding: 10, gap: 4 },
  offerButtonText: { color: '#1E3A5F', fontWeight: 'bold', fontSize: 12 },
  chatButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FF6600', borderRadius: 6, padding: 10, gap: 4 },
  chatButtonIcon: { fontSize: 16 },
  chatButtonText: { color: '#FF6600', fontWeight: 'bold', fontSize: 12 },
  buyButton: { flex: 2, backgroundColor: '#FF6600', borderRadius: 6, padding: 12, alignItems: 'center' },
  buyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  offerInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12, color: '#333' },
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