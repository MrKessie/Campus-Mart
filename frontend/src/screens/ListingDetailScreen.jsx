import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  Modal, TextInput, Dimensions, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { initializeEscrow, verifyEscrow } from '../services/paystackService';
import {
  IconPackage, IconHeart, IconHeartFilled, IconMessage,
  IconStar, IconStarFilled, IconTag, IconShieldCheck, IconCalendarEvent,
  IconCheck, IconMapPin, IconClock, IconArrowLeft, IconAlertCircle,
  IconChevronRight, IconTrophy
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
  const { showToast } = useToast();
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

  // Gallery & Offers
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [offerModal, setOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Escrow & Services
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const response = await api.post('/conversations', {
        listing_id: listing.id
      });
      navigation.navigate('Conversation', { conversation: response.data });
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not start conversation.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEscrowPayment() {
    if (!momoNumber.trim()) {
      showToast('Please enter your Mobile Money phone number.', 'warning');
      return;
    }
    setProcessingEscrow(true);
    try {
      const initData = await initializeEscrow(listing.id, listing.price);
      await verifyEscrow(initData.reference);

      showToast(`Payment of GH₵ ${listing.price} held in Escrow! 🛡️`, 'success');
      setEscrowModal(false);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not complete MoMo Escrow payment.', 'error');
    } finally {
      setProcessingEscrow(false);
    }
  }

  async function handleBookAppointment() {
    if (!bookingDate) {
      showToast('Please select a booking date.', 'warning');
      return;
    }
    setSubmittingBooking(true);
    try {
      await api.post(`/listings/${listing.id}/appointments`, {
        appointment_date: bookingDate,
        time_slot: bookingTimeSlot,
        notes: bookingNotes,
      });
      showToast(`Appointment requested for ${bookingDate}! 📅`, 'success');
      setBookingModal(false);
      setBookingNotes('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not book appointment.', 'error');
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function submitOffer() {
    if (!offerPrice || isNaN(offerPrice) || Number(offerPrice) <= 0) {
      showToast('Please enter a valid offer price.', 'warning');
      return;
    }
    setSubmittingOffer(true);
    try {
      await api.post(`/listings/${listing.id}/offers`, {
        offer_price: offerPrice,
        message: offerMessage,
      });
      showToast('Your price offer has been sent! 🏷️', 'success');
      setOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not submit offer.', 'error');
    } finally {
      setSubmittingOffer(false);
    }
  }

  async function submitRating() {
    if (selectedStars === 0) {
      showToast('Please select at least 1 star.', 'warning');
      return;
    }
    setSubmittingRating(true);
    try {
      await api.post('/ratings', {
        listing_id: listing.id,
        stars: selectedStars,
        review: review,
      });
      showToast('Thank you! Rating submitted ⭐', 'success');
      setRatingModal(false);
      setSelectedStars(0);
      setReview('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not submit rating.', 'error');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleWatchlist() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavingWatchlist(true);
    try {
      if (saved) {
        setSaved(false);
        showToast('Removed from Watchlist', 'info');
        await api.delete(`/watchlist/${listing.id}`);
      } else {
        setSaved(true);
        showToast('Saved to Watchlist ❤️', 'success');
        await api.post('/watchlist', { listing_id: listing.id });
      }
    } catch (error) {
      showToast('Could not update watchlist.', 'error');
    } finally {
      setSavingWatchlist(false);
    }
  }

  const isOwner = user?.id === listing.user_id;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Product Image Carousel */}
        <View style={styles.imageGalleryContainer}>
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
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>

              {/* Pagination Badge */}
              {allImages.length > 1 && (
                <View style={styles.paginationBadge}>
                  <Text style={styles.paginationBadgeText}>
                    {activeImageIndex + 1} / {allImages.length}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.noImageHero, { backgroundColor: colors.border }]}>
              <IconPackage size={54} color={colors.subTextLight} style={{ marginBottom: 8 }} />
              <Text style={[styles.noImageText, { color: colors.subTextLight }]}>No Photos Provided</Text>
            </View>
          )}

          {/* Floating Watchlist Button */}
          {!isOwner && (
            <TouchableOpacity
              style={styles.floatingHeartBtn}
              onPress={handleWatchlist}
              disabled={savingWatchlist}
              activeOpacity={0.8}
            >
              {saved ? (
                <IconHeartFilled size={22} color="#e53935" />
              ) : (
                <IconHeart size={22} color="rgba(0,0,0,0.6)" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Title, Price & Badges Card */}
        <View style={[styles.cardSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceTag, { color: colors.primary }]}>
              GH₵ {listing.price}
            </Text>
            <View style={[styles.conditionPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.conditionText, { color: colors.primary }]}>
                {isService ? 'Service' : 'Item for Sale'}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {listing.title}
          </Text>

          <View style={styles.tagWrap}>
            {listing.category?.name && (
              <View style={[styles.badgePill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <IconTag size={13} color={colors.subText} style={{ marginRight: 4 }} />
                <Text style={[styles.badgePillText, { color: colors.text }]}>{listing.category.name}</Text>
              </View>
            )}

            {listing.course_code ? (
              <View style={[styles.badgePill, { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' }]}>
                <Text style={[styles.badgePillText, { color: '#fff', fontWeight: 'bold' }]}>
                  Course: {listing.course_code}
                </Text>
              </View>
            ) : null}

            <View style={[styles.badgePill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <IconMapPin size={13} color={colors.subText} style={{ marginRight: 4 }} />
              <Text style={[styles.badgePillText, { color: colors.subText }]}>UEW Winneba</Text>
            </View>
          </View>
        </View>

        {/* Safe Meetup & Escrow Guarantee Banner */}
        <View style={[styles.safeBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <View style={styles.safeBannerHeader}>
            <IconShieldCheck size={20} color="#059669" />
            <Text style={styles.safeBannerTitle}>CampusMart Student Protection</Text>
          </View>
          <Text style={styles.safeBannerText}>
            Trade safely on campus! Meet at verified UEW Safe Zones (e.g. Central Library) and pay via MoMo Escrow to protect your funds until delivery.
          </Text>
        </View>

        {/* Description Section */}
        <View style={[styles.cardSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Item Description</Text>
          <Text style={[styles.descriptionText, { color: colors.subText }]}>
            {listing.description || 'No detailed description provided.'}
          </Text>
        </View>

        {/* Seller Profile & Reputation Card */}
        <View style={[styles.cardSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0 }]}>Seller Information</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SellerProfile', { seller: listing.user, sellerId: listing.user_id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>View Profile</Text>
              <IconChevronRight size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sellerRow}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SellerProfile', { seller: listing.user, sellerId: listing.user_id })}
          >
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.sellerAvatarText}>
                {listing.user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.sellerDetails}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sellerName, { color: colors.text }]}>{listing.user?.name}</Text>
                <View style={styles.verifiedBadge}>
                  <IconShieldCheck size={13} color="#059669" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>

              <View style={styles.ratingRow}>
                <IconStarFilled size={14} color="#FFB800" />
                <Text style={[styles.ratingNumber, { color: colors.text }]}>
                  {listing.user?.average_rating || 0}
                </Text>
                <Text style={[styles.ratingCount, { color: colors.subTextLight }]}>
                  ({listing.user?.rating_count || 0} reviews)
                </Text>
              </View>
            </View>

            {!isOwner && (
              <TouchableOpacity
                style={[styles.rateButton, { backgroundColor: colors.primaryLight }]}
                onPress={() => setRatingModal(true)}
              >
                <Text style={[styles.rateButtonText, { color: colors.primary }]}>Rate</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {isOwner && (
          <View style={[styles.ownerBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <IconCheck size={16} color={colors.primary} />
            <Text style={[styles.ownerBadgeText, { color: colors.primary }]}>This is your active listing</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      {!isOwner && (
        <View style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            paddingBottom: bottomInset,
            shadowColor: colors.cardShadow || '#000',
          }
        ]}>
          {/* Secondary Actions */}
          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={handleContact}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <IconMessage size={18} color={colors.text} />
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>Chat</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => setOfferModal(true)}
          >
            <IconTag size={18} color={colors.text} />
            <Text style={[styles.secondaryActionText, { color: colors.text }]}>Offer</Text>
          </TouchableOpacity>

          {/* Primary High-Impact CTA */}
          {isService ? (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => setBookingModal(true)}
            >
              <IconCalendarEvent size={18} color="#fff" />
              <Text style={styles.primaryActionText}>Book Service</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
              onPress={() => setEscrowModal(true)}
            >
              <IconShieldCheck size={18} color="#fff" />
              <Text style={styles.primaryActionText}>MoMo Escrow</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MoMo Escrow Modal */}
      <Modal visible={escrowModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <IconShieldCheck size={26} color="#059669" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Paystack MoMo Escrow</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>
              Funds held securely until you confirm item delivery from {listing.user?.name}.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Amount to Escrow</Text>
            <View style={[styles.amountDisplay, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.amountDisplayText, { color: colors.primary }]}>GH₵ {listing.price}</Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Select Network</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'mtn', name: 'MTN MoMo' },
                { id: 'vodafone', name: 'Telecel' },
                { id: 'airteltigo', name: 'AT' },
              ].map(net => (
                <TouchableOpacity
                  key={net.id}
                  style={[
                    styles.netChip,
                    {
                      backgroundColor: momoNetwork === net.id ? colors.primary : colors.bg,
                      borderColor: momoNetwork === net.id ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setMomoNetwork(net.id)}
                >
                  <Text style={{ color: momoNetwork === net.id ? '#fff' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                    {net.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Mobile Money Phone Number</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 0241234567"
              placeholderTextColor={colors.subTextLight}
              value={momoNumber}
              onChangeText={setMomoNumber}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => setEscrowModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }]}
                onPress={handleEscrowPayment}
                disabled={processingEscrow}
              >
                {processingEscrow ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Pay GH₵ {listing.price}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Appointment Booking Modal */}
      <Modal visible={bookingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <IconCalendarEvent size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Book Appointment</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>
              Schedule a time slot with {listing.user?.name} for "{listing.title}".
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Preferred Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
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
                    {
                      backgroundColor: bookingTimeSlot === slot ? colors.primary : colors.bg,
                      borderColor: bookingTimeSlot === slot ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setBookingTimeSlot(slot)}
                >
                  <Text style={{ color: bookingTimeSlot === slot ? '#fff' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Special Notes / Meeting Location</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top' }]}
              placeholder="e.g. North campus faculty block..."
              placeholderTextColor={colors.subTextLight}
              value={bookingNotes}
              onChangeText={setBookingNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => setBookingModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleBookAppointment}
                disabled={submittingBooking}
              >
                {submittingBooking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Make Offer Modal */}
      <Modal visible={offerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Make a Price Offer</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subTextLight }]}>
              Original Price: GH₵ {listing.price}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Your Offer (GH₵)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 45"
              placeholderTextColor={colors.subTextLight}
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Note to Seller (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top' }]}
              placeholder="e.g. Can meet at Central Library today..."
              placeholderTextColor={colors.subTextLight}
              value={offerMessage}
              onChangeText={setOfferMessage}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => { setOfferModal(false); setOfferPrice(''); setOfferMessage(''); }}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={submitOffer}
                disabled={submittingOffer}
              >
                {submittingOffer ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Offer</Text>
                )}
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
              placeholder="Write a review (optional)"
              placeholderTextColor={colors.subTextLight}
              value={review}
              onChangeText={setReview}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => { setRatingModal(false); setSelectedStars(0); setReview(''); }}
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
                  <Text style={styles.modalSubmitText}>Submit Rating</Text>
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
  imageGalleryContainer: { position: 'relative', width: '100%', height: 320, backgroundColor: '#111' },
  galleryImage: { width: SCREEN_WIDTH, height: 320 },
  noImageHero: { width: '100%', height: 260, justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 14, fontWeight: 'bold' },
  paginationBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paginationBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  floatingHeartBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  cardSection: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceTag: { fontSize: 30, fontWeight: 'bold', letterSpacing: -0.5 },
  conditionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  conditionText: { fontSize: 11, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', lineHeight: 26, marginBottom: 12 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  badgePillText: { fontSize: 12 },

  safeBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  safeBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  safeBannerTitle: { color: '#065F46', fontSize: 13, fontWeight: 'bold' },
  safeBannerText: { color: '#047857', fontSize: 12, lineHeight: 17 },

  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  descriptionText: { fontSize: 14, lineHeight: 22 },

  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sellerAvatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sellerDetails: { flex: 1 },
  sellerName: { fontSize: 15, fontWeight: 'bold' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: '#059669', fontSize: 10, fontWeight: 'bold' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingNumber: { fontSize: 13, fontWeight: 'bold' },
  ratingCount: { fontSize: 12 },
  rateButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rateButtonText: { fontSize: 12, fontWeight: 'bold' },

  ownerBadge: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ownerBadgeText: { fontSize: 13, fontWeight: 'bold' },

  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryActionText: { fontSize: 13, fontWeight: 'bold' },
  primaryActionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { borderRadius: 20, padding: 22, width: '88%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 13, marginTop: 2, marginBottom: 14, lineHeight: 18 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  amountDisplay: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  amountDisplayText: { fontSize: 20, fontWeight: 'bold' },
  netChip: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  slotChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 14 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSubmitBtn: { flex: 1.5, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 12 },
});