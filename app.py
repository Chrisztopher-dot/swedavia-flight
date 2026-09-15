from datetime import datetime, timezone
import os
import sys
from typing import List, Optional
from zoneinfo import ZoneInfo
import httpx
from pydantic import BaseModel, Field
from rich.console import Console
from rich.table import Table

# =====================================================================
# Konfiguration & API-nyckel
# =====================================================================
API_KEY = os.getenv("SWEDAVIA_API_KEY", "")
BASE_URL = "https://api.swedavia.se/flightinfo/v2"


# =====================================================================
# Datamodeller (enligt Swedavia OpenAPI 3.0-specifikationen)
# =====================================================================
class AirlineOperator(BaseModel):
  iata: Optional[str] = None
  name: Optional[str] = "Okänt flygbolag"


class DepartureTime(BaseModel):
  scheduledUtc: Optional[str] = None
  estimatedUtc: Optional[str] = None
  actualUtc: Optional[str] = None


class DepartureLocationAndStatus(BaseModel):
  terminal: Optional[str] = "-"
  gate: Optional[str] = "-"
  gateAction: Optional[str] = None
  gateActionSwedish: Optional[str] = None
  flightLegStatus: Optional[str] = "-"
  flightLegStatusSwedish: Optional[str] = None


class DepartureFlight(BaseModel):
  flightId: str
  arrivalAirportSwedish: Optional[str] = "Okänd destination"
  arrivalAirportEnglish: Optional[str] = None
  airlineOperator: Optional[AirlineOperator] = None
  departureTime: Optional[DepartureTime] = None
  locationAndStatus: Optional[DepartureLocationAndStatus] = None


class DeparturesResponse(BaseModel):
  numberOfFlights: int = 0
  flights: List[DepartureFlight] = Field(default_factory=list)


# =====================================================================
# API-anrop
# =====================================================================
def fetch_departures(airport_iata: str, date_str: str) -> DeparturesResponse:
  """Hämtar dagens avgångar för en given flygplats (t.ex.

  ARN, GOT, BMA).
  """
  headers = {"Ocp-Apim-Subscription-Key": API_KEY, "Accept": "application/json"}
  url = f"{BASE_URL}/{airport_iata}/departures/{date_str}"

  with httpx.Client(timeout=10.0) as client:
    response = client.get(url, headers=headers)

    if response.status_code == 401:
      print("❌ HTTP 401: Ogiltig eller utgången API-nyckel.")
      sys.exit(1)
    elif response.status_code == 204:
      return DeparturesResponse(numberOfFlights=0, flights=[])

    response.raise_for_status()
    return DeparturesResponse.model_validate(response.json())


# =====================================================================
# Presentation & Filtrering
# =====================================================================
def display_board(data: DeparturesResponse, airport: str):
  console = Console()
  tz_stockholm = ZoneInfo("Europe/Stockholm")
  now_local = datetime.now(tz_stockholm)

  table = Table(
      title=f"✈️  Avgångar från {airport} ({now_local.strftime('%Y-%m-%d %H:%M')})",
      header_style="bold blue",
  )

  table.add_column("Tid", style="cyan", no_wrap=True)
  table.add_column("Flight", style="bold yellow")
  table.add_column("Destination", style="white")
  table.add_column("Flygbolag", style="magenta")
  table.add_column("Term", justify="center", style="dim")
  table.add_column("Gate", justify="center", style="green")
  table.add_column("Status / Händelse", style="bold")

  # 1. Filtrera bort inställda samt redan passerade flyg (>15 min sedan)
  valid_flights: List[DepartureFlight] = []
  for f in data.flights:
    if not f.locationAndStatus:
      continue

    status_swe = f.locationAndStatus.flightLegStatusSwedish or ""
    status_code = f.locationAndStatus.flightLegStatus or ""

    # Hoppa över rader som är borttagna eller inställda
    if status_swe == "Borttagen" or status_code in ["CAN", "DEL"]:
      continue

    # Sortera bort flyg som avgick för mer än 15 minuter sedan
    if f.departureTime and f.departureTime.scheduledUtc:
      try:
        utc_dt = datetime.fromisoformat(
            f.departureTime.scheduledUtc.replace("Z", "+00:00")
        )
        local_dt = utc_dt.astimezone(tz_stockholm)
        if (now_local - local_dt).total_seconds() > 900:  # 900 sek = 15 min
          continue
      except Exception:
        pass

    valid_flights.append(f)


  # 2. Sortera kronologiskt efter schemalagd tid
  valid_flights.sort(
      key=lambda x: (
          x.departureTime.scheduledUtc
          if x.departureTime and x.departureTime.scheduledUtc
          else ""
      )
  )

  # 3. Rendera rader
  count = 0
  for flight in valid_flights:
    time_str = "--:--"
    if flight.departureTime and flight.departureTime.scheduledUtc:
      try:
        utc_dt = datetime.fromisoformat(
            flight.departureTime.scheduledUtc.replace("Z", "+00:00")
        )
        local_dt = utc_dt.astimezone(tz_stockholm)
        time_str = local_dt.strftime("%H:%M")
      except Exception:
        time_str = flight.departureTime.scheduledUtc[-9:-4]

    airline = flight.airlineOperator.name if flight.airlineOperator else "-"
    term = (
        flight.locationAndStatus.terminal if flight.locationAndStatus else "-"
    )
    gate = flight.locationAndStatus.gate if flight.locationAndStatus else "-"

    # Bestäm statusmeddelande
    status_text = "I tid"
    if flight.locationAndStatus:
      if flight.locationAndStatus.gateActionSwedish:
        status_text = flight.locationAndStatus.gateActionSwedish
      elif flight.locationAndStatus.flightLegStatusSwedish:
        status_text = flight.locationAndStatus.flightLegStatusSwedish
      elif (
          flight.locationAndStatus.flightLegStatus
          and flight.locationAndStatus.flightLegStatus != "-"
      ):
        status_text = flight.locationAndStatus.flightLegStatus

    # Färgmarkering beroende på status
    status_style = "green" if status_text in ["I tid", "Öppen"] else "yellow"
    if "Stängd" in status_text or "Försenad" in status_text:
      status_style = "red"

    table.add_row(
        time_str,
        flight.flightId,
        flight.arrivalAirportSwedish,
        airline,
        term,
        gate,
        f"[{status_style}]{status_text}[/{status_style}]",
    )
    count += 1
    if count >= 35:
      break

  console.print(table)


# =====================================================================
# Main entrypoint
# =====================================================================
if __name__ == "__main__":
  # Stöd för att skicka med IATA-kod som argument: python app.py GOT
  airport_code = sys.argv[1].upper() if len(sys.argv) > 1 else "ARN"
  today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")

  result = fetch_departures(airport_code, today_utc)
  display_board(result, airport_code)