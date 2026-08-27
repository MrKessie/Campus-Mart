import EditListingScreen from './src/screens/EditListingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import MyListingsScreen from './src/screens/MyListingsScreen';
import PriceOffersScreen from './src/screens/PriceOffersScreen';
import PaymentHistoryScreen from './src/screens/PaymentHistoryScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import SavedSearchesScreen from './src/screens/SavedSearchesScreen';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import api from './src/services/api';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { registerForPushNotifications } from './src/services/notificationService';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import { IconHome, IconBookmark, IconPlus, IconMessage, IconUser } from '@tabler/icons-react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, icon: IconComponent, focused, badgeCount }) {
  const { colors } = useTheme();
  const color = focused ? colors.primary : colors.subTextLight;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 70, position: 'relative' }}>
      <View style={{ position: 'relative' }}>
        {IconComponent && <IconComponent size={22} color={color} style={{ marginBottom: 2 }} />}
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 9, color, fontWeight: focused ? 'bold' : 'normal' }}
      >
        {label}
      </Text>
    </View>
  );
}

function SellButton({ onPress }) {
  const insets = useSafeAreaInsets();
  const bottomMargin = Platform.OS === 'android' ? Math.max(insets.bottom, 10) + 12 : 20;

  return (
    <TouchableOpacity style={[styles.sellButton, { marginBottom: bottomMargin }]} onPress={onPress}>
      <IconPlus size={28} color="#fff" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 10) : insets.bottom;
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 4000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCounts() {
    try {
      const [offersRes, unreadRes] = await Promise.all([
        api.get('/my-offers'),
        api.get('/unread-count')
      ]);

      const sentPending = (offersRes.data.sent || []).filter(o => o.status === 'pending').length;
      const receivedPending = (offersRes.data.received || []).filter(o => o.status === 'pending').length;
      setPendingOffersCount(sentPending + receivedPending);

      if (unreadRes.data && typeof unreadRes.data.count === 'number') {
        setUnreadMessagesCount(unreadRes.data.count);
      }
    } catch (e) {
      console.log('Error fetching badge counts:', e);
    }
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            height: 60 + bottomInset,
            paddingBottom: bottomInset > 0 ? bottomInset : 6,
          }
        ],
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" icon={IconHome} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="WatchlistTab"
        component={WatchlistScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Saved" icon={IconBookmark} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SellTab"
        component={CreateListingScreen}
        options={{
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <SellButton onPress={props.onPress} />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={ConversationsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Messages" icon={IconMessage} focused={focused} badgeCount={unreadMessagesCount} />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Account" icon={IconUser} focused={focused} badgeCount={pendingOffersCount} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (user) {
      registerForPushNotifications();

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification tapped:', response);
      });
    }

   return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ListingDetail" component={ListingDetailScreen}
            options={{ headerShown: true, title: 'Listing Details', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="CreateListing" component={CreateListingScreen}
            options={{ headerShown: true, title: 'Post a Listing', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="Conversations" component={ConversationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Conversation" component={ConversationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Watchlist" component={WatchlistScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="EditListing" component={EditListingScreen}
            options={{ headerShown: true, title: 'Edit Listing', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="MyListings" component={MyListingsScreen}
            options={{ headerShown: true, title: 'My Listings', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="PriceOffers" component={PriceOffersScreen}
            options={{ headerShown: true, title: 'Price Offers', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen}
            options={{ headerShown: true, title: 'Payment & Escrow History', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="Appointments" component={AppointmentsScreen}
            options={{ headerShown: true, title: 'Service Appointments', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="SavedSearches" component={SavedSearchesScreen}
            options={{ headerShown: true, title: 'Search Alerts', headerBackTitleVisible: false, headerBackTitle: '', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 10,
  },
  sellButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F68B1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#F68B1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  sellButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: -2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#d32f2f',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});