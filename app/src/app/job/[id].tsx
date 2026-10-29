import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { api, Place, Ride } from '../../api';
import { JobCard } from '../../components/JobCard';
import { Screen } from '../../components/Screen';
import { Button, Card, ConfirmButton, Notice, Row, SectionTitle, styles as ui } from '../../components/ui';
import { useAuth } from '../../context/auth';
import { DRIVER_NEXT } from '../../lib/driver';
import { formatPhone } from '../../lib/format';
import { colors, space } from '../../theme';

const target = (p: Place) => (p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.address);

function googleMaps(p: Place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target(p))}`;
}

function waze(p: Place) {
  return p.lat != null && p.lng != null
    ? `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(p.address)}&navigate=yes`;
}

export default function Job() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // There is no single-job endpoint; the driver's list already holds every job they can open.
  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const jobs = await api.driverJobs(token);
      const found = [...jobs.mine, ...jobs.available].find((r) => r.id === id);
      if (found) setRide(found);
      else setError('To zlecenie nie jest już dostępne.');
    } catch (e: any) {
      setError(e.message);
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }, [load]),
  );

  const run = async (fn: () => Promise<Ride>) => {
    setBusy(true);
    setError(null);
    try {
      setRide(await fn());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ride) {
    return (
      <Screen edges={[]}>
        {error ? <Notice text={error} /> : <ActivityIndicator color={colors.text} style={{ marginTop: space.xxl }} />}
      </Screen>
    );
  }

  const next = DRIVER_NEXT[ride.status];
  const goingToDestination = ride.status === 'in_progress';
  const navTo = goingToDestination ? ride.destination : ride.pickup;
  const phone = ride.customer?.phone;
  const active = ['confirmed', 'driver_on_way', 'in_progress'].includes(ride.status);

  return (
    <Screen
      edges={[]}
      footer={
        next ? (
          <Button title={next.label} loading={busy} onPress={() => run(() => api.advanceJob(token!, ride.id, next.status))} />
        ) : ride.status === 'pending' ? (
          <Button title="Przyjmij zlecenie" loading={busy} onPress={() => run(() => api.acceptJob(token!, ride.id))} />
        ) : undefined
      }
    >
      {error && <Notice text={error} />}
      {ride.status === 'cancelled' && <Notice text="Klient anulował ten przejazd." />}
      {ride.status === 'completed' && <Notice tone="success" text="Kurs zakończony." />}

      <JobCard ride={ride} />

      {active && (
        <>
          <SectionTitle>{goingToDestination ? 'Nawigacja do celu' : 'Nawigacja do klienta'}</SectionTitle>
          <Text style={[ui.body, { marginBottom: space.md }]} selectable>
            {navTo.address}
          </Text>
          <Row style={{ gap: space.md }}>
            <Button title="Google Maps" icon="navigate-outline" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(googleMaps(navTo))} />
            <Button title="Waze" icon="navigate-circle-outline" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(waze(navTo))} />
          </Row>
        </>
      )}

      {phone && active && (
        <>
          <SectionTitle>Klient</SectionTitle>
          <Card>
            <Text style={[ui.body, { fontWeight: '700' }]}>{ride.customer?.name}</Text>
            <Text style={ui.muted} selectable>
              {formatPhone(phone)}
            </Text>
            <Row style={{ gap: space.md, marginTop: space.md }}>
              <Button title="Zadzwoń" icon="call-outline" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${phone}`)} />
              <Button
                title="SMS"
                icon="chatbubble-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => Linking.openURL(`sms:${phone}`)}
              />
            </Row>
          </Card>
        </>
      )}

      {ride.status === 'confirmed' && (
        <View style={{ marginTop: space.xl }}>
          <ConfirmButton
            title="Oddaj zlecenie"
            confirmTitle="Oddać zlecenie? Dotknij ponownie"
            variant="danger"
            onConfirm={() =>
              run(async () => {
                const r = await api.releaseJob(token!, ride.id);
                router.back();
                return r;
              })
            }
          />
          <Text style={[ui.muted, { marginTop: space.sm, textAlign: 'center' }]}>
            Zlecenie wróci na listę nowych zleceń.
          </Text>
        </View>
      )}
    </Screen>
  );
}
