import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sendLocalNotification } from '../services/notificationService';

export default function ConversationScreen({ route }) {
  const { conversation } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const previousMessageCount = useRef(0);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMessages() {
    try {
      const response = await api.get(`/conversations/${conversation.id}/messages`);
      const fetchedMessages = response.data;

      if (
        previousMessageCount.current > 0 &&
        fetchedMessages.length > previousMessageCount.current
      ) {
        const latestMessage = fetchedMessages[fetchedMessages.length - 1];
        if (latestMessage.sender_id !== user?.id) {
          const senderName = conversation.buyer_id === user?.id
            ? conversation.seller?.name
            : conversation.buyer?.name;
          await sendLocalNotification(
            `New message from ${senderName}`,
            latestMessage.body
          );
        }
      }

      previousMessageCount.current = fetchedMessages.length;
      setMessages(fetchedMessages);
    } catch (error) {
      console.log('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const response = await api.post(`/conversations/${conversation.id}/messages`, {
        body: newMessage
      });
      setMessages(prev => [...prev, response.data]);
      previousMessageCount.current += 1;
      setNewMessage('');
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.log('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }) {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
          {item.body}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{conversation.listing?.title}</Text>
        <Text style={styles.headerSubtitle}>
          {conversation.buyer_id === user?.id
            ? `Seller: ${conversation.seller?.name}`
            : `Buyer: ${conversation.buyer?.name}`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6600" style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          }
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sending}>
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendButtonText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#FF6600', padding: 16, paddingTop: 48 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerSubtitle: { color: '#fff', fontSize: 13, marginTop: 2, opacity: 0.85 },
  messagesList: { padding: 16, flexGrow: 1 },
  messageBubble: { maxWidth: '75%', borderRadius: 16, padding: 12, marginBottom: 8 },
  myBubble: { backgroundColor: '#FF6600', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, elevation: 1 },
  messageText: { fontSize: 15 },
  myText: { color: '#fff' },
  theirText: { color: '#333' },
  messageTime: { fontSize: 11, color: '#ffe0cc', marginTop: 4, alignSelf: 'flex-end' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100, fontSize: 15 },
  sendButton: { backgroundColor: '#FF6600', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
});