import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { addToQueue } from '../utils/offlineQueue';

export default function DeliveryScreen({ route, navigation }) {
  const { cylinder_id } = route.params || {};
  
  const [otp, setOtp] = useState('');
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingDeliver, setLoadingDeliver] = useState(false);

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is strictly required for delivery tracking.');
        setLoadingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude
      });
    } catch (error) {
      Alert.alert('Location Error', 'Failed to retrieve current GPS coordinates.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleDelivery = async () => {
    if (!otp) {
      Alert.alert('Validation Error', 'OTP must be provided to close delivery.');
      return;
    }

    if (!location) {
      Alert.alert('Validation Error', 'GPS Location must be captured before delivering.');
      return;
    }

    setLoadingDeliver(true);

    try {
      await api.post('/api/deliver-cylinder', {
        cylinder_id: cylinder_id,
        otp_provided: otp, // Variable matching backend specification
        location_lat: location.lat,
        location_lng: location.lng,
        is_offline: false
      });

      Alert.alert('Success', 'Delivery successfully registered and validated!', [
        { text: 'OK', onPress: () => navigation.popToTop() } // Safely reset to Home
      ]);

    } catch (error) {
      if (!error.response) {
        // Network timeout / Offline connection
        await addToQueue({
            cylinder_id: cylinder_id,
            otp: otp,
            location_lat: location.lat,
            location_lng: location.lng
        });
        Alert.alert('Network Unavailable', 'Saved offline. Will retry later.', [
            { text: 'OK', onPress: () => navigation.popToTop() }
        ]);
        return;
      }
      
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to submit delivery data.';
      Alert.alert('Delivery Halted', msg);
    } finally {
      setLoadingDeliver(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Delivery</Text>
      <Text style={styles.cylinderText}>Targeting Cylinder: {cylinder_id}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Customer OTP</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 4-6 digit OTP"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
        />
      </View>

      <View style={styles.locationContainer}>
        {location ? (
          <Text style={styles.locationText}>
            GPS Captured: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.locationMissing}>No Location Captured</Text>
        )}
        
        {loadingLocation ? (
          <ActivityIndicator size="small" color="#0066cc" />
        ) : (
          <Button title="Get Location" onPress={handleGetLocation} color="#0066cc" />
        )}
      </View>

      <View style={styles.actionContainer}>
        {loadingDeliver ? (
          <ActivityIndicator size="large" color="#cc0000" />
        ) : (
          <Button title="Deliver Cylinder" onPress={handleDelivery} color="#cc0000" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  cylinderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
  },
  locationContainer: {
    alignItems: 'center',
    marginBottom: 40,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#006600',
    marginBottom: 10,
    fontWeight: '600',
  },
  locationMissing: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  actionContainer: {
    marginTop: 'auto',
    marginBottom: 30,
  }
});
