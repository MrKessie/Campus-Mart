import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { IconBellRinging, IconTrash } from '@tabler/icons-react-native';

export default function SavedSearchesScreen({ navigation }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchSavedSearches();
    }, [])
  );

  async function fetchSavedSearches() {
    try {
      const response = await api.get('/saved-searches');
      setSavedSearches(response.data || []);
    } catch (error) {
      console.log('Error fetching saved searches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchSavedSearches();
  }

  async function deleteSavedSearch(id) {
    try {
      await api.delete(`/saved-searches/${id}`);
      setSavedSearches(prev => prev.filter(s => s.id !== id));
      Alert.alert('Deleted', 'Search alert removed.');
    } catch (error) {
      Alert.alert('Error', 'Could not delete search alert.');
    }
  }

  function renderSearchCard({ item }) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.keywordText, { color: colors.text }]}>"{item.keyword}"</Text>
          {item.category && (
            <Text style={[styles.categoryText, { color: colors.subTextLight }]}>
              Category: {item.category.name}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSavedSearch(item.id)}>
          <IconTrash size={18} color="#c62828" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={savedSearches}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <IconBellRinging size={48} color={colors.subTextLight} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                No search alerts saved yet.{'\n'}Search items on Home and tap the alert bell to receive updates!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  keywordText: { fontSize: 15, fontWeight: 'bold' },
  categoryText: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
