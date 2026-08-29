import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconCheck, IconAlertCircle, IconInfoCircle, IconBellRinging, IconX } from '@tabler/icons-react-native';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 2600) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Trigger haptics feedback
    try {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      // Ignore if haptics unsupported
    }

    setToast({ message, type });

    translateY.setValue(-60);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
        speed: 14,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -60,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast(null);
      });
    }, duration);
  }, [translateY, opacity]);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const getIcon = () => {
    if (!toast) return null;
    const size = 18;
    switch (toast.type) {
      case 'error':
        return <IconAlertCircle size={size} color="#fff" strokeWidth={2.2} />;
      case 'warning':
        return <IconAlertCircle size={size} color="#fff" strokeWidth={2.2} />;
      case 'info':
        return <IconInfoCircle size={size} color="#fff" strokeWidth={2.2} />;
      case 'alert':
        return <IconBellRinging size={size} color="#fff" strokeWidth={2.2} />;
      case 'success':
      default:
        return <IconCheck size={size} color="#fff" strokeWidth={2.4} />;
    }
  };

  const getBackgroundColor = () => {
    if (!toast) return '#10B981';
    switch (toast.type) {
      case 'error':
        return '#DC2626';
      case 'warning':
        return '#D97706';
      case 'info':
        return '#0284C7';
      case 'alert':
        return '#FF6600';
      case 'success':
      default:
        return '#059669';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top, 20) + 10,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={[styles.toastCard, { backgroundColor: getBackgroundColor() }]}>
            <View style={styles.iconWrapper}>{getIcon()}</View>
            <Text style={styles.toastMessage} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      hideToast: () => {},
    };
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrapper: {
    marginRight: 8,
  },
  toastMessage: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
});
