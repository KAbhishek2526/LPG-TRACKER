import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { api } from '../services/api';
import { storeData } from '../utils/storage';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const generateDeviceFingerprint = () => {
    const uniqueId = Application.androidId ? Application.androidId : Device.osBuildId;
    return `${Device.modelName}_${Device.osVersion}_${uniqueId}`;
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      if (Platform.OS === 'web') {
        window.alert('Error: Please enter any dummy phone and password');
      } else {
        Alert.alert('Error', 'Please enter any dummy phone and password');
      }
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

      await storeData('jwt_token', jwt);
      await storeData('session_id', session_token);
      await storeData('device_fingerprint', fingerprint);
      await storeData('user_data', user);
      
    } catch (error) {
      console.warn("Login API failed, but DEMO SAFE MODE is bypassing it.");
      
      // Force mock data on failure to guarantee demo continuation
      await storeData('jwt_token', "dummy-demo-token");
      await storeData('session_id', "dummy-session-123");
      await storeData('user_data', { id: 999, role: "AGENT", name: "Demo User" });
    } finally {
      setLoading(false);
      navigation.replace('Home');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.innerContainer}
      >
        <View style={styles.card}>
          <Text style={styles.title}>LPG Tracker</Text>
          <Text style={styles.subtitle}>Agent Portal</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#999"
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0066cc" style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC', // Clean mobile background
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
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
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 10,
  }
});
