import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './api';

// Expose Pusher globally for Laravel Echo
if (typeof window !== 'undefined') {
  window.Pusher = Pusher;
} else if (typeof global !== 'undefined') {
  global.Pusher = Pusher;
}

let echoInstance = null;

export function getEcho() {
  if (echoInstance) {
    return echoInstance;
  }

  const hostUri = BASE_URL ? new URL(BASE_URL).hostname : '172.20.10.3';
  const port = process.env.EXPO_PUBLIC_REVERB_PORT || 8080;
  const isPusherCloud = Boolean(process.env.EXPO_PUBLIC_PUSHER_KEY);

  const echoConfig = isPusherCloud
    ? {
        broadcaster: 'pusher',
        key: process.env.EXPO_PUBLIC_PUSHER_KEY,
        cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'mt1',
        forceTLS: true,
      }
    : {
        broadcaster: 'reverb',
        key: process.env.EXPO_PUBLIC_REVERB_KEY || 'campusmart-key',
        wsHost: process.env.EXPO_PUBLIC_REVERB_HOST || hostUri,
        wsPort: port,
        wssPort: port,
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],
      };

  echoInstance = new Echo({
    ...echoConfig,
    authorizer: (channel, options) => ({
      authorize: async (socketId, callback) => {
        try {
          const token = await AsyncStorage.getItem('token');
          const authUrl = `${BASE_URL}/api/broadcasting/auth`;
          const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            callback(true, new Error(`Authorization failed: ${response.status} ${errText}`));
            return;
          }

          const data = await response.json();
          callback(false, data);
        } catch (error) {
          callback(true, error);
        }
      },
    }),
  });

  return echoInstance;
}

export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

export default getEcho;
