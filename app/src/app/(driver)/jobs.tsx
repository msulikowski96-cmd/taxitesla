import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, DriverJobs } from '../../api';
import { JobCard } from '../../components/JobCard';
import { Button, Notice, SectionTitle, styles as ui } from '../../components/ui';
import { useAuth } from '../../context/auth';
import { ACTIVE_STATUSES } from '../../lib/format';
import { colors, space } from '../../theme';

const POLL_MS = 5000;

export default function Jobs() {
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState<DriverJobs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.driverJobs(token);
      // Buzz when an order appears that wasn't on the list before.
      const ids = new Set(next.available.map((r) => r.id));
      if (seen.current && [...ids].some((id) => !seen.current!.has(id)) && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      seen.current = ids;
      setJobs(next);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, POLL_MS);
      return () => clearInterval(t);
    }, [load]),
  );

  const accept = async (id: string) => {
    if (!token) return;
    setAccepting(id);
    try {
      await api.acceptJob(token, id);
      router.push(`/job/${id}`);
      load();
    } catch (e: any) {
      setError(e.message);
      load();
    } finally {
      setAccepting(null);
    }
  };

  const active = jobs?.mine.filter((r) => ACTIVE_STATUSES.includes(r.status)) ?? [];
  const done = jobs?.mine.filter((r) => !ACTIVE_STATUSES.includes(r.status)).slice(0, 10) ?? [];

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
          <Text style={ui.muted}>
            {user?.vehicle?.car ?? 'Tesla Model Y'} · {user?.vehicle?.plate}
          </Text>
          <Text style={[ui.h1, { marginBottom: space.sm }]}>Zlecenia</Text>
          {error && <Notice text={error} />}
          {!jobs && !error && <ActivityIndicator color={colors.text} style={{ marginTop: space.xxl }} />}

          {active.length > 0 && <SectionTitle>W realizacji</SectionTitle>}
          {active.map((r) => (
            <JobCard key={r.id} ride={r} onPress={() => router.push(`/job/${r.id}`)} />
          ))}

          {jobs && (
            <SectionTitle
              right={<Text style={ui.muted}>{jobs.available.length ? `${jobs.available.length}` : ''}</Text>}
            >
              Nowe zlecenia
            </SectionTitle>
          )}
          {jobs?.available.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
              <Ionicons name="hourglass-outline" size={40} color={colors.textDim} />
              <Text style={[ui.body, { marginTop: space.md }]}>Brak nowych zleceń</Text>
              <Text style={[ui.muted, { textAlign: 'center' }]}>Lista odświeża się sama co kilka sekund.</Text>
            </View>
          )}
          {jobs?.available.map((r) => (
            <JobCard
              key={r.id}
              ride={r}
              footer={
                <Button
                  title="Przyjmij zlecenie"
                  icon="checkmark-circle-outline"
                  loading={accepting === r.id}
                  onPress={() => accept(r.id)}
                />
              }
            />
          ))}

          {done.length > 0 && <SectionTitle>Ostatnie</SectionTitle>}
          {done.map((r) => (
            <JobCard key={r.id} ride={r} onPress={() => router.push(`/job/${r.id}`)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
