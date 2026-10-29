import { Redirect } from 'expo-router';
import { useAuth } from '../context/auth';

export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/order' : '/welcome'} />;
}
