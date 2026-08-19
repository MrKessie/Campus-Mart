import EditListingScreen from './src/screens/EditListingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { registerForPushNotifications } from './src/services/notificationService';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, icon, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 70 }}>
      <Text style={{ fontSize: 22, marginBottom: 2 }}>{icon}</Text>
      <Text
        numberOfLines={1}
        style={{ fontSize: 9, color: focused ? '#F68B1E' : '#888', fontWeight: focused ? 'bold' : 'normal' }}
      >
        {label}
      </Text>
    </View>
  );
}

function SellButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.sellButton} onPress={onPress}>
      <Text style={styles.sellButtonText}>+</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="WatchlistTab"
        component={WatchlistScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Saved" icon="🔖" focused={focused} />,
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
          tabBarIcon: ({ focused }) => <TabIcon label="Messages" icon="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Account" icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F68B1E" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ListingDetail" component={ListingDetailScreen}
            options={{ headerShown: true, title: 'Listing Details', headerStyle: { backgroundColor: '#F68B1E' }, headerTintColor: '#fff' }}
          />
          <Stack.Screen name="CreateListing" component={CreateListingScreen}
            options={{ headerShown: true, title: 'Post a Listing', headerStyle: { backgroundColor: '#F68B1E' }, headerTintColor: '#fff' }}
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
  options={{ headerShown: true, title: 'Edit Listing', headerStyle: { backgroundColor: '#FF6600' }, headerTintColor: '#fff' }}
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
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
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
});