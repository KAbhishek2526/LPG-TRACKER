import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen({ navigation }) {
  const timeline = [
    { id: 1, status: 'ASSIGNED', time: '09:00 AM', location: 'Central Warehouse', detail: 'Agent John Doe assigned.' },
    { id: 2, status: 'IN TRANSIT', time: '10:15 AM', location: 'Route 44, Secunderabad', detail: 'GPS verified. No route deviation.' },
    { id: 3, status: 'SCANNED', time: '11:05 AM', location: 'Checkpoint B', detail: 'Cylinder Authenticity Check Passed.' },
    { id: 4, status: 'DELIVERED', time: '11:30 AM', location: 'Customer X, Banjara Hills', detail: 'OTP matched. Blockchain ledger updated.' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delivery History</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.securityBadge}>
          <Text style={styles.securityText}>✅ No anomalies detected. Chain intact.</Text>
        </View>

        <View style={styles.timelineContainer}>
          {timeline.map((item, index) => (
            <View key={item.id} style={styles.timelineRow}>
              {/* Timeline Line & Dot */}
              <View style={styles.timelineGraphic}>
                <View style={[styles.dot, index === timeline.length - 1 && styles.lastDot]} />
                {index !== timeline.length - 1 && <View style={styles.line} />}
              </View>
              
              {/* Timeline Content */}
              <View style={styles.timelineContent}>
                <Text style={styles.time}>{item.time}</Text>
                <View style={styles.card}>
                  <Text style={styles.statusBadge}>{item.status}</Text>
                  <Text style={styles.location}>📍 {item.location}</Text>
                  <Text style={styles.detail}>{item.detail}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
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
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 10,
  },
  backText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  securityBadge: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  securityText: {
    color: '#2e7d32',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 14,
  },
  timelineContainer: {
    paddingLeft: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineGraphic: {
    alignItems: 'center',
    width: 30,
    marginRight: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9e9e9e',
    zIndex: 1,
  },
  lastDot: {
    backgroundColor: '#0066cc',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: -7,
    marginBottom: -7,
  },
  timelineContent: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0066cc',
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  detail: {
    fontSize: 13,
    color: '#666',
  }
});
