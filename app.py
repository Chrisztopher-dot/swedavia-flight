from datetime import datetime
import os
import sys
import time
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx
from pydantic import BaseModel, Field
from rich.console import Console
from rich.live import Live
from rich.table import Table

# --- Konfiguration ---
API_KEY = os.getenv("SWEDAVIA_API_KEY", "")
BASE_URL = "https://api.swedavia.se/flightinfo/v2"

console = Console()
tz_stockholm = ZoneInfo("Europe/Stockholm")


# --- Datamodeller ---
class FlightTime(BaseModel):
  scheduledUtc: Optional[str] = None
  estimatedUtc: Optional[str] = None
  actualUtc: Optional[str] = None


class LocationAndStatus(BaseModel):
  flightLegStatus: Optional[str] = None
  flightLegStatusSwedish: Optional[str] = None
  gate: Optional[str] = None
  terminal: Optional[str] = None
  baggageClaimUnit: Optional[str] = None


class Flight(BaseModel):
  flightId: Optional[str] = None
  flightScheduleNumber: Optional[str] = None
  airlineOperator: Optional[Dict[str, Any]] = None
  departureTime: Optional[FlightTime] = None
  arrivalTime: Optional[FlightTime] = None
  locationAndStatus: Optional[LocationAndStatus] = None

  # Swedavias platta flygplatsnamn i v2-svaret
  arrivalAirportSwedish: Optional[str] = None
  arrivalAirportEnglish: Optional[str] = None
  departureAirportSwedish: Optional[str] = None
  departureAirportEnglish: Optional[str] = None

  class Config:
    extra = "allow"


class FlightResponse(BaseModel):
  flights: List[Flight] = Field(default_factory=list)


# --- Hjälpfunktioner ---
def format_time(utc_iso: Optional[str]) -> str:
  if not utc_iso:
    return "--:--"
  try:
    dt = datetime.fromisoformat(utc_iso.replace("Z", "+00:00"))
    return dt.astimezone(tz_stockholm).strftime("%H:%M")
  except Exception:
    return "--:--"


def extract_city(flight: Flight, mode: str) -> str:
  if mode == "departures":
    return flight.arrivalAirportSwedish or flight.arrivalAirportEnglish or "--"
  else:
    return (
        flight.departureAirportSwedish or flight.departureAirportEnglish or "--"
    )


def fetch_flights(airport: str, mode: str) -> Optional[FlightResponse]:
  if not API_KEY:
    console.print(
        "[bold red]Fel:[/bold red] Miljövariabeln SWEDAVIA_API_KEY saknas."
    )
    sys.exit(1)

  today_str = datetime.now(tz_stockholm).strftime("%Y-%m-%d")
  url = f"{BASE_URL}/{airport}/{mode}/{today_str}"
  headers = {
      "Accept": "application/json",
      "Ocp-Apim-Subscription-Key": API_KEY,
  }

  try:
    resp = httpx.get(url, headers=headers, timeout=8.0)
    if resp.status_code == 200:
      return FlightResponse.model_validate(resp.json())
  except Exception:
    pass
  return None


