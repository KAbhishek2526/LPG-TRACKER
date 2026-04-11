import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, FlatList, ActivityIndicator } from 'react-native';
import { getData, removeData } from '../utils/storage';
import { api } from '../services/api';
import { getQueue, removeFromQueue } from '../utils/offlineQueue';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserAndAssignments = async () => {
      try {
        const user = await getData('user_data');
        if (user) setUserData(user);
        
        // 1. Synchronously attempt an offline queue flush on boot
        await syncOfflineQueue();

        // 2. Refresh active assignment state
        await fetchAssignments();
      } catch (err) {
        console.warn('Initialization error', err);
      }
    };
    loadUserAndAssignments();
  }, []);

  const syncOfflineQueue = async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} offline deliveries...`);
    
    for (const item of queue) {
      try {
        await api.post('/api/deliver-cylinder', {
          cylinder_id: item.cylinder_id,
          otp_provided: item.otp,
          location_lat: item.location_lat,
          location_lng: item.location_lng,
          is_offline: true // Critical tag representing offline queue structure
        });

        // Natively purge from UI cache when server confirms transaction block
        await removeFromQueue(item.id);
      } catch (error) {
        console.warn(`Offline sync failed for packet ${item.id}`, error.response?.data || error.message);
      }
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/agent/assignments');
      // Assume the backend returns data inside an array or inside a data property format
      const dataList = response.data?.assignments || response.data || [];
      setAssignments(Array.isArray(dataList) ? dataList : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout requested but network failed. Clearing local cache anyway.');
    }
    
    // Purge local cache
    await removeData('jwt_token');
    await removeData('session_id');
    await removeData('device_fingerprint');
    await removeData('user_data');

    navigation.replace('Login');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardId}>Cylinder: {item.cylinder_id}</Text>
        <Text style={styles.cardStatus}>Status: {item.status}</Text>
      </View>
      <Button 
        title="Scan" 
        onPress={() => navigation.navigate('Scan', { assignments })} 
        color="#0066cc" 
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agent Dashboard</Text>
        {userData && <Text style={styles.subtitle}>Welcome, {userData.name}!</Text>}
        <Button title="Logout" onPress={handleLogout} color="#cc0000" />
      </View>

      <Text style={styles.sectionTitle}>My Assignments</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={fetchAssignments} color="#0066cc" />
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No assignments found.</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 20,
    marginVertical: 15,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#cc0000',
    marginBottom: 10,
    fontSize: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  cardInfo: {
    flex: 1,
  },
  cardId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 14,
    color: '#444',
  }
});
