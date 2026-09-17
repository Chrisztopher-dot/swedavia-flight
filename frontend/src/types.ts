export interface FlightItem {
  time: string;
  flight: string;
  city: string;
  airline: string;
  terminal: string;
  resource: string;
  status: string;
  is_past?: boolean;
}

export type FlightMode = 'departures' | 'arrivals';

export type TimeFrame = 'upcoming' | 'past' | 'all';

export interface AirportOption {
  iata: string;
  name: string;
  city: string;
  isHub: boolean;
}
