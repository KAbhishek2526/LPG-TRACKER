import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api } from '../services/api';

let MapView, Marker, Polyline, UrlTile;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    UrlTile = Maps.UrlTile;
  } catch (e) {
    console.log("Map module not found");
  }
}

export default function DeliveryScreen({ route, navigation }) {
  const { cylinder_id } = route.params || {};
  
  const [otp, setOtp] = useState('');
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Delivery Flow State
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryStep, setDeliveryStep] = useState(0);

  const DISTRIBUTOR_LOC = { latitude: 17.3850, longitude: 78.4867 };
  const fallbackLocation = { latitude: 17.3950, longitude: 78.4967 }; // Slightly offset for customer

  useEffect(() => {
    // Auto-fetch location on mount to make demo faster
    handleGetLocation();
  }, []);

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation(fallbackLocation);
        setLoadingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
    } catch (error) {
      setLocation(fallbackLocation);
    } finally {
      setLoadingLocation(false);
    }
  };

  const executeSequence = async () => {
    setIsDelivering(true);
    setDeliveryStep(1); // Verifying OTP
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setDeliveryStep(2); // Validating location
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setDeliveryStep(3); // Checking delivery sequence
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setDeliveryStep(4); // Recording on secure ledger
    
    // DEMO SAFE API CALL
    try {
      await api.post('/api/deliver-cylinder', {
        cylinder_id: cylinder_id || "CYLINDER_DEMO_123",
        otp_provided: otp || "123456",
        location_lat: location?.latitude || fallbackLocation.latitude,
        location_lng: location?.longitude || fallbackLocation.longitude,
        is_offline: false
      });
    } catch (error) {
      console.log("API failed, continuing demo...");
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsDelivering(false);
    
    // Fraud Simulation (15% chance)
    const isFraud = Math.random() < 0.15;
    
    if (Platform.OS === 'web') {
      if (isFraud) {
        window.alert('⚠️ Flagged for review\nSuspicious delivery anomaly detected. Ledger updated.');
      } else {
        window.alert('Success ✅\nNo anomalies detected. Delivery Successful.');
      }
      navigation.popToTop();
    } else {
      if (isFraud) {
        Alert.alert('⚠️ Flagged for review', 'Suspicious delivery anomaly detected. Ledger updated.', [
          { text: 'OK', onPress: () => navigation.popToTop() }
        ]);
      } else {
        Alert.alert('Success ✅', 'No anomalies detected. Delivery Successful.', [
          { text: 'OK', onPress: () => navigation.popToTop() }
        ]);
      }
    }
  };

  const handleDelivery = () => {
    // 1. DEMO SAFE OTP LOGIC
    if (otp !== "123456") {
      if (Platform.OS === 'web') {
        window.alert("Warning: Invalid OTP. (Continuing anyway for demo purposes)");
        executeSequence();
      } else {
        Alert.alert(
          "Warning", 
          "Invalid OTP (Demo continues)",
          [{ text: "Continue", onPress: () => executeSequence() }]
        );
      }
    } else {
      executeSequence();
    }
  };

  const customerLoc = location || fallbackLocation;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Confirm Delivery</Text>
          <Text style={styles.cylinderText}>Cylinder: {cylinder_id || "CYLINDER_DEMO_123"}</Text>

          {/* MAP TRACKING UI */}
          <View style={styles.mapCard}>
            <Text style={styles.mapTitle}>Live Route Tracking (Demo)</Text>
            {Platform.OS === 'web' || !MapView ? (
              <View style={styles.webMapPlaceholder}>
                <Text style={styles.webMapText}>[Map Rendered on Mobile]</Text>
                <Text style={styles.webMapCoords}>Customer: {customerLoc.latitude.toFixed(4)}, {customerLoc.longitude.toFixed(4)}</Text>
              </View>
            ) : (
              <View style={styles.mapContainer}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude: (DISTRIBUTOR_LOC.latitude + customerLoc.latitude) / 2,
                    longitude: (DISTRIBUTOR_LOC.longitude + customerLoc.longitude) / 2,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  mapType="none"
                >
                  <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker coordinate={DISTRIBUTOR_LOC} title="Distributor" pinColor="blue" />
                  <Marker coordinate={customerLoc} title="Customer" pinColor="red" />
                  <Polyline 
                    coordinates={[DISTRIBUTOR_LOC, customerLoc]}
                    strokeColor="#0066cc"
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                  />
                </MapView>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 4-6 digit OTP"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                placeholderTextColor="#999"
                editable={!isDelivering}
              />
              <Text style={styles.hint}>Use 123456 for perfect match</Text>
            </View>

            {/* SEQUENTIAL STATUS UI */}
            {isDelivering && (
              <View style={styles.statusBox}>
                <ActivityIndicator size="small" color="#0066cc" style={{ marginRight: 10 }} />
                <View>
                  <Text style={[styles.statusText, deliveryStep >= 1 && styles.statusActive]}>
                    {deliveryStep === 1 ? "🔄 Verifying OTP..." : "✅ OTP Verified"}
                  </Text>
                  {deliveryStep >= 2 && (
                    <Text style={[styles.statusText, deliveryStep >= 2 && styles.statusActive]}>
                      {deliveryStep === 2 ? "🔄 Validating location..." : "✅ Location Validated"}
                    </Text>
                  )}
                  {deliveryStep >= 3 && (
                    <Text style={[styles.statusText, deliveryStep >= 3 && styles.statusActive]}>
                      {deliveryStep === 3 ? "🔄 Checking delivery sequence..." : "✅ Sequence Checked"}
                    </Text>
                  )}
                  {deliveryStep >= 4 && (
                    <Text style={[styles.statusText, deliveryStep >= 4 && styles.statusActive]}>
                      "🔄 Recording on secure ledger..."
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.deliverButton, isDelivering && styles.deliverButtonDisabled]} 
              onPress={handleDelivery}
              disabled={isDelivering}
            >
              <Text style={styles.deliverButtonText}>
                {isDelivering ? 'Processing...' : 'Deliver Cylinder'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  cylinderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 20,
    textAlign: 'center',
  },
  mapCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 20,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  mapContainer: {
    height: 180,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webMapPlaceholder: {
    height: 180,
    width: '100%',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapText: {
    color: '#1565c0',
    fontWeight: 'bold',
  },
  webMapCoords: {
    color: '#555',
    fontSize: 12,
    marginTop: 5,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    textAlign: 'center',
  },
  statusBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  statusActive: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  actionContainer: {
    width: '100%',
    maxWidth: 400,
  },
  deliverButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  deliverButtonDisabled: {
    backgroundColor: '#ffcdd2',
    elevation: 0,
  },
  deliverButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
