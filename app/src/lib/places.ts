import type { Place } from '../api/types';

// Popular pickup / drop-off points with coordinates, used for instant pricing.
export const POPULAR_PLACES: (Place & { icon: string; short: string })[] = [
  { short: 'Lotnisko Ławica', address: 'Port Lotniczy Poznań-Ławica, ul. Bukowska 285', lat: 52.421, lng: 16.8263, icon: 'airplane-outline' },
  { short: 'Dworzec Główny', address: 'Poznań Główny, ul. Dworcowa 2', lat: 52.4017, lng: 16.9119, icon: 'train-outline' },
  { short: 'Stary Rynek', address: 'Stary Rynek, Poznań', lat: 52.4084, lng: 16.9341, icon: 'business-outline' },
  { short: 'MTP', address: 'Międzynarodowe Targi Poznańskie, ul. Głogowska 14', lat: 52.4037, lng: 16.9085, icon: 'briefcase-outline' },
  { short: 'Enea Stadion', address: 'Enea Stadion, ul. Bułgarska 17', lat: 52.3973, lng: 16.8586, icon: 'football-outline' },
  { short: 'Posnania', address: 'Galeria Posnania, ul. Pleszewska 1', lat: 52.3966, lng: 16.9541, icon: 'bag-handle-outline' },
  { short: 'Malta', address: 'Jezioro Maltańskie, Poznań', lat: 52.404, lng: 16.9765, icon: 'water-outline' },
  { short: 'Swarzędz', address: 'Swarzędz, Rynek', lat: 52.4113, lng: 17.0779, icon: 'home-outline' },
  { short: 'Luboń', address: 'Luboń, centrum', lat: 52.346, lng: 16.878, icon: 'home-outline' },
  { short: 'Lotnisko Berlin BER', address: 'Flughafen Berlin Brandenburg (BER)', lat: 52.3667, lng: 13.5033, icon: 'airplane-outline' },
  { short: 'Lotnisko Chopina', address: 'Lotnisko Chopina, Warszawa', lat: 52.1657, lng: 20.9671, icon: 'airplane-outline' },
];
