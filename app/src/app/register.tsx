import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Checkbox, Field, Notice, styles as ui } from '../components/ui';
import { BRAND, DEMO_MODE } from '../config';
import { useAuth } from '../context/auth';
import { isEmail, normalizePhone, passwordProblem } from '../lib/validation';
import { colors, space } from '../theme';

type Errors = Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'password2' | 'terms', string>>;

export default function Register() {
  const { register } = useAuth();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', password2: '' });
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const validate = (): Errors => {
    const e: Errors = {};
    if (!f.firstName.trim()) e.firstName = 'Podaj imię';
    if (!f.lastName.trim()) e.lastName = 'Podaj nazwisko';
    if (!isEmail(f.email)) e.email = 'Niepoprawny adres e-mail';
    if (!normalizePhone(f.phone)) e.phone = 'Podaj numer, np. 600 123 456';
    const pw = passwordProblem(f.password);
    if (pw) e.password = pw;
    if (f.password !== f.password2) e.password2 = 'Hasła nie są takie same';
    if (!terms) e.terms = 'Wymagana akceptacja regulaminu';
    return e;
  };

  const submit = async () => {
    setServerError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await register({
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.email,
        phone: f.phone,
        password: f.password,
        marketingConsent: marketing,
      });
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} footer={<Button title="Załóż konto" onPress={submit} loading={busy} />}>
      <Text style={ui.h1}>Załóż konto</Text>
      <Text style={[ui.muted, { marginTop: space.sm, marginBottom: space.xl, fontSize: 15 }]}>
        Numer telefonu przekażemy kierowcy, żeby mógł się z Tobą skontaktować.
      </Text>
      {DEMO_MODE && <Notice tone="info" text="Tryb demo: konto jest zapisywane tylko na tym urządzeniu." />}
      {serverError && <Notice text={serverError} />}

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field label="IMIĘ" value={f.firstName} onChangeText={set('firstName')} error={errors.firstName} autoComplete="given-name" autoCapitalize="words" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="NAZWISKO" value={f.lastName} onChangeText={set('lastName')} error={errors.lastName} autoComplete="family-name" autoCapitalize="words" />
        </View>
      </View>
      <Field
        label="TELEFON"
        icon="call-outline"
        value={f.phone}
        onChangeText={set('phone')}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="+48 600 123 456"
      />
      <Field
        label="E-MAIL"
        icon="mail-outline"
        value={f.email}
        onChangeText={set('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="jan@example.com"
      />
      <Field
        label="HASŁO"
        icon="lock-closed-outline"
        value={f.password}
        onChangeText={set('password')}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Min. 8 znaków, litery i cyfry"
      />
      <Field
        label="POWTÓRZ HASŁO"
        icon="lock-closed-outline"
        value={f.password2}
        onChangeText={set('password2')}
        error={errors.password2}
        secureTextEntry
        autoComplete="new-password"
      />

      <View style={{ marginTop: space.sm }}>
        <Checkbox checked={terms} onToggle={() => setTerms((t) => !t)}>
          Akceptuję regulamin i politykę prywatności {BRAND.name}. *
        </Checkbox>
        {errors.terms && <Text style={[ui.muted, { color: colors.danger, marginTop: -8, marginBottom: space.md }]}>{errors.terms}</Text>}
        <Checkbox checked={marketing} onToggle={() => setMarketing((m) => !m)}>
          Chcę otrzymywać informacje o promocjach (SMS / e-mail). Opcjonalne.
        </Checkbox>
      </View>

      <Text style={[ui.muted, { marginTop: space.md, textAlign: 'center' }]}>
        Masz już konto?{' '}
        <Link href="/login" replace style={{ color: colors.text, fontWeight: '600' }}>
          Zaloguj się
        </Link>
      </Text>
    </Screen>
  );
}
