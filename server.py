from datetime import datetime
import os
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel

# Load environment variables
load_dotenv()

API_KEY = os.getenv("SWEDAVIA_API_KEY", "")
FLIGHT_URL = "https://api.swedavia.se/flightinfo/v2"
AIRPORT_URL = "https://api.swedavia.se/airportinfo/v2"

# Stockholm timezone
TZ_STOCKHOLM = ZoneInfo("Europe/Stockholm")

# Available airports in Swedavia network
SWEDAVIA_AIRPORTS = [
    {"iata": "ARN", "name": "Stockholm Arlanda", "city": "Stockholm", "isHub": True},
    {"iata": "GOT", "name": "Göteborg Landvetter", "city": "Göteborg", "isHub": True},
    {"iata": "BMA", "name": "Stockholm Bromma", "city": "Stockholm", "isHub": True},
    {"iata": "LLA", "name": "Luleå Airport", "city": "Luleå", "isHub": True},
    {"iata": "MMX", "name": "Malmö Airport", "city": "Malmö", "isHub": True},
    {"iata": "UME", "name": "Umeå Airport", "city": "Umeå", "isHub": False},
    {"iata": "OSD", "name": "Åre Östersund", "city": "Östersund", "isHub": False},
    {"iata": "VBY", "name": "Visby Airport", "city": "Visby", "isHub": False},
    {"iata": "RNB", "name": "Ronneby Airport", "city": "Ronneby", "isHub": False},
    {"iata": "KRN", "name": "Kiruna Airport", "city": "Kiruna", "isHub": False},
]

app = FastAPI(
    title="Swedavia FIDS API",
    description="Flight Information Display System API for Swedavia Airports",
    version="1.0.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FlightItem(BaseModel):
    time: str
    flight: str
    city: str
    airline: str
    terminal: str
    resource: str
    status: str


def format_time_hhmm(utc_iso: Optional[str]) -> Optional[str]:
    """Convert UTC ISO timestamp to Europe/Stockholm HH:MM."""
    if not utc_iso:
        return None
    try:
        dt = datetime.fromisoformat(utc_iso.replace("Z", "+00:00"))
        return dt.astimezone(TZ_STOCKHOLM).strftime("%H:%M")
    except Exception:
        return None


def extract_city_display(flight_data: Dict[str, Any], mode: str) -> str:
    """Extract clean destination/origin city with IATA code."""
    ident = flight_data.get("flightLegIdentifier") or {}

    if mode == "departures":
        city = (
            flight_data.get("arrivalAirportEnglish")
            or flight_data.get("arrivalAirportSwedish")
            or ""
        )
        iata = ident.get("arrivalAirportIata", "")
    else:
        city = (
            flight_data.get("departureAirportEnglish")
            or flight_data.get("departureAirportSwedish")
            or ""
        )
        iata = ident.get("departureAirportIata", "")

    city = city.strip()
    if not city and iata:
        return iata
    if not city:
        return "--"

    # If city doesn't already contain the IATA code and IATA code exists, append it
    if iata and iata not in city.upper():
        return f"{city} {iata}"

    return city


def extract_resource(flight_data: Dict[str, Any], mode: str) -> str:
    """Format Gate for departures, or Baggage Belt for arrivals."""
    loc = flight_data.get("locationAndStatus") or {}
    bag = flight_data.get("baggage") or {}

    if mode == "departures":
        gate = loc.get("gate")
        if gate and str(gate).strip():
            gate_val = str(gate).strip()
            return gate_val if gate_val.lower().startswith("gate") else f"Gate {gate_val}"
        return "Gate TBD"
    else:
        belt = (
            loc.get("baggageClaimUnit")
            or bag.get("belt")
            or bag.get("baggageClaimUnit")
        )
        if belt and str(belt).strip():
            belt_val = str(belt).strip()
            return (
                belt_val
                if belt_val.lower().startswith("baggage belt") or belt_val.lower().startswith("belt")
                else f"Baggage Belt {belt_val}"
            )
        return "Awaiting Belt"


def extract_status(flight_data: Dict[str, Any], mode: str) -> str:
    """Determine normalized status description."""
    loc = flight_data.get("locationAndStatus") or {}
    status_code = (loc.get("flightLegStatus") or "").upper()
    status_en = loc.get("flightLegStatusEnglish") or ""
    status_swe = loc.get("flightLegStatusSwedish") or ""

    time_obj = (
        flight_data.get("departureTime")
        if mode == "departures"
        else flight_data.get("arrivalTime")
    ) or {}

    sched_hhmm = format_time_hhmm(time_obj.get("scheduledUtc"))
    est_hhmm = format_time_hhmm(time_obj.get("estimatedUtc"))
    act_hhmm = format_time_hhmm(time_obj.get("actualUtc"))

    # Cancelled
    if (
        status_code in ["CAN", "CNL"]
        or "cancelled" in status_en.lower()
        or "inställd" in status_swe.lower()
    ):
        return "Cancelled"

    # Departures specific statuses
    if mode == "departures":
        if act_hhmm or status_code in ["ACT", "DEP"] or "startat" in status_swe.lower() or "departed" in status_en.lower():
            return f"Departed {act_hhmm}" if act_hhmm else "Departed"

        if "boarding" in status_en.lower() or "boarding" in status_swe.lower():
            return "Boarding"
        if "gate open" in status_en.lower() or "öppen" in status_swe.lower():
            return "Gate Open"
        if "go to gate" in status_en.lower() or "gå till gate" in status_swe.lower():
            return "Go to Gate"
        if "gate closing" in status_en.lower() or "stänger" in status_swe.lower():
            return "Gate Closing"

        if est_hhmm and est_hhmm != sched_hhmm:
            return f"Estimated {est_hhmm}"

        if status_code in ["SCH", "PLN"] or "planerad" in status_swe.lower():
            return "On Time"

        if status_en:
            return status_en
        return "On Time"

    # Arrivals specific statuses
    else:
        if act_hhmm or status_code in ["LAN", "ARR"] or "landat" in status_swe.lower() or "landed" in status_en.lower():
            return f"Landed {act_hhmm}" if act_hhmm else "Landed"

        if est_hhmm and est_hhmm != sched_hhmm:
            return f"Expected {est_hhmm}"

        if status_code in ["SCH", "PLN"] or "planerad" in status_swe.lower():
            return "On Time"

        if status_en:
            return status_en
        return "On Time"


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "timestamp": datetime.now(TZ_STOCKHOLM).isoformat(),
        "apiKeyConfigured": bool(API_KEY),
    }


