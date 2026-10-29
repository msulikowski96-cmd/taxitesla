import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button, Card, Checkbox, ConfirmButton, Field, Notice, SectionTitle, styles as ui } from '../../components/ui';
import { BRAND, DEMO_MODE } from '../../config';
import { useAuth } from '../../context/auth';
import { formatPhone } from '../../lib/format';
import { isEmail, isNip, normalizePhone } from '../../lib/validation';
import { colors, space } from '../../theme';

function ContactRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md }}>
      <Ionicons name={icon} size={20} color={colors.text} style={{ marginRight: space.md }} />
      <Text style={[ui.body, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

export default function Profile() {
  const { user, updateProfile, logout, deleteAccount } = useAuth();
  const [f, setF] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user ? formatPhone(user.phone) : '',
    email: user?.email ?? '',
    companyName: user?.companyName ?? '',
    nip: user?.nip ?? '',
  });
  const [marketing, setMarketing] = useState(!!user?.marketingConsent);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  if (!user) return null;

  const save = async () => {
    setMsg(null);
    if (!f.firstName.trim() || !f.lastName.trim()) return setMsg({ tone: 'error', text: 'Podaj imię i nazwisko' });
    if (!normalizePhone(f.phone)) return setMsg({ tone: 'error', text: 'Niepoprawny numer telefonu' });
    if (!isEmail(f.email)) return setMsg({ tone: 'error', text: 'Niepoprawny adres e-mail' });
    if (f.nip && !isNip(f.nip)) return setMsg({ tone: 'error', text: 'Niepoprawny NIP' });
    setBusy(true);
    try {
      await updateProfile({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone,
        email: f.email,
        companyName: f.companyName.trim() || undefined,
        nip: f.nip.replace(/[\s-]/g, '') || undefined,
        marketingConsent: marketing,
      });
      setMsg({ tone: 'success', text: 'Zapisano zmiany' });
    } catch (e: any) {
      setMsg({ tone: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const phone = BRAND.dispatchPhone.replace(/\s/g, '');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.lg }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: space.md,
          }}
        >
          <Text style={[ui.h3, { fontSize: 20 }]}>
            {user.firstName[0]}
            {user.lastName[0]}
          </Text>
        </View>
        <View>
          <Text style={ui.h2}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={ui.muted}>{formatPhone(user.phone)}</Text>
        </View>
      </View>

      {DEMO_MODE && <Notice tone="info" text="Tryb demo – dane są zapisane tylko na tym urządzeniu." />}

      <SectionTitle>Dane kontaktowe</SectionTitle>
      <Field label="IMIĘ" value={f.firstName} onChangeText={set('firstName')} />
      <Field label="NAZWISKO" value={f.lastName} onChangeText={set('lastName')} />
      <Field label="TELEFON" icon="call-outline" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
      <Field label="E-MAIL" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={set('email')} />

      <SectionTitle>Dane do faktury (opcjonalnie)</SectionTitle>
      <Field label="NAZWA FIRMY" icon="business-outline" value={f.companyName} onChangeText={set('companyName')} />
      <Field label="NIP" keyboardType="number-pad" value={f.nip} onChangeText={set('nip')} placeholder="10 cyfr" />

      <Checkbox checked={marketing} onToggle={() => setMarketing((m) => !m)}>
        Chcę otrzymywać informacje o promocjach.
      </Checkbox>

      {msg && <Notice tone={msg.tone} text={msg.text} />}
      <Button title="Zapisz zmiany" onPress={save} loading={busy} />

      <SectionTitle>Kontakt z nami</SectionTitle>
      <Card style={{ paddingVertical: space.xs }}>
        <ContactRow icon="call-outline" label={`Zadzwoń: ${BRAND.dispatchPhone}`} onPress={() => Linking.openURL(`tel:${phone}`)} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <ContactRow icon="logo-whatsapp" label="Napisz na WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${phone.replace('+', '')}`)} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <ContactRow icon="mail-outline" label={BRAND.dispatchEmail} onPress={() => Linking.openURL(`mailto:${BRAND.dispatchEmail}`)} />
      </Card>

      <Button title="Wyloguj się" variant="ghost" icon="log-out-outline" onPress={logout} style={{ marginTop: space.xl }} />
      <ConfirmButton
        title="Usuń konto"
        confirmTitle="Usunąć konto i historię? Dotknij ponownie"
        variant="danger"
        onConfirm={deleteAccount}
        style={{ marginTop: space.md }}
      />
    </Screen>
  );
}
