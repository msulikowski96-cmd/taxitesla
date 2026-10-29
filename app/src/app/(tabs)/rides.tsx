import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Ride } from '../../api';
import { RouteView } from '../../components/RouteView';
import { StatusBadge } from '../../components/StatusBadge';
import { Button, Card, Notice, Row, SectionTitle, styles as ui } from '../../components/ui';
import { useAuth } from '../../context/auth';
import { ACTIVE_STATUSES, formatDateTime, formatPrice } from '../../lib/format';
import { getCarClass } from '../../lib/pricing';
import { colors, space } from '../../theme';

function RideCard({ ride }: { ride: Ride }) {
  return (
    <Pressable onPress={() => router.push(`/ride/${ride.id}`)} accessibilityRole="button">
      <Card style={{ marginBottom: space.md }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
          <StatusBadge status={ride.status} />
          <Text style={ui.muted}>{ride.scheduledAt ? formatDateTime(ride.scheduledAt) : formatDateTime(ride.createdAt)}</Text>
        </Row>
        <RouteView pickup={ride.pickup} destination={ride.destination} />
        <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
          <Text style={ui.muted}>{getCarClass(ride.carClass).model}</Text>
          <Text style={[ui.body, { fontWeight: '700' }]}>{formatPrice(ride.priceEstimate)}</Text>
        </Row>
      </Card>
    </Pressable>
  );
}

export default function Rides() {
  const { token } = useAuth();
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setRides(await api.listRides(token));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [token]);

  // Refresh when the tab is opened and every 10 s while visible, to pick up status changes.
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 10_000);
      return () => clearInterval(t);
    }, [load]),
  );

  const active = rides?.filter((r) => ACTIVE_STATUSES.includes(r.status)) ?? [];
  const past = rides?.filter((r) => !ACTIVE_STATUSES.includes(r.status)) ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        refreshControl={
          <RefreshControl
            tintColor={colors.text}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <Text style={[ui.h1, { marginBottom: space.md }]}>Przejazdy</Text>
          {error && <Notice text={error} />}
          {rides == null && !error && <ActivityIndicator color={colors.text} style={{ marginTop: space.xxl }} />}
          {rides?.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: space.xxl * 1.5 }}>
              <Ionicons name="car-sport-outline" size={56} color={colors.textDim} />
              <Text style={[ui.h3, { marginTop: space.md }]}>Brak przejazdów</Text>
              <Text style={[ui.muted, { textAlign: 'center', marginVertical: space.md }]}>
                Twoje zamówienia pojawią się tutaj.
              </Text>
              <Button title="Zamów pierwszy przejazd" onPress={() => router.push('/order')} />
            </View>
          )}
          {active.length > 0 && <SectionTitle>Aktywne</SectionTitle>}
          {active.map((r) => (
            <RideCard key={r.id} ride={r} />
          ))}
          {past.length > 0 && <SectionTitle>Historia</SectionTitle>}
          {past.map((r) => (
            <RideCard key={r.id} ride={r} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
