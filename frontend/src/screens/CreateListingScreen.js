import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  IconCamera, IconBook, IconDeviceMobile, IconShirt,
  IconSoup, IconArmchair, IconPencil, IconSchool,
  IconPalette, IconScissors, IconCar, IconBox, IconX
} from '@tabler/icons-react-native';

const CATEGORY_ICON_MAP = {
  'Textbooks': IconBook,
  'Electronics': IconDeviceMobile,
  'Clothing': IconShirt,
  'Food & Drinks': IconSoup,
  'Furniture': IconArmchair,
  'Stationery': IconPencil,
  'Tutoring': IconSchool,
  'Photography': IconCamera,
  'Graphic Design': IconPalette,
  'Hair & Beauty': IconScissors,
  'Transport': IconCar,
  'Other': IconBox,
};

export default function CreateListingScreen({ navigation }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
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
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos per listing.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0]]);
    }
  }

  function removeImage(index) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!title || !description || !price || !categoryId) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least 1 image.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category_id', categoryId);
      if (courseCode.trim()) {
        formData.append('course_code', courseCode.trim().toUpperCase());
      }
      formData.append('is_service', '0');

      images.forEach((img, idx) => {
        formData.append(`images[${idx}]`, {
          uri: img.uri,
          type: 'image/jpeg',
          name: `listing_${idx}.jpg`,
        });
      });
      formData.append('image', {
        uri: images[0].uri,
        type: 'image/jpeg',
        name: 'listing_0.jpg',
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
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.text }]}>Post a Listing</Text>

        <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g. Engineering Maths Textbook"
          placeholderTextColor={colors.subTextLight}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: colors.text }]}>Course Code (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g. EPS 111, ICT 232"
          placeholderTextColor={colors.subTextLight}
          value={courseCode}
          onChangeText={setCourseCode}
          autoCapitalize="characters"
        />

        <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Describe your item..."
          placeholderTextColor={colors.subTextLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.label, { color: colors.text }]}>Price (GH₵) *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g. 50"
          placeholderTextColor={colors.subTextLight}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {categories.map(cat => {
            const IconComp = CATEGORY_ICON_MAP[cat.name] || IconBox;
            const isSelected = categoryId === cat.id.toString();
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: isSelected ? colors.primary : colors.cardBg, borderColor: isSelected ? colors.primary : colors.border }
                ]}
                onPress={() => setCategoryId(cat.id.toString())}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <IconComp size={16} color={isSelected ? '#fff' : colors.text} />
                  <Text style={[styles.categoryChipText, { color: isSelected ? '#fff' : colors.text }]}>
                    {cat.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: colors.text }]}>Photos (Up to 5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {images.map((img, idx) => (
            <View key={idx} style={styles.thumbWrapper}>
              <Image source={{ uri: img.uri }} style={styles.thumbImage} />
              <TouchableOpacity style={styles.thumbDelete} onPress={() => removeImage(idx)}>
                <IconX size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={[styles.addPhotoButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={pickImage}>
              <IconCamera size={24} color={colors.subTextLight} />
              <Text style={[styles.addPhotoText, { color: colors.subTextLight }]}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={loading}>
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
  thumbWrapper: { width: 90, height: 90, borderRadius: 8, marginRight: 10, position: 'relative' },
  thumbImage: { width: '100%', height: '100%', borderRadius: 8 },
  thumbDelete: { position: 'absolute', top: -4, right: -4, backgroundColor: '#c62828', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  addPhotoButton: { width: 90, height: 90, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  addPhotoText: { color: '#999', fontSize: 11, marginTop: 4 },
  button: { backgroundColor: '#FF6600', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});