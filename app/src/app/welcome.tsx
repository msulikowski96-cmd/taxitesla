import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, styles as ui } from '../components/ui';
import { BRAND } from '../config';
import { colors, radius, space } from '../theme';

const PERKS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'flash-outline', title: '100% elektryczna flota', text: 'Ciche, czyste i nowoczesne Tesle' },
  { icon: 'pricetag-outline', title: 'Cena przed jazdą', text: 'Widzisz koszt, zanim zamówisz' },
  { icon: 'shield-checkmark-outline', title: 'Licencjonowani kierowcy', text: 'Doświadczeni, mówią po angielsku' },
  { icon: 'airplane-outline', title: 'Transfery lotniskowe', text: 'Ławica, Berlin, Warszawa – z powitaniem' },
  { icon: 'document-text-outline', title: 'Faktura VAT', text: 'Przejazdy służbowe na firmę' },
];

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <LinearGradient
            colors={['#2A2A30', '#0A0A0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius.xl, padding: space.xl, marginBottom: space.xl, overflow: 'hidden' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xxl }}>
              <View style={{ width: 8, height: 8, backgroundColor: colors.accent, marginRight: 8 }} />
              <Text style={{ color: colors.text, fontWeight: '700', letterSpacing: 3, fontSize: 13 }}>
                {BRAND.name.toUpperCase()}
              </Text>
            </View>
            <Ionicons name="car-sport" size={72} color={colors.silver} style={{ marginBottom: space.lg }} />
            <Text style={[ui.h1, { fontSize: 36, lineHeight: 40 }]}>Podróżuj{'\n'}w ciszy i komforcie.</Text>
            <Text style={[ui.muted, { fontSize: 15, marginTop: space.md }]}>
              {BRAND.tagline}. Zamów Teslę z kierowcą w kilka sekund.
            </Text>
          </LinearGradient>

          {PERKS.map((p) => (
            <View key={p.title} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.lg }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: space.md,
                }}
              >
                <Ionicons name={p.icon} size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ui.body, { fontWeight: '600' }]}>{p.title}</Text>
                <Text style={ui.muted}>{p.text}</Text>
              </View>
            </View>
          ))}

          <Button title="Załóż konto" onPress={() => router.push('/register')} style={{ marginTop: space.md }} />
          <Button
            title="Mam już konto"
            variant="ghost"
            onPress={() => router.push('/login')}
            style={{ marginTop: space.md }}
          />
          <Button
            title={`Zadzwoń: ${BRAND.dispatchPhone}`}
            icon="call-outline"
            variant="secondary"
            onPress={() => Linking.openURL(`tel:${BRAND.dispatchPhone.replace(/\s/g, '')}`)}
            style={{ marginTop: space.md }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
