import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Button } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

export default function ScanScreen({ route, navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  // Extract the assignments list safely passed directly from HomeScreen memory
  const assignments = route.params?.assignments || [];

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);

    const scannedCylinderId = data.trim(); // The QR payload natively represents the cylinder ID

    // Security Check: Look for active assignment matching the scanned QR code
    const assignmentMatch = assignments.find(
      (item) => item.cylinder_id === scannedCylinderId
    );

    if (!assignmentMatch) {
      Alert.alert(
        'Validation Failed',
        'This cylinder is not assigned to you.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } else {
      // Passed preliminary security, route to confirmation payload
      navigation.replace('Delivery', { cylinder_id: scannedCylinderId });
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera. Please grant permissions in Settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Cylinder QR</Text>
      
      <View style={styles.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      </View>
      
      {scanned && (
        <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cameraBox: {
    height: 400,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#000',
    marginBottom: 20,
  }
});
