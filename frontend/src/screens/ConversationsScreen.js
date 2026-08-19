import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ConversationsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchConversations();
  }, []);

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
    const lastMessage = item.latest_message;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Conversation', { conversation: item })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherPerson?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.personName}>{otherPerson?.name}</Text>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {item.listing?.title}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage ? lastMessage.body : 'No messages yet'}
          </Text>
        </View>
        <Text style={styles.time}>
          {lastMessage
            ? new Date(lastMessage.created_at).toLocaleDateString()
            : ''}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6600" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderConversation}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No conversations yet.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#FF6600', padding: 16, paddingTop: 48 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, marginBottom: 1, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF6600', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  personName: { fontWeight: 'bold', fontSize: 15, color: '#333', marginBottom: 2 },
  listingTitle: { fontSize: 13, color: '#FF6600', marginBottom: 2 },
  lastMessage: { fontSize: 13, color: '#999' },
  time: { fontSize: 11, color: '#999' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 },
});