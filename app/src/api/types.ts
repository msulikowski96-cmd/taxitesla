export type CarClassId = 'model_y';
export type ExtraId = 'child_seat' | 'meet_greet' | 'pet' | 'extra_luggage';
export type PaymentMethod = 'card' | 'cash' | 'invoice';
export type RideStatus =
  | 'pending'
  | 'confirmed'
  | 'driver_on_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type Place = { address: string; lat?: number; lng?: number };

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // E.164
  companyName?: string;
  nip?: string;
  marketingConsent: boolean;
  createdAt: string;
};

export type Driver = { name: string; phone: string; car: string; plate: string; rating: number };

export type Ride = {
  id: string;
  userId: string;
  pickup: Place;
  destination: Place;
  scheduledAt: string | null; // null = as soon as possible
  carClass: CarClassId;
  passengers: number;
  extras: ExtraId[];
  payment: PaymentMethod;
  flightNumber?: string;
  notes?: string;
  distanceKm: number | null;
  priceEstimate: number | null;
  status: RideStatus;
  driver?: Driver;
  createdAt: string;
};

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  marketingConsent: boolean;
};

export type RideInput = Omit<
  Ride,
  'id' | 'userId' | 'status' | 'driver' | 'createdAt'
>;

export type ProfileUpdate = Partial<
  Pick<User, 'firstName' | 'lastName' | 'email' | 'phone' | 'companyName' | 'nip' | 'marketingConsent'>
>;

export interface Api {
  register(input: RegisterInput): Promise<{ user: User; token: string }>;
  login(login: string, password: string): Promise<{ user: User; token: string }>;
  me(token: string): Promise<User>;
  updateProfile(token: string, update: ProfileUpdate): Promise<User>;
  deleteAccount(token: string): Promise<void>;
  listRides(token: string): Promise<Ride[]>;
  getRide(token: string, id: string): Promise<Ride>;
  createRide(token: string, input: RideInput): Promise<Ride>;
  cancelRide(token: string, id: string): Promise<Ride>;
}

export class ApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
