import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import {
  IconBuildingStore, IconMail, IconLock, IconEye, IconEyeOff,
  IconShieldCheck, IconArrowRight, IconSparkles, IconAlertCircle,
  IconMapPin, IconLockCheck
} from '@tabler/icons-react-native';

export default function LoginScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();

  function appendDomain() {
    if (!email.includes('@')) {
      setEmail(prev => `${prev.trim()}@uew.edu.gh`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Please enter your UEW email and password.', 'warning');
      return;
    }

    setLoading(true);
    setNotVerified(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await login(cleanEmail, password);
      showToast('Welcome back to CampusMart! 👋', 'success');
    } catch (error) {
      if (error.response?.status === 403) {
        setNotVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast('Your email is not verified yet.', 'warning');
      } else {
        const errorMsg =
          error.response?.data?.message ||
          (error.response?.data?.errors && Object.values(error.response.data.errors).flat().join('\n')) ||
          error.message ||
          'Invalid credentials. Please try again.';
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!email) {
      showToast('Enter your UEW email address first.', 'warning');
      return;
    }
    setResending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post('/email/resend', { email: email.trim().toLowerCase() });
      showToast('Verification email resent! Check your inbox 📬', 'success');
    } catch (error) {
      showToast('Could not resend email. Please verify the address.', 'error');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Visual Brand Section */}
        <View style={styles.headerSection}>
          <View style={[styles.brandLogoContainer, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <IconBuildingStore size={40} color={colors.primary} />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            Campus<Text style={{ color: colors.primary }}>Mart</Text>
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.subText }]}>
            The trusted student marketplace for UEW
          </Text>

          {/* Student Verification Badge */}
          <View style={[styles.securityPill, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: isDark ? '#334155' : '#BFDBFE' }]}>
            <IconShieldCheck size={15} color="#2563EB" />
            <Text style={[styles.securityPillText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
              Verified Students Only (@uew.edu.gh)
            </Text>
          </View>
        </View>

        {/* Card Form */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.formHeader, { color: colors.text }]}>Sign In</Text>
          <Text style={[styles.formSub, { color: colors.subTextLight }]}>
            Access your listings, safe chats, and orders
          </Text>

          {/* Email Input */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Student Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <IconMail size={20} color={colors.subTextLight} style={styles.leadingIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. indexNumber@uew.edu.gh"
              placeholderTextColor={colors.subTextLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {email.length > 0 && !email.includes('@') && (
              <TouchableOpacity style={[styles.quickDomainBtn, { backgroundColor: colors.primaryLight }]} onPress={appendDomain}>
                <Text style={[styles.quickDomainText, { color: colors.primary }]}>+@uew.edu.gh</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Password Input */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <IconLock size={20} color={colors.subTextLight} style={styles.leadingIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.subTextLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.trailingIconBtn}
              onPress={() => {
                setShowPassword(!showPassword);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {showPassword ? (
                <IconEyeOff size={20} color={colors.subTextLight} />
              ) : (
                <IconEye size={20} color={colors.subTextLight} />
              )}
            </TouchableOpacity>
          </View>

          {/* Email Unverified Warning Box */}
          {notVerified && (
            <View style={styles.verificationCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <IconAlertCircle size={18} color="#D97706" />
                <Text style={styles.verificationTitle}>Verification Required</Text>
              </View>
              <Text style={styles.verificationText}>
                Please check your student email inbox and tap the confirmation link to activate your account.
              </Text>
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={resendVerification}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator color="#92400E" size="small" />
                ) : (
                  <Text style={styles.resendBtnText}>Resend Confirmation Link</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.8 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Text style={styles.submitBtnText}>Sign In</Text>
                <IconArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Switch to Register */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.subText }]}>New to CampusMart? </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Register');
              }}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>Create an Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Value Highlights */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <IconLockCheck size={16} color={colors.subTextLight} />
            <Text style={[styles.featureText, { color: colors.subTextLight }]}>Escrow Protected</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <IconMapPin size={16} color={colors.subTextLight} />
            <Text style={[styles.featureText, { color: colors.subTextLight }]}>Campus Safe Zones</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  securityPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  formHeader: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  trailingIconBtn: {
    padding: 8,
  },
  quickDomainBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickDomainText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verificationCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  verificationTitle: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 13,
  },
  verificationText: {
    color: '#78350F',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  resendBtn: {
    backgroundColor: '#FDE68A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  resendBtnText: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
  },
  featureDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
});