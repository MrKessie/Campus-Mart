import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { getImageUrl } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  IconCamera, IconBook, IconDeviceMobile, IconShirt,
  IconSoup, IconArmchair, IconPencil, IconSchool,
  IconPalette, IconScissors, IconCar, IconBox
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

export default function EditListingScreen({ route, navigation }) {
  const { listing } = route.params;
  const { colors } = useTheme();
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(listing.price.toString());
  const [courseCode, setCourseCode] = useState(listing.course_code || '');
  const [categoryId, setCategoryId] = useState(listing.category_id?.toString() || '');
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
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category_id', categoryId);
      formData.append('course_code', courseCode.trim().toUpperCase());
      formData.append('_method', 'PUT');

      if (image) {
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'listing.jpg',
        });
      }

      await api.post(`/listings/${listing.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Listing updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not update listing.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.inner}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Edit Listing</Text>

        <Text style={[styles.label, { color: colors.text }]}>Title</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={title} onChangeText={setTitle} />

        <Text style={[styles.label, { color: colors.text }]}>Course Code (Optional)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="e.g. EPS 111, ICT 232" placeholderTextColor={colors.subTextLight} value={courseCode} onChangeText={setCourseCode} autoCapitalize="characters" />

        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={description} onChangeText={setDescription} multiline numberOfLines={4} />

        <Text style={[styles.label, { color: colors.text }]}>Price (GH₵)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={price} onChangeText={setPrice} keyboardType="numeric" />

        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
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

        <Text style={[styles.label, { color: colors.text }]}>Image</Text>
        <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
          ) : listing.image ? (
            <Image source={{ uri: getImageUrl(listing.image) }} style={styles.previewImage} />
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <IconCamera size={28} color={colors.subTextLight} />
              <Text style={[styles.imagePickerText, { color: colors.subTextLight }]}>Tap to select image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  inner: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryRow: { marginBottom: 16 },
  categoryChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
  categoryChipActive: { backgroundColor: '#FF6600', borderColor: '#FF6600' },
  categoryChipText: { color: '#333', fontSize: 13 },
  categoryChipTextActive: { color: '#fff' },
  imagePicker: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  imagePickerText: { color: '#999', fontSize: 16 },
  previewImage: { width: '100%', height: '100%', borderRadius: 8 },
  imageNote: { color: '#999', fontSize: 12, marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: '#FF6600', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});