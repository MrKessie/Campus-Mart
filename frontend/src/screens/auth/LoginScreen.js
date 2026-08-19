import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    setNotVerified(false);
    try {
      await login(email, password);
    } catch (error) {
      if (error.response?.status === 403) {
        setNotVerified(true);
      } else {
        Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      await api.post('/email/resend', { email });
      Alert.alert('Email Sent', 'A new verification email has been sent. Please check your inbox.');
    } catch (error) {
      Alert.alert('Error', 'Could not resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>CampusMart</Text>
        <Text style={styles.subtitle}>UEW Student Marketplace</Text>

        <TextInput
          style={styles.input}
          placeholder="UEW Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {notVerified && (
          <View style={styles.verificationBox}>
            <Text style={styles.verificationText}>
              Your email is not verified. Please check your inbox and click the verification link.
            </Text>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={resendVerification}
              disabled={resending}
            >
              {resending
                ? <ActivityIndicator color="#1E3A5F" size="small" />
                : <Text style={styles.resendButtonText}>Resend Verification Email</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  passwordContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, alignItems: 'center' },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { padding: 14 },
  eyeText: { fontSize: 18 },
  verificationBox: { backgroundColor: '#fff3e0', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFB74D' },
  verificationText: { color: '#E65100', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  resendButton: { backgroundColor: '#fff', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1E3A5F' },
  resendButtonText: { color: '#1E3A5F', fontWeight: 'bold', fontSize: 14 },
  button: { backgroundColor: '#1E3A5F', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#1E3A5F', textAlign: 'center', fontSize: 14 },
});