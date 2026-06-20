import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

export default function CreateListingScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setCategoryId(response.data[0].id.toString());
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  }

  async function handleSubmit() {
    if (!title || !description || !price || !categoryId) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (!image) {
      Alert.alert('Error', 'Please select an image.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category_id', categoryId);
      formData.append('is_service', '0');
      formData.append('image', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'listing.jpg',
      });

      await api.post('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Listing created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not create listing.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Post a Listing</Text>

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} placeholder="e.g. Engineering Maths Textbook" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your item..." value={description} onChangeText={setDescription} multiline numberOfLines={4} />

        <Text style={styles.label}>Price (GH₵)</Text>
        <TextInput style={styles.input} placeholder="e.g. 50" value={price} onChangeText={setPrice} keyboardType="numeric" />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, categoryId === cat.id.toString() && styles.categoryChipActive]}
              onPress={() => setCategoryId(cat.id.toString())}
            >
              <Text style={[styles.categoryChipText, categoryId === cat.id.toString() && styles.categoryChipTextActive]}>
                {cat.icon} {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>📷 Tap to select image</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Post Listing</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  inner: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryRow: { marginBottom: 16 },
  categoryChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
  categoryChipActive: { backgroundColor: '#FF6600', borderColor: '#FF6600' },
  categoryChipText: { color: '#333', fontSize: 13 },
  categoryChipTextActive: { color: '#fff' },
  imagePicker: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  imagePickerText: { color: '#999', fontSize: 16 },
  previewImage: { width: '100%', height: '100%', borderRadius: 8 },
  button: { backgroundColor: '#FF6600', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});