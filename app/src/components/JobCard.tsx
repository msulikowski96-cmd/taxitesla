import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Ride } from '../api';
import { formatDateTime, formatPrice } from '../lib/format';
import { EXTRAS } from '../lib/pricing';
import { colors, space } from '../theme';
import { RouteView } from './RouteView';
import { StatusBadge } from './StatusBadge';
import { Card, Row, styles as ui } from './ui';

const PAYMENT = { card: 'Karta/BLIK', cash: 'Gotówka', invoice: 'Faktura' };

// One order as the driver sees it: when, where, how much, and anything special.
export function JobCard({ ride, onPress, footer }: { ride: Ride; onPress?: () => void; footer?: ReactNode }) {
  const asap = !ride.scheduledAt;
  const extras = ride.extras.map((e) => EXTRAS.find((x) => x.id === e)?.label).filter(Boolean);
  const body = (
    <Card style={{ marginBottom: space.md }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
        {ride.status === 'pending' ? (
          <Row>
            <Ionicons name={asap ? 'flash' : 'calendar-outline'} size={14} color={asap ? colors.warning : colors.text} />
            <Text style={[ui.body, { fontWeight: '700', marginLeft: 6, color: asap ? colors.warning : colors.text }]}>
              {asap ? 'Teraz' : formatDateTime(ride.scheduledAt!)}
            </Text>
          </Row>
        ) : (
          <StatusBadge status={ride.status} />
        )}
        <Text style={[ui.h3, { fontSize: 20 }]}>{formatPrice(ride.priceEstimate)}</Text>
      </Row>
      <RouteView pickup={ride.pickup} destination={ride.destination} />
      <Text style={[ui.muted, { marginTop: space.md }]}>
        {ride.customer?.name ?? 'Klient'} · {ride.passengers} os. · {PAYMENT[ride.payment]}
        {ride.distanceKm != null ? ` · ${ride.distanceKm} km` : ''}
        {ride.status !== 'pending' && ride.scheduledAt ? ` · ${formatDateTime(ride.scheduledAt)}` : ''}
      </Text>
      {extras.length > 0 && <Text style={[ui.muted, { color: colors.warning }]}>{extras.join(' · ')}</Text>}
      {ride.flightNumber && <Text style={ui.muted}>Lot: {ride.flightNumber.toUpperCase()}</Text>}
      {ride.notes && <Text style={ui.muted}>„{ride.notes}”</Text>}
      {footer && <View style={{ marginTop: space.md }}>{footer}</View>}
    </Card>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
}
