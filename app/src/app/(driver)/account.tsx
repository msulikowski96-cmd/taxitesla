import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button, Card, Notice, Row, SectionTitle, styles as ui } from '../../components/ui';
import { DEMO_MODE } from '../../config';
import { useAuth } from '../../context/auth';
import { formatPhone } from '../../lib/format';
import { colors, space } from '../../theme';

export default function DriverAccount() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <Screen>
      <Text style={[ui.h1, { marginBottom: space.lg }]}>Kierowca</Text>
      {DEMO_MODE && <Notice tone="info" text="Tryb demo – to wbudowane konto kierowcy." />}
      <Card>
        <Text style={ui.h3}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={ui.muted}>{formatPhone(user.phone)}</Text>
      </Card>

      <SectionTitle>Auto</SectionTitle>
      <Card>
        <Row>
          <Ionicons name="car-sport" size={30} color={colors.text} style={{ marginRight: space.md }} />
          <View>
            <Text style={[ui.body, { fontWeight: '700' }]}>{user.vehicle?.car ?? 'Tesla Model Y'}</Text>
            <Text style={ui.muted}>{user.vehicle?.plate}</Text>
          </View>
        </Row>
      </Card>
      <Text style={[ui.muted, { marginTop: space.md }]}>
        Klient widzi Twoje imię, auto i numer rejestracyjny po przyjęciu zlecenia. Dane zmienisz w panelu dyspozytora.
      </Text>

      <Button title="Wyloguj się" variant="ghost" icon="log-out-outline" onPress={logout} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
