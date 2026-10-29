import type { RideStatus } from '../api/types';

// The one next step a driver can take for a ride, with the button label shown for it.
export const DRIVER_NEXT: Partial<Record<RideStatus, { status: RideStatus; label: string }>> = {
  confirmed: { status: 'driver_on_way', label: 'Jadę po klienta' },
  driver_on_way: { status: 'in_progress', label: 'Klient w aucie – start kursu' },
  in_progress: { status: 'completed', label: 'Zakończ kurs' },
};