def generate_board(data: FlightResponse, airport: str, mode: str) -> Table:
  now_local = datetime.now(tz_stockholm)
  mode_title = "AVGÅNGAR" if mode == "departures" else "ANKOMSTER & BAGAGE"
  title_text = (
      f"Swedavia FIDS - {airport.upper()} {mode_title} "
      f"({now_local.strftime('%H:%M:%S')})"
  )

  table = Table(
      title=title_text,
      show_header=True,
      header_style="bold cyan",
      expand=True,
  )

  # Kolumnlayout anpassad efter läge
  table.add_column("Tid", style="cyan", no_wrap=True)
  table.add_column("Flight", style="bold yellow")
  table.add_column(
      "Destination" if mode == "departures" else "Ankommer Från", style="white"
  )
  table.add_column("Flygbolag", style="magenta")
  table.add_column("Term", justify="center", style="dim")

  if mode == "departures":
    table.add_column("Gate", justify="center", style="bold green")
    table.add_column("Status / Avgång", style="bold")
  else:
    table.add_column("Bagageband", justify="center", style="bold yellow")
    table.add_column("Status / Landning", style="bold")

  valid_flights: List[Flight] = []
  for f in data.flights:
    if not f.locationAndStatus:
      continue

    status_swe = f.locationAndStatus.flightLegStatusSwedish or ""
    status_code = f.locationAndStatus.flightLegStatus or ""

    if status_swe == "Borttagen" or status_code in ["DEL"]:
      continue

    time_obj = f.departureTime if mode == "departures" else f.arrivalTime
    if time_obj and time_obj.scheduledUtc:
      try:
        dt_utc = datetime.fromisoformat(
            time_obj.scheduledUtc.replace("Z", "+00:00")
        )
        dt_local = dt_utc.astimezone(tz_stockholm)
        # Spara flyg upp till 30 min efter schemalagd tid för ankomster
        threshold = 1800 if mode == "arrivals" else 900
        if (now_local - dt_local).total_seconds() > threshold:
          continue
      except Exception:
        pass

    valid_flights.append(f)

  def get_sort_time(flight: Flight):
    t = flight.departureTime if mode == "departures" else flight.arrivalTime
    return t.scheduledUtc if t and t.scheduledUtc else ""

  valid_flights.sort(key=get_sort_time)

  for f in valid_flights[:25]:
    time_obj = f.departureTime if mode == "departures" else f.arrivalTime
    sched_time = format_time(time_obj.scheduledUtc if time_obj else None)

    flight_no = f.flightScheduleNumber or f.flightId or "--"
    airline = (
        f.airlineOperator.get("name", "--") if f.airlineOperator else "--"
    )
    city = extract_city(f, mode)

    loc = f.locationAndStatus
    terminal = loc.terminal or "-"

    status = loc.flightLegStatusSwedish or loc.flightLegStatus or ""
    status_style = "white"

    if mode == "departures":
      target_col = loc.gate or "-"
      if time_obj and time_obj.estimatedUtc:
        est_time = format_time(time_obj.estimatedUtc)
        status = (
            f"Beräknad {est_time} ({status})"
            if status
            else f"Beräknad {est_time}"
        )
      if "Boarding" in status or "Gå till gate" in status:
        status_style = "green"
      elif "Försenad" in status or "Inställd" in status:
        status_style = "red"
    else:
      # Ankomst & bagageformatering
      claim_unit = loc.baggageClaimUnit
      target_col = f"[bold yellow]Band {claim_unit}[/bold yellow]" if claim_unit else "[dim]Inväntas[/dim]"

      if time_obj and time_obj.actualUtc:
        land_time = format_time(time_obj.actualUtc)
        status = f"Landat {land_time}"
        status_style = "green"
      elif time_obj and time_obj.estimatedUtc:
        est_time = format_time(time_obj.estimatedUtc)
        status = f"Förväntas {est_time}"
        status_style = "cyan"
      elif "Landat" in status:
        status_style = "green"
      elif "Försenad" in status or "Inställd" in status:
        status_style = "red"

    table.add_row(
        sched_time,
        flight_no,
        city,
        airline,
        terminal,
        target_col,
        f"[{status_style}]{status}[/{status_style}]",
    )

  return table


# --- Main Loop ---
def main():
  import argparse

  parser = argparse.ArgumentParser(
      description="Swedavia Terminal Flight & Baggage Board"
  )
  parser.add_argument(
      "--airport",
      "-a",
      default="ARN",
      help="IATA-kod (t.ex. ARN, GOT, BMA, LLA)",
  )
  parser.add_argument(
      "--mode",
      "-m",
      choices=["departures", "arrivals"],
      default="departures",
      help="Visa avgångar eller ankomster & bagage",
  )
  parser.add_argument(
      "--interval",
      "-i",
      type=int,
      default=30,
      help="Uppdateringsintervall i sekunder (default: 30)",
  )

  args = parser.parse_args()
  airport = args.airport.upper()

  initial_data = fetch_flights(airport, args.mode)
  if not initial_data:
    console.print(
        f"[red]Kunde inte hämta flygdata för {airport} ({args.mode}).[/red]"
    )
    sys.exit(1)

  with Live(
      generate_board(initial_data, airport, args.mode),
      console=console,
      refresh_per_second=1,
      screen=True,
  ) as live:
    try:
      while True:
        time.sleep(args.interval)
        updated_data = fetch_flights(airport, args.mode)
        if updated_data:
          live.update(generate_board(updated_data, airport, args.mode))
    except KeyboardInterrupt:
      pass


if __name__ == "__main__":
  main()