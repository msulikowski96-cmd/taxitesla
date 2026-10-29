// Business settings. Change these to match your company.
export const BRAND = {
  name: 'TaxiTesla',
  tagline: 'Premium taxi Tesla · Poznań',
  city: 'Poznań',
  dispatchPhone: '+48 600 000 000',
  dispatchEmail: 'kontakt@taxitesla.pl',
  website: 'https://taxitesla.pl',
};

// When EXPO_PUBLIC_API_URL is set, the app talks to the backend in /server.
// Without it, the app runs in demo mode and stores everything on the device.
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';
export const DEMO_MODE = !API_URL;
