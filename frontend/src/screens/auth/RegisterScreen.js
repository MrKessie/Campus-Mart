import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import api from '../../services/api';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const cleanEmail = email.trim().toLowerCase();
    if (!name || !cleanEmail || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (!cleanEmail.endsWith('@uew.edu.gh')) {
      Alert.alert('Error', 'Only UEW student emails (@uew.edu.gh) are allowed.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/register', {
        name,
        email: cleanEmail,
        password,
        password_confirmation: confirmPassword,
      });
      Alert.alert(
        'Registration Successful!',
        'A verification email has been sent to your UEW email address. Please verify your email before logging in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors && Object.values(error.response.data.errors).flat().join('\n')) ||
        error.message ||
        'Something went wrong.';
      Alert.alert('Registration Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the UEW Marketplace</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="UEW Email (@uew.edu.gh)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  button: { backgroundColor: '#1E3A5F', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#1E3A5F', textAlign: 'center', fontSize: 14 },
});