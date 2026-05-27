import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Full-screen sunset gradient — matches the WelcomeScreen.
 * Drop inside any screen as the first child alongside absoluteFillObject.
 */
export default function GradientBackground() {
  return (
    <LinearGradient
      colors={['#FF6B35', '#FF9A56', '#FFC08A', '#F8F7F4']}
      locations={[0, 0.35, 0.65, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
  );
}
