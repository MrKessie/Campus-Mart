import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import {
  IconUserPlus, IconUser, IconMail, IconLock,
  IconEye, IconEyeOff, IconShieldCheck, IconCheck,
  IconArrowRight, IconLockCheck, IconMapPin
} from '@tabler/icons-react-native';

export default function RegisterScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function appendDomain() {
    if (!email.includes('@')) {
      setEmail(prev => `${prev.trim()}@uew.edu.gh`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  const isEmailDomainValid = email.trim().toLowerCase().endsWith('@uew.edu.gh');
  const isPasswordLongEnough = password.length >= 8;
  const isPasswordMatching = password.length > 0 && password === confirmPassword;

  async function handleRegister() {
    const cleanEmail = email.trim().toLowerCase();

    if (!name.trim() || !cleanEmail || !password || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Please fill in all registration fields.', 'warning');
      return;
    }

    if (!isEmailDomainValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Only official UEW emails (@uew.edu.gh) are permitted.', 'warning');
      return;
    }

    if (!isPasswordLongEnough) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Password must contain at least 8 characters.', 'warning');
      return;
    }

    if (!isPasswordMatching) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Passwords do not match. Please re-enter.', 'warning');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.post('/register', {
        name: name.trim(),
        email: cleanEmail,
        password,
        password_confirmation: confirmPassword,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Account created! Verification email sent 📬', 'success');

      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors && Object.values(error.response.data.errors).flat().join('\n')) ||
        error.message ||
        'Registration failed. Please check your details.';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
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
        {/* Header Branding */}
        <View style={styles.headerSection}>
          <View style={[styles.brandLogoContainer, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <IconUserPlus size={36} color={colors.primary} />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.brandSubtitle, { color: colors.subText }]}>
            Join the verified UEW student marketplace
          </Text>

          {/* Student Verification Note */}
          <View style={[styles.securityPill, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: isDark ? '#334155' : '#BFDBFE' }]}>
            <IconShieldCheck size={15} color="#2563EB" />
            <Text style={[styles.securityPillText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
              Official UEW student email required
            </Text>
          </View>
        </View>

        {/* Card Form */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Full Name */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Full Name</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <IconUser size={20} color={colors.subTextLight} style={styles.leadingIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Kwesi Mensah"
              placeholderTextColor={colors.subTextLight}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>UEW Student Email</Text>
            {email.length > 0 && (
              <Text style={{ fontSize: 11, color: isEmailDomainValid ? '#10B981' : '#F59E0B', fontWeight: '600' }}>
                {isEmailDomainValid ? 'Valid @uew.edu.gh' : 'Needs @uew.edu.gh'}
              </Text>
            )}
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <IconMail size={20} color={colors.subTextLight} style={styles.leadingIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="indexNumber@uew.edu.gh"
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

          {/* Password */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <IconLock size={20} color={colors.subTextLight} style={styles.leadingIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Minimum 8 characters"
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

          {/* Confirm Password */}
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Confirm Password</Text>
            {confirmPassword.length > 0 && (
              <Text style={{ fontSize: 11, color: isPasswordMatching ? '#10B981' : '#EF4444', fontWeight: '600' }}>
                {isPasswordMatching ? 'Passwords match ✓' : 'Passwords do not match'}
              </Text>
            )}
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <IconLock size={20} color={colors.subTextLight} style={styles.leadingIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Re-enter password"
              placeholderTextColor={colors.subTextLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.trailingIconBtn}
              onPress={() => {
                setShowConfirmPassword(!showConfirmPassword);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {showConfirmPassword ? (
                <IconEyeOff size={20} color={colors.subTextLight} />
              ) : (
                <IconEye size={20} color={colors.subTextLight} />
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.8 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Text style={styles.submitBtnText}>Create My Account</Text>
                <IconArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Switch to Login */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.subText }]}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Login');
              }}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety Badges */}
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
    marginBottom: 20,
  },
  brandLogoContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
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
  submitBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
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