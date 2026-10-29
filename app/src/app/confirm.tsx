import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api';
import { RouteView } from '../components/RouteView';
import { Screen } from '../components/Screen';
import { Button, Card, Notice, Row, SectionTitle, styles as ui } from '../components/ui';
import { useAuth } from '../context/auth';
import { useOrder } from '../context/order';
import { formatDay, formatPhone, formatPrice, formatTime } from '../lib/format';
import { EXTRAS, getCarClass, quote } from '../lib/pricing';
import { colors, space } from '../theme';

const PAYMENT_LABEL = { card: 'Karta / BLIK w aucie', cash: 'Gotówka', invoice: 'Faktura VAT' };

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={[ui.muted, { fontSize: 14 }]}>{label}</Text>
      <Text style={[ui.body, strong && { fontWeight: '700', fontSize: 18 }, { flexShrink: 1, textAlign: 'right', marginLeft: space.md }]}>
        {value}
      </Text>
    </Row>
  );
}

export default function Confirm() {
  const { user, token } = useAuth();
  const { draft, reset } = useOrder();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const car = getCarClass(draft.carClass);
  const q = useMemo(
    () =>
      quote({
        pickup: draft.pickup,
        destination: draft.destination,
        carClass: draft.carClass,
        extras: draft.extras,
        when: draft.scheduledAt ?? new Date(),
      }),
    [draft],
  );

  const submit = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const ride = await api.createRide(token, {
        pickup: draft.pickup,
        destination: draft.destination,
        scheduledAt: draft.scheduledAt?.toISOString() ?? null,
        carClass: draft.carClass,
        passengers: draft.passengers,
        extras: draft.extras,
        payment: draft.payment,
        flightNumber: draft.flightNumber.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        distanceKm: q.distanceKm,
        priceEstimate: q.total,
      });
      reset();
      router.dismissAll();
      router.push(`/ride/${ride.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      edges={[]}
      footer={<Button title="Zamawiam przejazd" icon="checkmark" onPress={submit} loading={busy} />}
    >
      {error && <Notice text={error} />}
      <Card>
        <RouteView pickup={draft.pickup} destination={draft.destination} />
      </Card>

      <SectionTitle>Szczegóły</SectionTitle>
      <Card>
        <Line
          label="Termin"
          value={draft.scheduledAt ? `${formatDay(draft.scheduledAt)}, ${formatTime(draft.scheduledAt)}` : 'Jak najszybciej'}
        />
        <Line label="Samochód" value={`${car.model} (${car.name})`} />
        <Line label="Pasażerowie" value={String(draft.passengers)} />
        {draft.extras.length > 0 && (
          <Line label="Dodatki" value={draft.extras.map((id) => EXTRAS.find((e) => e.id === id)?.label).join(', ')} />
        )}
        {!!draft.flightNumber && <Line label="Lot" value={draft.flightNumber.toUpperCase()} />}
        <Line label="Płatność" value={PAYMENT_LABEL[draft.payment]} />
        {!!draft.notes && <Line label="Uwagi" value={draft.notes} />}
      </Card>

      <SectionTitle>Kontakt dla kierowcy</SectionTitle>
      <Card>
        <Line label="Pasażer" value={`${user?.firstName} ${user?.lastName}`} />
        <Line label="Telefon" value={user ? formatPhone(user.phone) : ''} />
      </Card>

      <SectionTitle>Cena</SectionTitle>
      <Card>
        {q.distanceKm != null && <Line label="Dystans (szac.)" value={`${q.distanceKm} km · ~${q.durationMin} min`} />}
        {q.fare != null && <Line label={`Przejazd${q.night ? ' (taryfa nocna)' : ''}`} value={formatPrice(q.fare)} />}
        {q.extras > 0 && <Line label="Dodatki" value={formatPrice(q.extras)} />}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.sm }} />
        <Line label="Razem" value={formatPrice(q.total)} strong />
        <Text style={[ui.muted, { marginTop: space.sm }]}>
          {q.total != null
            ? 'Cena szacunkowa. Ostateczna kwota może się różnić przy zmianie trasy lub dłuższym oczekiwaniu.'
            : 'Nie rozpoznaliśmy dokładnie adresu – dyspozytor potwierdzi cenę telefonicznie lub SMS-em.'}
        </Text>
      </Card>
    </Screen>
  );
}
