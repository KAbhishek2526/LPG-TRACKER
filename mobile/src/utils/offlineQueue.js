import { getData, storeData } from './storage';
import { v4 as uuidv4 } from 'uuid'; // React Native UUID approach (might need 'react-native-uuid' if standard uuid crashes, but we'll use a fast random fallback just in case for MVP)

const QUEUE_KEY = 'offline_delivery_queue';

// Basic rapid unique ID generator suitable for MVP offline queue caching
const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const getQueue = async () => {
  const queue = await getData(QUEUE_KEY);
  return queue ? queue : [];
};

export const addToQueue = async (deliveryData) => {
  const queue = await getQueue();
  
  // Prevent duplicate cylinder additions
  const exists = queue.find(item => item.cylinder_id === deliveryData.cylinder_id);
  if (exists) {
    console.warn('Cylinder already cached in offline queue.');
    return;
  }

  const newItem = {
    id: generateUniqueId(),
    ...deliveryData,
    timestamp: new Date().toISOString()
  };

  queue.push(newItem);
  await storeData(QUEUE_KEY, queue);
};

export const removeFromQueue = async (id) => {
  const queue = await getQueue();
  const newQueue = queue.filter(item => item.id !== id);
  await storeData(QUEUE_KEY, newQueue);
};
