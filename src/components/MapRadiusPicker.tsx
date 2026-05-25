import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Circle, Marker, MapPressEvent, Region } from 'react-native-maps';
import { colors, typography, spacing, radii } from '../theme';

const MILES_TO_METERS = 1609.34;
const RADIUS_OPTIONS = [0.5, 1, 1.5, 2, 3, 5];

interface Props {
  radiusMiles: number;
  pinLat: number;
  pinLon: number;
  onRadiusChange: (r: number) => void;
  onPinChange: (lat: number, lon: number) => void;
}

export default function MapRadiusPicker({ radiusMiles, pinLat, pinLon, onRadiusChange, onPinChange }: Props) {
  const [region, setRegion] = useState<Region>({
    latitude: pinLat,
    longitude: pinLon,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  });

  const handleMapPress = useCallback((e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPinChange(latitude, longitude);
  }, [onPinChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Tap the map to move your center pin</Text>
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsCompass={false}
          toolbarEnabled={false}
        >
          <Marker
            coordinate={{ latitude: pinLat, longitude: pinLon }}
            pinColor={colors.primary}
            draggable
            onDragEnd={e => onPinChange(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
          />
          <Circle
            center={{ latitude: pinLat, longitude: pinLon }}
            radius={radiusMiles * MILES_TO_METERS}
            fillColor={colors.primary + '18'}
            strokeColor={colors.primary + '80'}
            strokeWidth={1.5}
          />
        </MapView>
      </View>

      <Text style={styles.radiusLabel}>
        Radius: <Text style={styles.radiusValue}>{radiusMiles < 1 ? `${Math.round(radiusMiles * 5280)} ft` : `${radiusMiles} mi`}</Text>
      </Text>
      <View style={styles.radiusRow}>
        {RADIUS_OPTIONS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, radiusMiles === r && styles.chipSelected]}
            onPress={() => onRadiusChange(r)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, radiusMiles === r && styles.chipTextSelected]}>
              {r < 1 ? `${r * 5280} ft` : `${r} mi`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapWrapper: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    height: 280,
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  radiusLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  radiusValue: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: 64,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  chipTextSelected: { color: colors.textInverse },
});
