import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { api } from '../services/api';
import { storeData } from '../utils/storage';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const generateDeviceFingerprint = () => {
    // Basic fingerprint logic for MVP. 
    // In production, this would be a constant hardware-bound hash synced server-side on creation.
    const uniqueId = Application.androidId ? Application.androidId : Device.osBuildId;
    return `${Device.modelName}_${Device.osVersion}_${uniqueId}`;
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone and password');
      return;
    }

    setLoading(true);
    const fingerprint = generateDeviceFingerprint();

    try {
      const response = await api.post('/auth/login', {
        phone,
        password,
        device_fingerprint: fingerprint
      });

      const { jwt, session_token, user } = response.data;

      // Store sensitive auth components locally
      await storeData('jwt_token', jwt);
      await storeData('session_id', session_token);
      await storeData('device_fingerprint', fingerprint);
      await storeData('user_data', user);

      // Navigate to Home upon success
      navigation.replace('Home');

    } catch (error) {
      const message = error.response?.data?.error || 'Failed to login. Please try again.';
      Alert.alert('Authentication Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LPG Agent Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
});
