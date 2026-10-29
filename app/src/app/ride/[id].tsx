import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Text, View } from 'react-native';
import { api, Ride, RideStatus } from '../../api';
import { RouteView } from '../../components/RouteView';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Button, Card, Notice, Row, SectionTitle, styles as ui } from '../../components/ui';
import { BRAND } from '../../config';
import { useAuth } from '../../context/auth';
import { ACTIVE_STATUSES, formatDateTime, formatPhone, formatPrice, STATUS_LABEL } from '../../lib/format';
import { EXTRAS, getCarClass } from '../../lib/pricing';
import { colors, space } from '../../theme';

const STEPS: RideStatus[] = ['pending', 'confirmed', 'driver_on_way', 'in_progress', 'completed'];

function Timeline({ status }: { status: RideStatus }) {
  const idx = STEPS.indexOf(status);
  return (
    <View>
      {STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <Row key={s} style={{ marginBottom: i < STEPS.length - 1 ? space.md : 0 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                marginRight: space.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? colors.white : 'transparent',
                borderWidth: done ? 0 : 1.5,
                borderColor: colors.border,
              }}
            >
              {done && <Ionicons name="checkmark" size={13} color={colors.black} />}
            </View>
            <Text style={[ui.body, !done && { color: colors.textDim }, i === idx && { fontWeight: '700' }]}>
              {STATUS_LABEL[s]}
            </Text>
          </Row>
        );
      })}
    </View>
  );
}

function confirmCancel(onYes: () => void) {
  const msg = 'Czy na pewno chcesz anulować ten przejazd?';
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(msg)) onYes();
    return;
  }
  Alert.alert('Anulować przejazd?', msg, [
    { text: 'Nie', style: 'cancel' },
    { text: 'Anuluj przejazd', style: 'destructive', onPress: onYes },
  ]);
}

export default function RideDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setRide(await api.getRide(token, id));
    } catch (e: any) {
      setError(e.message);
    }
  }, [token, id]);

  // Poll while the screen is visible so status / driver updates show up.
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }, [load]),
  );

  if (!ride) {
    return (
      <Screen edges={[]}>
        {error ? <Notice text={error} /> : <ActivityIndicator color={colors.text} style={{ marginTop: space.xxl }} />}
      </Screen>
    );
  }

  const car = getCarClass(ride.carClass);
  const active = ACTIVE_STATUSES.includes(ride.status);
  const canCancel = ride.status === 'pending' || ride.status === 'confirmed';
  const dispatch = BRAND.dispatchPhone.replace(/\s/g, '');

  const cancel = async () => {
    if (!token) return;
    setBusy(true);
    try {
      setRide(await api.cancelRide(token, ride.id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      {ride.status === 'pending' && (
        <Notice
          tone="success"
          text="Zamówienie przyjęte! Dyspozytor przydzieli kierowcę i potwierdzi przejazd – status zmieni się automatycznie."
        />
      )}
      {error && <Notice text={error} />}

      <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
        <StatusBadge status={ride.status} />
        <Text style={ui.muted}>{ride.scheduledAt ? formatDateTime(ride.scheduledAt) : 'Jak najszybciej'}</Text>
      </Row>

      <Card>
        <RouteView pickup={ride.pickup} destination={ride.destination} />
      </Card>

      {ride.driver && active && (
        <>
          <SectionTitle>Twój kierowca</SectionTitle>
          <Card>
            <Row>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: space.md,
                }}
              >
                <Ionicons name="person" size={22} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ui.body, { fontWeight: '700' }]}>
                  {ride.driver.name} <Text style={{ color: colors.warning }}>★ {ride.driver.rating.toFixed(2)}</Text>
                </Text>
                <Text style={ui.muted}>
                  {ride.driver.car} · {ride.driver.plate}
                </Text>
              </View>
            </Row>
            <Button
              title={`Zadzwoń ${formatPhone(ride.driver.phone)}`}
              icon="call-outline"
              variant="secondary"
              onPress={() => Linking.openURL(`tel:${ride.driver!.phone}`)}
              style={{ marginTop: space.md }}
            />
          </Card>
        </>
      )}

      {ride.status !== 'cancelled' && (
        <>
          <SectionTitle>Status</SectionTitle>
          <Card>
            <Timeline status={ride.status} />
          </Card>
        </>
      )}

      <SectionTitle>Szczegóły</SectionTitle>
      <Card>
        <Text style={ui.body}>
          {car.model} · {car.name}
        </Text>
        <Text style={ui.muted}>
          Pasażerowie: {ride.passengers}
          {ride.extras.length > 0 && ` · ${ride.extras.map((e) => EXTRAS.find((x) => x.id === e)?.label).join(', ')}`}
        </Text>
        {ride.flightNumber && <Text style={ui.muted}>Lot: {ride.flightNumber.toUpperCase()}</Text>}
        {ride.notes && <Text style={ui.muted}>Uwagi: {ride.notes}</Text>}
        <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
          <Text style={ui.muted}>Cena</Text>
          <Text style={[ui.h3]}>{formatPrice(ride.priceEstimate)}</Text>
        </Row>
      </Card>

      {active && (
        <Button
          title="Zadzwoń do dyspozytora"
          icon="headset-outline"
          variant="ghost"
          onPress={() => Linking.openURL(`tel:${dispatch}`)}
          style={{ marginTop: space.xl }}
        />
      )}
      {canCancel && (
        <Button
          title="Anuluj przejazd"
          variant="danger"
          loading={busy}
          onPress={() => confirmCancel(cancel)}
          style={{ marginTop: space.md }}
        />
      )}
    </Screen>
  );
}
