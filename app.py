from datetime import datetime
import os
import select
import sys
import termios
import time
import tty
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx
from pydantic import BaseModel, Field
from rich.align import Align
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table

# --- Konfiguration ---
API_KEY = os.getenv("SWEDAVIA_API_KEY", "")
FLIGHT_URL = "https://api.swedavia.se/flightinfo/v2"
AIRPORT_URL = "https://api.swedavia.se/airportinfo/v2"

# Fallback-flygplatser om AirportInfo inte svarar
DEFAULT_AIRPORTS = ["ARN", "GOT", "BMA", "LLA", "MMX"]

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
  checkIn: Optional[Dict[str, Any]] = None

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


def fetch_available_airports() -> List[str]:
  """Hämtar tillgängliga IATA-koder dynamiskt från AirportInfo v2."""
  if not API_KEY:
    return DEFAULT_AIRPORTS

  headers = {
      "Accept": "application/json",
      "Ocp-Apim-Subscription-Key": API_KEY,
  }
  try:
    resp = httpx.get(f"{AIRPORT_URL}/airports", headers=headers, timeout=5.0)
    if resp.status_code == 200:
      data = resp.json()
      # Extrahera IATA-koder från listan
      codes = [a.get("iata") for a in data if isinstance(a, dict) and a.get("iata")]
      if codes:
        return sorted(list(set(codes)))
  except Exception:
    pass
  return DEFAULT_AIRPORTS


def fetch_flights(airport: str, mode: str) -> Optional[FlightResponse]:
  if not API_KEY:
    return None

  today_str = datetime.now(tz_stockholm).strftime("%Y-%m-%d")
  url = f"{FLIGHT_URL}/{airport}/{mode}/{today_str}"
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


def generate_board(
    data: FlightResponse,
    airport: str,
    mode: str,
    filter_query: str = "",
) -> Table:
  now_local = datetime.now(tz_stockholm)
  mode_title = "AVGÅNGAR" if mode == "departures" else "ANKOMSTER & BAGAGE"
  
  filter_info = f" | [magenta]Filter: '{filter_query}'[/magenta]" if filter_query else ""
  title_text = (
      f"Swedavia FIDS - {airport.upper()} {mode_title} "
      f"({now_local.strftime('%H:%M:%S')}){filter_info}\n"
      f"[dim cyan][Tab/M] Läge | [A] Flygplats | [R] Uppdatera | [Q] Avsluta[/dim cyan]"
  )

  table = Table(
      title=title_text,
      show_header=True,
      header_style="bold cyan",
      expand=True,
  )

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

    # Filtrering baserat på sökning om användaren angett det
    flight_id_str = (f.flightScheduleNumber or f.flightId or "").upper()
    dest_str = extract_city(f, mode).upper()
    if filter_query and (filter_query.upper() not in flight_id_str and filter_query.upper() not in dest_str):
      continue

    time_obj = f.departureTime if mode == "departures" else f.arrivalTime
    if time_obj and time_obj.scheduledUtc:
      try:
        dt_utc = datetime.fromisoformat(
            time_obj.scheduledUtc.replace("Z", "+00:00")
        )
        dt_local = dt_utc.astimezone(tz_stockholm)
        threshold = 1800 if mode == "arrivals" else 900
        if not filter_query and (now_local - dt_local).total_seconds() > threshold:
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
      claim_unit = loc.baggageClaimUnit
      target_col = (
          f"[bold yellow]Band {claim_unit}[/bold yellow]"
          if claim_unit
          else "[dim]Inväntas[/dim]"
      )

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


# --- Tangentbordslyssnare för macOS ---
class KeyReader:

  def __init__(self):
    self.fd = sys.stdin.fileno()
    self.old_settings = termios.tcgetattr(self.fd)

  def __enter__(self):
    tty.setcbreak(self.fd)
    return self

  def __exit__(self, type, value, traceback):
    termios.tcsetattr(self.fd, termios.TCSADRAIN, self.old_settings)

  def read_key(self) -> Optional[str]:
    r, _, _ = select.select([sys.stdin], [], [], 0.05)
    if r:
      return sys.stdin.read(1)
    return None


# --- Huvudprogram ---
def main():
  import argparse

  parser = argparse.ArgumentParser(description="Swedavia Terminal FIDS")
  parser.add_argument("--airport", "-a", default="ARN", help="Start-flygplats (IATA)")
  parser.add_argument("--mode", "-m", choices=["departures", "arrivals"], default="departures")
  parser.add_argument("--search", "-s", default="", help="Filtrera på flygnummer eller stad")
  args = parser.parse_args()

  if not API_KEY:
    console.print("[bold red]Fel:[/bold red] Miljövariabeln SWEDAVIA_API_KEY saknas.")
    sys.exit(1)

  # 1. Hämta alla Swedavia-flygplatser dynamiskt via AirportInfo
  airports = fetch_available_airports()
  current_airport = args.airport.upper()
  if current_airport not in airports:
    airports.insert(0, current_airport)

  current_airport_idx = airports.index(current_airport)
  current_mode = args.mode
  filter_query = args.search
  refresh_interval = 30
  last_fetch_time = 0

  airport = airports[current_airport_idx]
  cached_data = fetch_flights(airport, current_mode)

  if not cached_data:
    console.print(f"[red]Kunde inte hämta flygdata för {airport}.[/red]")
    sys.exit(1)

  last_fetch_time = time.time()

  with (
      KeyReader() as kr,
      Live(
          generate_board(cached_data, airport, current_mode, filter_query),
          console=console,
          screen=True,
          refresh_per_second=4,
      ) as live,
  ):
    while True:
      key = kr.read_key()
      need_refresh = False

      if key:
        k = key.lower()
        if k in ["q", "\x03"]:  # 'q' eller Ctrl+C
          break
        elif k in ["\t", "m"]:  # Tab eller 'm' växlar mode
          current_mode = "arrivals" if current_mode == "departures" else "departures"
          need_refresh = True
        elif k == "a":  # 'a' växlar till nästa flygplats i listan
          current_airport_idx = (current_airport_idx + 1) % len(airports)
          airport = airports[current_airport_idx]
          need_refresh = True
        elif k == "r":  # 'r' tvingar manuell refresh
          need_refresh = True
        elif k == "c":  # 'c' rensar aktivt filter
          filter_query = ""
          need_refresh = True

      now = time.time()
      if need_refresh or (now - last_fetch_time >= refresh_interval):
        fresh_data = fetch_flights(airport, current_mode)
        if fresh_data:
          cached_data = fresh_data
        last_fetch_time = now
        live.update(generate_board(cached_data, airport, current_mode, filter_query))

      time.sleep(0.05)


if __name__ == "__main__":
  main()