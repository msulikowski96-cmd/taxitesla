import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { Place } from '../api';
import { POPULAR_PLACES } from '../lib/places';
import { BRAND } from '../config';
import { colors, space } from '../theme';
import { Chip, Field } from './ui';

// Turns a typed address into coordinates using the phone's geocoder (not available on web).
async function geocode(address: string): Promise<Place> {
  if (Platform.OS === 'web' || address.trim().length < 4) return { address };
  try {
    const query = /poznań|poznan/i.test(address) ? address : `${address}, ${BRAND.city}`;
    const [hit] = await Location.geocodeAsync(query);
    return hit ? { address, lat: hit.latitude, lng: hit.longitude } : { address };
  } catch {
    return { address };
  }
}

export function AddressInput({
  label,
  value,
  onChange,
  placeholder,
  withMyLocation,
  error,
}: {
  label: string;
  value: Place;
  onChange: (p: Place) => void;
  placeholder: string;
  withMyLocation?: boolean;
  error?: string | null;
}) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const useMyLocation = async () => {
    setLocError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Brak zgody na lokalizację. Wpisz adres ręcznie.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      let address = `Moja lokalizacja (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      if (Platform.OS !== 'web') {
        const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => []);
        if (r) {
          const street = [r.street, r.streetNumber].filter(Boolean).join(' ');
          address = [street || r.name, r.city].filter(Boolean).join(', ') || address;
        }
      }
      onChange({ address, lat, lng });
    } catch {
      setLocError('Nie udało się ustalić lokalizacji.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View>
      <Field
        label={label}
        icon={withMyLocation ? 'radio-button-on' : 'location'}
        placeholder={placeholder}
        value={value.address}
        onChangeText={(address) => onChange({ address })}
        onBlur={async () => {
          if (value.address && value.lat == null) onChange(await geocode(value.address));
        }}
        error={error ?? locError}
        autoCorrect={false}
        right={
          withMyLocation ? (
            <Pressable
              onPress={useMyLocation}
              accessibilityLabel="Użyj mojej lokalizacji"
              hitSlop={10}
              style={{ paddingLeft: space.sm }}
            >
              {locating ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Ionicons name="locate" size={20} color={colors.text} />
              )}
            </Pressable>
          ) : value.address ? (
            <Pressable onPress={() => onChange({ address: '' })} accessibilityLabel="Wyczyść" hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </Pressable>
          ) : null
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: -4, marginBottom: space.sm }}
        keyboardShouldPersistTaps="handled"
      >
        {POPULAR_PLACES.map((p) => (
          <Chip
            key={p.short}
            label={p.short}
            icon={p.icon as any}
            selected={value.address === p.address}
            onPress={() => onChange({ address: p.address, lat: p.lat, lng: p.lng })}
          />
        ))}
      </ScrollView>
      {value.address !== '' && value.lat != null && (
        <Text style={{ color: colors.success, fontSize: 12, marginTop: -4, marginBottom: space.sm }}>
          ✓ Adres rozpoznany
        </Text>
      )}
    </View>
  );
}