@app.get("/api/airports")
def get_airports():
    return SWEDAVIA_AIRPORTS


@app.get("/api/flights", response_model=List[FlightItem])
def get_flights(
    airport: str = Query(default="ARN", description="Airport IATA code (e.g. ARN, GOT, BMA)"),
    mode: str = Query(default="departures", pattern="^(departures|arrivals)$", description="Mode: departures or arrivals"),
):
    airport_code = airport.upper().strip()
    mode_val = mode.lower().strip()

    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="SWEDAVIA_API_KEY is not configured in server environment.",
        )

    now_local = datetime.now(TZ_STOCKHOLM)
    today_str = now_local.strftime("%Y-%m-%d")
    url = f"{FLIGHT_URL}/{airport_code}/{mode_val}/{today_str}"

    headers = {
        "Accept": "application/json",
        "Ocp-Apim-Subscription-Key": API_KEY,
    }

    try:
        resp = httpx.get(url, headers=headers, timeout=10.0)
        if resp.status_code == 404:
            return []
        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Swedavia API returned error: {resp.text}",
            )
        data = resp.json()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Error connecting to Swedavia API: {str(exc)}",
        )

    raw_flights = data.get("flights", []) if isinstance(data, dict) else []
    result: List[FlightItem] = []

    for f in raw_flights:
        loc = f.get("locationAndStatus") or {}
        status_code = loc.get("flightLegStatus")
        status_swe = loc.get("flightLegStatusSwedish") or ""

        # Filter out deleted flights
        if status_code in ["DEL", "DEL_DEP", "DEL_ARR"] or status_swe.lower() == "borttagen":
            continue

        time_obj = (
            f.get("departureTime") if mode_val == "departures" else f.get("arrivalTime")
        ) or {}
        sched_iso = time_obj.get("scheduledUtc")
        formatted_time = format_time_hhmm(sched_iso) or "--:--"

        flight_no = (
            f.get("flightScheduleNumber")
            or f.get("flightId")
            or (f.get("flightLegIdentifier") or {}).get("flightId")
            or "--"
        )

        airline_data = f.get("airlineOperator") or {}
        airline_name = airline_data.get("name") or airline_data.get("iata") or "Unknown Airline"

        terminal = loc.get("terminal") or "-"
        city = extract_city_display(f, mode_val)
        resource = extract_resource(f, mode_val)
        status = extract_status(f, mode_val)

        # Sort key helper
        result.append(
            FlightItem(
                time=formatted_time,
                flight=flight_no,
                city=city,
                airline=airline_name,
                terminal=terminal,
                resource=resource,
                status=status,
            )
        )

    # Sort flights chronologically by time
    result.sort(key=lambda x: x.time if x.time != "--:--" else "99:99")

    return result


# Mount static frontend build if available
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
