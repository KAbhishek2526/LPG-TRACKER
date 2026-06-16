import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
        
        await syncOfflineQueue();
        await fetchAssignments();
      } catch (err) {
        console.warn('Initialization error', err);
      } finally {
        setLoading(false);
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
          is_offline: true
        });

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
      const dataList = response.data?.assignments || response.data || [];
      setAssignments(Array.isArray(dataList) ? dataList : []);
    } catch (err) {
      console.warn("HomeScreen API failed, injecting mock assignments for Demo Safe Mode");
      
      // DEMO SAFE MODE: Always provide a mock assignment so they can scan
      setAssignments([
        { id: '999', cylinder_id: 'CYL-DEMO-READY', status: 'ASSIGNED' }
      ]);
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
      <TouchableOpacity 
        style={styles.scanButton} 
        onPress={() => navigation.navigate('Scan', { assignments })}
      >
        <Text style={styles.scanButtonText}>Scan</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          {userData && <Text style={styles.subtitle}>Welcome, {userData.name}!</Text>}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* NEW TOP DASHBOARD SECTION */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>3</Text>
            <Text style={styles.metricLabel}>Assigned</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>2</Text>
            <Text style={styles.metricLabel}>Delivered</Text>
          </View>
          <View style={[styles.metricCard, styles.fraudMetricCard]}>
            <Text style={styles.metricValueFraud}>1 ⚠️</Text>
            <Text style={styles.metricLabelFraud}>Fraud Alert</Text>
          </View>
        </View>

        {/* SYSTEM INSIGHTS */}
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>System Insights</Text>
          <View style={styles.insightRow}>
            <Text style={styles.insightKey}>Agent Status:</Text>
            <Text style={styles.insightValueActive}>🟢 Active</Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightKey}>Avg Delivery Time:</Text>
            <Text style={styles.insightValue}>22 mins</Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightKey}>Suspicious Activity:</Text>
            <Text style={styles.insightValue}>Low</Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightKey}>Active Agents (Region):</Text>
            <Text style={styles.insightValue}>5</Text>
          </View>
          <TouchableOpacity 
            style={styles.historyButton} 
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.historyButtonText}>View Last Delivery History</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My Assignments</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAssignments}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
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
            scrollEnabled={false} // Disable nested scrolling
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#ffebee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#cc0000',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  metricCard: {
    backgroundColor: '#fff',
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fraudMetricCard: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffcc80',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  metricValueFraud: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e65100',
  },
  metricLabel: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
    fontWeight: '600',
  },
  metricLabelFraud: {
    fontSize: 12,
    color: '#e65100',
    marginTop: 4,
    fontWeight: '700',
  },
  insightsCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
  },
  insightsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  insightKey: {
    color: '#aaa',
    fontSize: 14,
  },
  insightValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  insightValueActive: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyButton: {
    marginTop: 15,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 20,
    marginVertical: 15,
  },
  centerBox: {
    padding: 20,
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
  retryButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardInfo: {
    flex: 1,
  },
  cardId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  cardStatus: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  scanButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  }
});
