import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { IconMessageOff, IconShieldCheck } from '@tabler/icons-react-native';

export default function ConversationsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  async function fetchConversations() {
    try {
      const response = await api.get('/conversations');
      setConversations(response.data.data || response.data);
    } catch (error) {
      console.log('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchConversations();
  }

  function renderConversation({ item }) {
    const isbuyer = item.buyer_id === user?.id;
    const otherPerson = isbuyer ? item.seller : item.buyer;
    const lastMessage = item.latest_message || (item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1] : null);
    const lastMessageText = lastMessage
      ? (lastMessage.body || (lastMessage.image ? '📷 Photo attachment' : 'Message'))
      : 'No messages yet';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('Conversation', { conversation: item })}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {otherPerson?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.personName, { color: colors.text }]}>{otherPerson?.name}</Text>
            {item.exchange_location ? <IconShieldCheck size={14} color="#2e7d32" /> : null}
          </View>
          <Text style={[styles.listingTitle, { color: colors.primary }]} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <Text style={[styles.lastMessage, { color: colors.subTextLight }]} numberOfLines={1}>
            {lastMessageText}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text style={[styles.time, { color: item.unread_count > 0 ? colors.primary : colors.subTextLight, fontWeight: item.unread_count > 0 ? 'bold' : 'normal' }]}>
            {lastMessage
              ? new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderConversation}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <IconMessageOff size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.subTextLight }]}>No conversations yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 44 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  card: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  personName: { fontWeight: 'bold', fontSize: 15 },
  listingTitle: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  lastMessage: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 11, alignSelf: 'flex-end' },
  unreadBadge: {
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: { textAlign: 'center', fontSize: 16 },
});