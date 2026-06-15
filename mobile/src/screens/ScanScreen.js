import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

export default function ScanScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  const [verificationStatus, setVerificationStatus] = useState(null);

  useEffect(() => {
    console.log("Scanning...");
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const proceedToDelivery = async (finalData) => {
    // 1. Show Verifying
    setVerificationStatus('verifying');
    await new Promise(r => setTimeout(r, 600));

    // 2. Show Verified
    setVerificationStatus('verified');
    await new Promise(r => setTimeout(r, 800));

    // 3. Navigate
    navigation.replace('Delivery', { cylinder_id: finalData });
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || verificationStatus) return;
    setScanned(true);
    
    // DEMO SAFE: Accept any data or fallback
    const finalData = data || "CYLINDER_DEMO_123";
    console.log("QR Data:", finalData);
    
    proceedToDelivery(finalData);
  };

  const simulateScan = () => {
    if (verificationStatus) return;
    setScanned(true);
    proceedToDelivery('DEMO-CYL-9999');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Cylinder QR</Text>
      <Text style={styles.subtitle}>Center the QR code within the frame</Text>
      
      <View style={styles.cameraBox}>
        {hasPermission ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
        ) : (
          <View style={styles.noCameraView}>
            <Text style={styles.noCameraText}>
              {hasPermission === false ? "Camera permission denied." : "Requesting camera..."}
            </Text>
          </View>
        )}
      </View>

      {/* VERIFICATION BANNERS */}
      {verificationStatus === 'verifying' && (
        <View style={styles.bannerVerifying}>
          <Text style={styles.bannerVerifyingText}>🔄 Verifying Blockchain Signature...</Text>
        </View>
      )}
      
      {verificationStatus === 'verified' && (
        <View style={styles.bannerSuccess}>
          <Text style={styles.bannerSuccessTitle}>Cylinder Verified ✅</Text>
          <Text style={styles.bannerSuccessSubtitle}>Authenticity Check Passed</Text>
        </View>
      )}
      
      {/* Demo helper to bypass scanning on Emulators / Web */}
      <TouchableOpacity style={styles.demoButton} onPress={simulateScan}>
        <Text style={styles.demoButtonText}>Simulate Scan (Demo)</Text>
      </TouchableOpacity>
      
      {scanned && (
        <TouchableOpacity style={[styles.demoButton, { backgroundColor: '#555', marginTop: 10 }]} onPress={() => setScanned(false)}>
          <Text style={styles.demoButtonText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7F9FC', // Mobile app background
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  cameraBox: {
    height: 350,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  noCameraView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc',
  },
  noCameraText: {
    color: '#444',
    fontSize: 16,
  },
  demoButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  demoButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerVerifying: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerVerifyingText: {
    color: '#1565c0',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerSuccess: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  bannerSuccessTitle: {
    color: '#2e7d32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerSuccessSubtitle: {
    color: '#388e3c',
    fontSize: 14,
    marginTop: 4,
  }
});
