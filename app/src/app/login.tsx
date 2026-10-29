import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Field, Notice, styles as ui } from '../components/ui';
import { DEMO_MODE } from '../config';
import { useAuth } from '../context/auth';
import { colors, space } from '../theme';

export default function Login() {
  const { login } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!id.trim() || !password) return setError('Podaj e-mail lub telefon oraz hasło');
    setBusy(true);
    try {
      await login(id, password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} footer={<Button title="Zaloguj się" onPress={submit} loading={busy} />}>
      <Text style={ui.h1}>Witaj ponownie</Text>
      <Text style={[ui.muted, { marginTop: space.sm, marginBottom: space.xl, fontSize: 15 }]}>
        Zaloguj się, aby zamówić przejazd.
      </Text>
      {DEMO_MODE && (
        <Notice tone="info" text="Tryb demo: konto jest zapisywane tylko na tym urządzeniu." />
      )}
      {error && <Notice text={error} />}
      <Field
        label="E-MAIL LUB TELEFON"
        icon="person-outline"
        value={id}
        onChangeText={setId}
        autoCapitalize="none"
        autoComplete="username"
        keyboardType="email-address"
        placeholder="jan@example.com lub 600 123 456"
      />
      <Field
        label="HASŁO"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!show}
        autoComplete="current-password"
        placeholder="••••••••"
        onSubmitEditing={submit}
        right={
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} accessibilityLabel="Pokaż hasło">
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        }
      />
      <Text style={[ui.muted, { marginTop: space.md, textAlign: 'center' }]}>
        Nie masz konta?{' '}
        <Link href="/register" replace style={{ color: colors.text, fontWeight: '600' }}>
          Zarejestruj się
        </Link>
      </Text>
    </Screen>
  );
}
