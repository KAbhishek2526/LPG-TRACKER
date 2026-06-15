import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../services/api';

const QUEUE_KEY = '@offline_delivery_queue';

const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const saveToOfflineQueue = async (endpoint, payload) => {
  try {
    const queueData = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = queueData ? JSON.parse(queueData) : [];
    
    const exists = queue.find(item => item.payload.cylinder_id === payload.cylinder_id && item.endpoint === endpoint);
    if (exists) {
      console.warn('Action already cached in offline queue.');
      return true;
    }

    const offlineItem = {
      id: generateUniqueId(),
      endpoint,
      payload: {
        ...payload,
        client_timestamp: new Date().toISOString(),
        is_offline: true
      }
    };
    
    queue.push(offlineItem);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log("Saved to offline queue.");
    return true;
  } catch (error) {
    console.error("Error saving to offline queue", error);
    return false;
  }
};

export const syncOfflineData = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  try {
    const queueData = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueData) return;
    
    const queue = JSON.parse(queueData);
    if (queue.length === 0) return;

    console.log(`Starting sync for ${queue.length} offline items`);
    
    const response = await api.post('/api/v1/sync/offline', { packets: queue });
    
    if (response.data && response.data.success) {
      await AsyncStorage.removeItem(QUEUE_KEY);
      console.log("Offline sync completed successfully.");
    }
  } catch (error) {
    console.error("Failed to sync offline data", error);
  }
};

NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncOfflineData();
  }
});
