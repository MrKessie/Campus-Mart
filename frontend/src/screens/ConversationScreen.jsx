import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Image,
  Animated, PanResponder, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getEcho } from '../services/echo';
import { sendLocalNotification } from '../services/notificationService';
import {
  IconSend, IconShieldCheck, IconMapPin, IconX,
  IconBook, IconSchool, IconBuilding, IconBuildingCommunity, IconCreditCard,
  IconPaperclip, IconTrash, IconArrowBackUp, IconArrowLeft
} from '@tabler/icons-react-native';

const SAFE_ZONES = [
  { name: 'UEW Central Campus Library', icon: IconBook },
  { name: 'North Campus Student Center', icon: IconSchool },
  { name: 'South Campus Main Gate', icon: IconBuilding },
  { name: 'Faculty Plaza (Admin Block)', icon: IconBuildingCommunity },
  { name: 'Commercial Block / ATM Area', icon: IconCreditCard },
];

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function SwipeableMessage({ children, onSwipeRight }) {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx < 90) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 25) {
          onSwipeRight();
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX: pan.x }] }}
    >
      {children}
    </Animated.View>
  );
}

export default function ConversationScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;
  const { conversation: initialConv } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const [conversationData, setConversationData] = useState(initialConv);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [escrowTx, setEscrowTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [zoneModal, setZoneModal] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const flatListRef = useRef(null);
  const previousMessageCount = useRef(0);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    checkEscrowStatus();
  }, []);

  async function checkEscrowStatus() {
    try {
      const response = await api.get('/my-escrows');
      const allEscrows = [...(response.data.as_buyer || []), ...(response.data.as_seller || [])];
      const match = allEscrows.find(
        e => e.listing_id === conversationData.listing_id && e.status === 'held_in_escrow'
      );
      setEscrowTx(match || null);
    } catch (e) {
      console.log('Error checking escrow status:', e);
    }
  }

  async function handleReleaseEscrowInChat() {
    if (!escrowTx) return;
    try {
      await api.post(`/escrow/${escrowTx.id}/release`);
      Alert.alert('Delivery Confirmed! 🎉', `GH₵ ${escrowTx.amount} has been released to the seller.`);
      setEscrowTx(null);
      fetchMessages();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not release escrow payment.');
    }
  }

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    fetchMessages();

    let channel;
    try {
      const echo = getEcho();
      channel = echo.private(`conversation.${conversationData.id}`);

      channel.listen('.MessageSent', (e) => {
        const incomingMsg = e.message;
        if (incomingMsg) {
          setMessages(prev => {
            if (prev.some(m => m.id === incomingMsg.id)) return prev;
            return [...prev, incomingMsg];
          });
          if (incomingMsg.sender_id !== user?.id) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });

      channel.listen('.MessageDeleted', (e) => {
        setMessages(prev =>
          prev.map(m => (m.id === e.message_id ? { ...m, is_deleted_for_everyone: true, body: '', image: null } : m))
        );
      });

      channel.listen('.MessageReacted', (e) => {
        setMessages(prev =>
          prev.map(m => (m.id === e.message_id ? { ...m, reaction: e.reaction } : m))
        );
      });

      channel.listenForWhisper('typing', (e) => {
        if (e.userId !== user?.id) {
          setIsPartnerTyping(Boolean(e.isTyping));
          if (e.isTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsPartnerTyping(false);
            }, 3000);
          }
        }
      });
    } catch (err) {
      console.log('Echo connection error:', err);
    }

    // Heartbeat fallback polling
    const interval = setInterval(fetchMessages, 15000);

    return () => {
      clearInterval(interval);
      if (channel) {
        channel.stopListening('.MessageSent');
        channel.stopListening('.MessageDeleted');
        channel.stopListening('.MessageReacted');
      }
      try {
        getEcho().leave(`conversation.${conversationData.id}`);
      } catch (e) {}
    };
  }, [conversationData.id]);

  async function fetchMessages() {
    try {
      const response = await api.get(`/conversations/${conversationData.id}`);
      if (response.data) {
        setConversationData(response.data);
        const fetchedMessages = response.data.messages || [];

        if (
          previousMessageCount.current > 0 &&
          fetchedMessages.length > previousMessageCount.current
        ) {
          const latestMessage = fetchedMessages[fetchedMessages.length - 1];
          if (latestMessage.sender_id !== user?.id) {
            const senderName = conversationData.buyer_id === user?.id
              ? conversationData.seller?.name
              : conversationData.buyer?.name;
            await sendLocalNotification(
              `New message from ${senderName}`,
              latestMessage.body || 'Sent an attachment 📷'
            );
          }
        }

        previousMessageCount.current = fetchedMessages.length;
        setMessages(fetchedMessages);
      }
    } catch (error) {
      console.log('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTextChange(text) {
    setNewMessage(text);
    try {
      const echo = getEcho();
      echo.private(`conversation.${conversationData.id}`).whisper('typing', {
        userId: user?.id,
        isTyping: text.length > 0,
      });
    } catch (e) {}
  }

  async function pickAttachment() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAttachment(result.assets[0]);
    }
  }

  async function updateExchangeZone(locationName) {
    try {
      const response = await api.post(`/conversations/${conversationData.id}/exchange-location`, {
        exchange_location: locationName,
      });
      const updatedConv = response.data.conversation;
      const isAgreed = response.data.agreed;
      setConversationData(updatedConv);
      setZoneModal(false);

      const isBuyer = updatedConv.buyer_id === user?.id;
      const otherName = isBuyer ? updatedConv.seller?.name : updatedConv.buyer?.name;

      if (isAgreed) {
        Alert.alert(
          'Location Agreed! 🛡️',
          `Both you and ${otherName} have confirmed "${locationName}" for safe handover!`
        );
      } else {
        Alert.alert(
          'Location Proposed 📍',
          `You proposed "${locationName}". We notified ${otherName} to confirm or select this spot.`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update exchange location.');
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() && !attachment) return;
    setSending(true);
    try {
      let response;
      if (attachment) {
        const formData = new FormData();
        if (newMessage.trim()) {
          formData.append('body', newMessage.trim());
        }
        if (replyToMessage) {
          formData.append('reply_to_message_id', replyToMessage.id);
        }
        formData.append('image', {
          uri: attachment.uri,
          type: attachment.mimeType || 'image/jpeg',
          name: attachment.fileName || 'chat_attachment.jpg',
        });
        response = await api.post(`/conversations/${conversationData.id}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post(`/conversations/${conversationData.id}/messages`, {
          body: newMessage.trim(),
          reply_to_message_id: replyToMessage ? replyToMessage.id : null,
        });
      }

      setMessages((prev) => [...prev, response.data]);
      previousMessageCount.current += 1;
      setNewMessage('');
      setAttachment(null);
      setReplyToMessage(null);
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.log('Error sending message:', error);
      Alert.alert('Error', error.response?.data?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  async function handleReact(emoji) {
    if (!actionMessage) return;
    const targetMsg = actionMessage;
    const newReaction = targetMsg.reaction === emoji ? null : emoji;

    setMessages((prev) =>
      prev.map((msg) => (msg.id === targetMsg.id ? { ...msg, reaction: newReaction } : msg))
    );
    setActionMessage(null);

    try {
      await api.post(`/messages/${targetMsg.id}/react`, { reaction: newReaction });
    } catch (error) {
      console.log('Error updating reaction:', error);
    }
  }

  async function handleDeleteMessage(type) {
    if (!actionMessage) return;
    const targetMsg = actionMessage;
    setActionMessage(null);

    if (type === 'everyone') {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === targetMsg.id
            ? { ...msg, is_deleted_for_everyone: true, body: '', image: null }
            : msg
        )
      );
    } else {
      setMessages((prev) => prev.filter((msg) => msg.id !== targetMsg.id));
    }

    try {
      await api.delete(`/messages/${targetMsg.id}?type=${type}`);
    } catch (error) {
      Alert.alert('Error', 'Could not delete message.');
    }
  }

  const isBuyer = conversationData.buyer_id === user?.id;
  const buyerProposed = conversationData.buyer_proposed_location;
  const sellerProposed = conversationData.seller_proposed_location;
  const isAgreed = conversationData.exchange_location != null;
  const myProposed = isBuyer ? buyerProposed : sellerProposed;
  const otherProposed = isBuyer ? sellerProposed : buyerProposed;
  const otherPartyName = isBuyer ? conversationData.seller?.name : conversationData.buyer?.name;

  let bannerBg = colors.cardBg;
  let bannerTextColor = colors.text;
  let bannerText = 'Tap to agree on a Campus Safe Exchange Zone';
  let bannerActionText = 'Select';

  if (isAgreed) {
    bannerBg = '#e8f5e9';
    bannerTextColor = '#2e7d32';
    bannerText = `Handover Agreed: ${conversationData.exchange_location} 🛡️`;
    bannerActionText = 'Change';
  } else if (otherProposed && !myProposed) {
    bannerBg = '#fff3e0';
    bannerTextColor = '#e65100';
    bannerText = `${otherPartyName} proposed: "${otherProposed}"`;
    bannerActionText = 'Confirm / Choose';
  } else if (otherProposed && myProposed && otherProposed !== myProposed) {
    bannerBg = '#fff3e0';
    bannerTextColor = '#e65100';
    bannerText = `${otherPartyName} proposed: "${otherProposed}" (You: "${myProposed}")`;
    bannerActionText = 'Accept Match';
  } else if (myProposed && !otherProposed) {
    bannerBg = '#e3f2fd';
    bannerTextColor = '#1565c0';
    bannerText = `You proposed: "${myProposed}" (Waiting for ${otherPartyName})`;
    bannerActionText = 'Change';
  }

  function renderMessage({ item }) {
    const isMe = item.sender_id === user?.id;
    const imageUrl = item.image ? getImageUrl(item.image) : null;
    const isDeletedEveryone = item.is_deleted_for_everyone;
    const quotedMsg = item.reply_to || item.replyTo;

    return (
      <SwipeableMessage onSwipeRight={() => setReplyToMessage(item)}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => setActionMessage(item)}
          delayLongPress={300}
          style={[
            styles.messageBubble,
            isMe
              ? { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
              : { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1, alignSelf: 'flex-start', borderBottomLeftRadius: 4 }
          ]}
        >
          {quotedMsg && !isDeletedEveryone && (
            <View style={[styles.quotedCard, { backgroundColor: isMe ? 'rgba(255,255,255,0.18)' : colors.inputBg, borderLeftColor: isMe ? '#fff' : colors.primary }]}>
              <Text style={[styles.quotedName, { color: isMe ? '#fff' : colors.primary }]}>
                {quotedMsg.sender?.name || (quotedMsg.sender_id === user?.id ? 'You' : 'User')}
              </Text>
              <Text style={[styles.quotedText, { color: isMe ? 'rgba(255,255,255,0.9)' : colors.subText }]} numberOfLines={1}>
                {quotedMsg.is_deleted_for_everyone
                  ? '🚫 Deleted message'
                  : (quotedMsg.body || (quotedMsg.image ? '📷 Photo' : 'Message'))}
              </Text>
            </View>
          )}

          {isDeletedEveryone ? (
            <Text style={[styles.deletedMessageText, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.subTextLight }]}>
              🚫 This message was deleted
            </Text>
          ) : (
            <>
              {imageUrl && (
                <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewImage(imageUrl)}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.chatMessageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              {item.body ? (
                <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
                  {item.body}
                </Text>
              ) : null}
            </>
          )}

          <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.subTextLight }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>

          {item.reaction && !isDeletedEveryone && (
            <View style={styles.reactionBadge}>
              <Text style={{ fontSize: 12 }}>{item.reaction}</Text>
            </View>
          )}
        </TouchableOpacity>
      </SwipeableMessage>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          style={{ paddingRight: 12, paddingVertical: 4 }}
          onPress={() => navigation.goBack()}
        >
          <IconArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => {
            const partner = conversationData.buyer_id === user?.id ? conversationData.seller : conversationData.buyer;
            const partnerId = conversationData.buyer_id === user?.id ? conversationData.seller_id : conversationData.buyer_id;
            if (partnerId) {
              navigation.navigate('SellerProfile', { seller: partner, sellerId: partnerId });
            }
          }}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>{conversationData.listing?.title}</Text>
          <Text style={styles.headerSubtitle}>
            {conversationData.buyer_id === user?.id
              ? `Seller: ${conversationData.seller?.name || 'User'}  ›`
              : `Buyer: ${conversationData.buyer?.name || 'User'}  ›`}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.safeZoneBanner, { backgroundColor: bannerBg }]}
        onPress={() => setZoneModal(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <IconShieldCheck size={18} color={bannerTextColor} />
          <Text style={[styles.safeZoneBannerText, { color: bannerTextColor }]} numberOfLines={1}>
            {bannerText}
          </Text>
        </View>
        <Text style={[styles.safeZoneChangeText, { color: bannerTextColor }]}>
          {bannerActionText}
        </Text>
      </TouchableOpacity>

      {escrowTx && (
        <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#c8e6c9' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2e7d32' }}>
              🛡️ MoMo Escrow: GH₵ {escrowTx.amount} Held
            </Text>
            <Text style={{ fontSize: 11, color: '#388e3c' }}>
              {escrowTx.buyer_id === user?.id
                ? 'Inspected item? Confirm delivery to release funds to seller.'
                : 'Waiting for buyer to inspect item and confirm delivery.'}
            </Text>
          </View>

          {escrowTx.buyer_id === user?.id && (
            <TouchableOpacity
              style={{ backgroundColor: '#2e7d32', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
              onPress={handleReleaseEscrowInChat}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Confirm Delivery</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.subTextLight }]}>No messages yet. Say hello!</Text>
          }
        />
      )}

      {replyToMessage && (
        <View style={[styles.replyPreviewRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.replyPreviewBar, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.replyPreviewName, { color: colors.primary }]}>
              Replying to {replyToMessage.sender?.name || (replyToMessage.sender_id === user?.id ? 'Yourself' : 'User')}
            </Text>
            <Text style={[styles.replyPreviewText, { color: colors.subTextLight }]} numberOfLines={1}>
              {replyToMessage.is_deleted_for_everyone
                ? '🚫 Deleted message'
                : (replyToMessage.body || (replyToMessage.image ? '📷 Photo attachment' : 'Message'))}
            </Text>
          </View>
          <TouchableOpacity style={styles.replyCloseBtn} onPress={() => setReplyToMessage(null)}>
            <IconX size={18} color={colors.subText} />
          </TouchableOpacity>
        </View>
      )}

      {attachment && (
        <View style={[styles.attachmentPreviewRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Image source={{ uri: attachment.uri }} style={styles.attachmentPreviewThumb} />
          <Text style={[styles.attachmentPreviewText, { color: colors.text }]} numberOfLines={1}>Attached photo</Text>
          <TouchableOpacity style={styles.attachmentRemoveBtn} onPress={() => setAttachment(null)}>
            <IconX size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {isPartnerTyping && (
        <View style={[styles.typingIndicatorRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.typingIndicatorText, { color: colors.subTextLight }]}>
            {conversationData.buyer_id === user?.id
              ? `${conversationData.seller?.name || 'Seller'} is typing...`
              : `${conversationData.buyer?.name || 'Buyer'} is typing...`}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            paddingBottom: Math.max(10, bottomInset),
          }
        ]}
      >
        <TouchableOpacity style={styles.attachBtn} onPress={pickAttachment}>
          <IconPaperclip size={22} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.subTextLight}
          value={newMessage}
          onChangeText={handleTextChange}
          multiline
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={sendMessage} disabled={sending}>
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <IconSend size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      <Modal visible={zoneModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <IconShieldCheck size={22} color={isAgreed ? '#2e7d32' : colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Safe Exchange Zones</Text>
              </View>
              <TouchableOpacity onPress={() => setZoneModal(false)}>
                <IconX size={20} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.subText, marginBottom: 12 }}>
              {isAgreed
                ? `Both parties have confirmed "${conversationData.exchange_location}".`
                : otherProposed
                ? `${otherPartyName} proposed "${otherProposed}". Select the same spot to confirm agreement!`
                : `Select a campus spot to propose to ${otherPartyName}:`}
            </Text>

            {SAFE_ZONES.map((zoneItem, idx) => {
              const IconComp = zoneItem.icon;
              const isMine = myProposed === zoneItem.name;
              const isOthers = otherProposed === zoneItem.name;
              const isMatch = isMine && isOthers;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.zoneOption,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                    isMatch && { borderColor: '#2e7d32', backgroundColor: '#e8f5e9' },
                    isMine && !isMatch && { borderColor: '#1565c0', backgroundColor: '#e3f2fd' },
                    isOthers && !isMatch && { borderColor: '#e65100', backgroundColor: '#fff3e0' },
                  ]}
                  onPress={() => updateExchangeZone(zoneItem.name)}
                >
                  <IconComp size={20} color={isMatch ? '#2e7d32' : isOthers ? '#e65100' : isMine ? '#1565c0' : colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.zoneOptionText, { color: colors.text }, isMatch && { color: '#2e7d32', fontWeight: 'bold' }]}>
                      {zoneItem.name}
                    </Text>
                    {isMatch ? (
                      <Text style={{ fontSize: 10, color: '#2e7d32', fontWeight: 'bold' }}>✓ Confirmed by both parties</Text>
                    ) : isOthers ? (
                      <Text style={{ fontSize: 10, color: '#e65100' }}>Proposed by {otherPartyName} (Tap to confirm)</Text>
                    ) : isMine ? (
                      <Text style={{ fontSize: 10, color: '#1565c0' }}>Proposed by you</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Message Options / Reaction Modal */}
      <Modal visible={actionMessage != null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setActionMessage(null)}>
          <Pressable style={[styles.actionModalBox, { backgroundColor: colors.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.actionModalTitle, { color: colors.subText }]}>React to Message</Text>
            <View style={styles.reactionRow}>
              {EMOJI_REACTIONS.map((emoji, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.reactionBtn,
                    actionMessage?.reaction === emoji && { backgroundColor: colors.primaryLight }
                  ]}
                  onPress={() => handleReact(emoji)}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                const target = actionMessage;
                setActionMessage(null);
                setReplyToMessage(target);
              }}
            >
              <IconArrowBackUp size={20} color={colors.primary} />
              <Text style={[styles.actionItemText, { color: colors.primary }]}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleDeleteMessage('me')}
            >
              <IconTrash size={20} color="#d32f2f" />
              <Text style={styles.actionItemDeleteText}>Delete for Me</Text>
            </TouchableOpacity>

            {actionMessage?.sender_id === user?.id && !actionMessage?.is_deleted_for_everyone && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleDeleteMessage('everyone')}
              >
                <IconTrash size={20} color="#d32f2f" />
                <Text style={[styles.actionItemDeleteText, { fontWeight: 'bold' }]}>Delete for Everyone</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionItem, { marginTop: 6 }]}
              onPress={() => setActionMessage(null)}
            >
              <Text style={[styles.actionItemCancelText, { color: colors.subText }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={previewImage != null} transparent animationType="fade">
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewImage(null)}>
            <IconX size={24} color="#fff" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 44, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerSubtitle: { color: '#fff', fontSize: 12, opacity: 0.85, marginTop: 2 },
  safeZoneBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  safeZoneBannerText: { fontSize: 12, fontWeight: '600' },
  safeZoneChangeText: { fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
  messagesList: { padding: 16 },
  messageBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%', position: 'relative' },
  messageText: { fontSize: 15 },
  messageTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  reactionBadge: { position: 'absolute', bottom: -8, right: 6, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 5, paddingVertical: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  deletedMessageText: { fontSize: 13, fontStyle: 'italic' },
  emptyText: { textAlign: 'center', marginTop: 40 },
  inputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, alignItems: 'center', gap: 8 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  attachBtn: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  chatMessageImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
  attachmentPreviewRow: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 16, borderTopWidth: 1, gap: 10 },
  attachmentPreviewThumb: { width: 40, height: 40, borderRadius: 6 },
  attachmentPreviewText: { fontSize: 13, flex: 1 },
  attachmentRemoveBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#d32f2f', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { borderRadius: 16, padding: 20, width: '88%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  zoneOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  zoneOptionText: { fontSize: 14, flex: 1 },
  actionModalBox: { width: '85%', borderRadius: 20, padding: 18, alignItems: 'center' },
  actionModalTitle: { fontSize: 13, marginBottom: 12, fontWeight: '600' },
  reactionRow: { flexDirection: 'row', gap: 10, marginBottom: 16, justifyContent: 'center' },
  reactionBtn: { padding: 8, borderRadius: 20 },
  actionDivider: { height: 1, width: '100%', marginBottom: 12 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, width: '100%', justifyContent: 'center' },
  actionItemText: { fontSize: 15, fontWeight: '600' },
  actionItemDeleteText: { fontSize: 15, color: '#d32f2f' },
  actionItemCancelText: { fontSize: 15, fontWeight: '600' },
  replyPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, gap: 10 },
  replyPreviewBar: { width: 4, height: 32, borderRadius: 2 },
  replyPreviewName: { fontSize: 12, fontWeight: 'bold' },
  replyPreviewText: { fontSize: 12 },
  replyCloseBtn: { padding: 4 },
  quotedCard: { borderLeftWidth: 3, padding: 6, paddingHorizontal: 10, borderRadius: 6, marginBottom: 6 },
  quotedName: { fontSize: 11, fontWeight: 'bold' },
  quotedText: { fontSize: 12, marginTop: 1 },
  fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  closePreviewBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullScreenImage: { width: '100%', height: '80%' },
  typingIndicatorRow: { paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  typingIndicatorText: { fontSize: 12, fontStyle: 'italic' },
});