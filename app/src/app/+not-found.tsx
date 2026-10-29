import { Redirect } from 'expo-router';

// Unknown links (old URLs, typos) go back to the start screen.
export default function NotFound() {
  return <Redirect href="/" />;
}
