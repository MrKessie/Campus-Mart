import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { IconEye, IconEyeOff } from '@tabler/icons-react-native';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
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
    const cleanEmail = email.trim().toLowerCase();
    try {
      await login(cleanEmail, password);
    } catch (error) {
      if (error.response?.status === 403) {
        setNotVerified(true);
      } else {
        const errorMsg =
          error.response?.data?.message ||
          (error.response?.data?.errors && Object.values(error.response.data.errors).flat().join('\n')) ||
          error.message ||
          'Something went wrong.';
        Alert.alert('Login Failed', errorMsg);
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.primary }]}>CampusMart</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>UEW Student Marketplace</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="UEW Email"
          placeholderTextColor={colors.subTextLight}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={[styles.passwordContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.subTextLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <IconEyeOff size={20} color={colors.subTextLight} /> : <IconEye size={20} color={colors.subTextLight} />}
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
                ? <ActivityIndicator color="#856404" size="small" />
                : <Text style={styles.resendButtonText}>Resend Verification Email</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Don't have an account? <Text style={{ fontWeight: 'bold' }}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  inner: { padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
  input: { borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16, borderWidth: 1 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 14, fontSize: 16 },
  eyeButton: { padding: 12 },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { textAlign: 'center', fontSize: 14 },
  verificationBox: { backgroundColor: '#FFF3CD', borderColor: '#FFEEBA', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  verificationText: { color: '#856404', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  resendButton: { backgroundColor: '#FFE8A1', borderRadius: 6, padding: 8, alignItems: 'center' },
  resendButtonText: { color: '#856404', fontSize: 13, fontWeight: 'bold' },
});