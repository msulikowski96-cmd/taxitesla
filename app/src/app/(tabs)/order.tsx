import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PaymentMethod } from '../../api';
import { AddressInput } from '../../components/AddressInput';
import { Screen } from '../../components/Screen';
import { Button, Card, Chip, Field, Row, SectionTitle, styles as ui } from '../../components/ui';
import { WhenPicker } from '../../components/WhenPicker';
import { useAuth } from '../../context/auth';
import { useOrder } from '../../context/order';
import { formatPrice } from '../../lib/format';
import { EXTRAS, getCarClass, quote } from '../../lib/pricing';
import { colors, space } from '../../theme';

const PAYMENTS: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: 'card', label: 'Karta / BLIK w aucie', icon: 'card-outline' },
  { id: 'cash', label: 'Gotówka', icon: 'cash-outline' },
  { id: 'invoice', label: 'Faktura dla firmy', icon: 'document-text-outline' },
];

const isAirport = (s: string) => /lotnisk|airport|flughafen|ławica/i.test(s);

function greeting() {
  const h = new Date().getHours();
  return h < 5 || h >= 18 ? 'Dobry wieczór' : 'Dzień dobry';
}

export default function Order() {
  const { user } = useAuth();
  const { draft, setDraft } = useOrder();
  const [errors, setErrors] = useState<{ pickup?: string; destination?: string; invoice?: string }>({});
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

  const showFlight =
    isAirport(draft.pickup.address) || isAirport(draft.destination.address) || draft.extras.includes('meet_greet');

  const next = () => {
    const e: typeof errors = {};
    if (!draft.pickup.address.trim()) e.pickup = 'Podaj adres odbioru';
    if (!draft.destination.address.trim()) e.destination = 'Podaj adres docelowy';
    if (draft.payment === 'invoice' && !user?.nip)
      e.invoice = 'Uzupełnij dane firmy (NIP) w profilu, aby otrzymać fakturę.';
    setErrors(e);
    if (Object.keys(e).length === 0) router.push('/confirm');
  };

  const swap = () => setDraft((d) => ({ ...d, pickup: d.destination, destination: d.pickup }));

  return (
    <Screen
      footer={
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={ui.muted}>{q.total != null ? `${car.model} · ${q.distanceKm} km` : car.model}</Text>
            <Text style={[ui.h3, { fontSize: q.total != null ? 22 : 15 }]}>{formatPrice(q.total)}</Text>
          </View>
          <Button title="Dalej" onPress={next} icon="arrow-forward" style={{ minWidth: 140 }} />
        </Row>
      }
    >
      <Text style={ui.muted}>{greeting()}, {user?.firstName}</Text>
      <Text style={[ui.h1, { marginBottom: space.lg }]}>Dokąd jedziemy?</Text>

      <Card>
        <AddressInput
          label="SKĄD"
          placeholder="Adres odbioru"
          withMyLocation
          value={draft.pickup}
          onChange={(pickup) => setDraft((d) => ({ ...d, pickup }))}
          error={errors.pickup}
        />
        <Pressable
          onPress={swap}
          accessibilityLabel="Zamień adresy"
          style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}
          hitSlop={8}
        >
          <Ionicons name="swap-vertical" size={16} color={colors.textMuted} />
          <Text style={[ui.muted, { marginLeft: 4 }]}>Zamień</Text>
        </Pressable>
        <AddressInput
          label="DOKĄD"
          placeholder="Adres docelowy"
          value={draft.destination}
          onChange={(destination) => setDraft((d) => ({ ...d, destination }))}
          error={errors.destination}
        />
      </Card>

      <SectionTitle>Kiedy</SectionTitle>
      <WhenPicker value={draft.scheduledAt} onChange={(scheduledAt) => setDraft((d) => ({ ...d, scheduledAt }))} />

      <SectionTitle>Twoje auto</SectionTitle>
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="car-sport" size={34} color={colors.white} style={{ marginRight: space.md }} />
        <View style={{ flex: 1 }}>
          <Text style={[ui.body, { fontWeight: '700' }]}>{car.model}</Text>
          <Text style={ui.muted}>{car.description}</Text>
          <Row style={{ marginTop: 4 }}>
            <Ionicons name="person-outline" size={13} color={colors.textMuted} />
            <Text style={[ui.muted, { marginLeft: 3, marginRight: space.md }]}>{car.seats}</Text>
            <Ionicons name="briefcase-outline" size={13} color={colors.textMuted} />
            <Text style={[ui.muted, { marginLeft: 3 }]}>{car.bags}</Text>
          </Row>
        </View>
        <Text style={[ui.body, { fontWeight: '700' }]}>{q.fare != null ? `${q.fare} zł` : `od ${car.minFare} zł`}</Text>
      </Card>

      <SectionTitle>Pasażerowie</SectionTitle>
      <Row>
        {Array.from({ length: car.seats }, (_, i) => i + 1).map((n) => (
          <Chip
            key={n}
            label={String(n)}
            selected={draft.passengers === n}
            onPress={() => setDraft((d) => ({ ...d, passengers: n }))}
          />
        ))}
      </Row>

      <SectionTitle>Dodatki</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {EXTRAS.map((x) => {
          const on = draft.extras.includes(x.id);
          return (
            <Chip
              key={x.id}
              icon={x.icon as any}
              label={`${x.label} +${x.price} zł`}
              selected={on}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  extras: on ? d.extras.filter((e) => e !== x.id) : [...d.extras, x.id],
                }))
              }
            />
          );
        })}
      </View>

      {showFlight && (
        <View style={{ marginTop: space.sm }}>
          <Field
            label="NUMER LOTU (OPCJONALNIE)"
            icon="airplane-outline"
            placeholder="np. LO 3922"
            autoCapitalize="characters"
            value={draft.flightNumber}
            onChangeText={(flightNumber) => setDraft((d) => ({ ...d, flightNumber }))}
          />
          <Text style={[ui.muted, { marginTop: -6 }]}>Kierowca śledzi lot i poczeka nawet przy opóźnieniu.</Text>
        </View>
      )}

      <SectionTitle>Płatność</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {PAYMENTS.map((p) => (
          <Chip
            key={p.id}
            icon={p.icon}
            label={p.label}
            selected={draft.payment === p.id}
            onPress={() => setDraft((d) => ({ ...d, payment: p.id }))}
          />
        ))}
      </View>
      {errors.invoice && (
        <Pressable onPress={() => router.push('/profile')}>
          <Text style={[ui.muted, { color: colors.danger }]}>{errors.invoice} Przejdź do profilu →</Text>
        </Pressable>
      )}

      <SectionTitle>Uwagi dla kierowcy</SectionTitle>
      <Field
        label="WIADOMOŚĆ"
        placeholder="np. numer klatki, ilość bagażu, preferowana temperatura"
        multiline
        value={draft.notes}
        onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
      />

      {q.night && (
        <Text style={ui.muted}>
          <Ionicons name="moon-outline" size={12} /> Taryfa nocna (22:00–6:00): +20%.
        </Text>
      )}
    </Screen>
  );
}
