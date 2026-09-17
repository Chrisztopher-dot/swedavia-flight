export interface FlightItem {
  time: string;
  flight: string;
  city: string;
  airline: string;
  terminal: string;
  resource: string;
  status: string;
}

export type FlightMode = 'departures' | 'arrivals';

export interface AirportOption {
  iata: string;
  name: string;
  city: string;
  isHub: boolean;
}

