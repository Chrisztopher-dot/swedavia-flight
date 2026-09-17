# ✈️ Swedavia Terminal FIDS (Flight Information Display System)
> APL-project 2026: Reverse Engineering a Live Flight System

Ett terminalbaserat realtidssystem (FIDS) för Swedavias flygplatser, byggt genom reverse engineering av Swedavias öppna API-gränssnitt.

---

## 🧩 Reverse Engineering Documentation

### 🟣 Step 1: Look at the Application
Vi analyserade två offentliga REST-API:er från Swedavia (`api.swedavia.se`):
1. **FlightInfo API v2 (`/flightinfo/v2`):** Realtidsströmmar för avgångar (`departures`) och ankomster (`arrivals`).
2. **AirportInfo API v2 (`/airportinfo/v2`):** Metadata för flygplatser (`/airports`), destinationer (`/{iata}/destinations`) och flygbolag (`/airlines`).

### 🟣 Step 2: Ask Questions
* **Vilken datatyp hanteras?** Tidsstämplade flygrörelser i UTC (`scheduledUtc`, `estimatedUtc`), statuskoder (`DEL`, `ARR`, `CAN`) samt infrastrukturresurser (gater, terminaler, bagageband).
* **Hur skapades detta?** Swedavias centrala AODB-system (Airport Operational Database) serialiseras till JSON via en Azure API Management (APIM)-gateway.
* **Upptäckta avvikelser:** Dokumentationen indikerade kapslade destinationsobjekt, men API:et returnerar platta fält direkt på rotnivå (`arrivalAirportSwedish: "London LHR"`). Dessutom kräver Azure APIM en explicit header `Accept: application/json` för att inte returnera HTTP 400.

### 🟣 Step 3: Guess the Inputs
* `airport`: IATA-kod (t.ex. `ARN`, `GOT`, `BMA`), hämtad dynamiskt via `/airports`.
* `mode`: Typ av trafik (`departures` eller `arrivals`).
* `date`: ISO-datum (`YYYY-MM-DD`).
* `Ocp-Apim-Subscription-Key`: Prenumerationsnyckel för autentisering.
* `Accept: application/json`: Obligatorisk MIME-type-header.

### 🟣 Step 4: Guess the Process
1. **Anrop:** HTTP GET skickas mot Swedavias API Gateway.
2. **Validering:** JSON-svaret mappas mot typdefinierade Pydantic-modeller.
3. **Filtrering:** Inställda/borttagna rader (`DEL`, `Borttagen`) och historiska flyg äldre än 15–30 min rensas bort.
4. **Tidsomvandling:** UTC-tidsstämplar konverteras till lokal svensk tid (`Europe/Stockholm`).
5. **Layout & TUI:** Rich genererar en interaktiv, flimmerfri display med anpassade kolumner för avgångar (gate/status) och ankomster (bagageband/landning).

### 🟣 Step 5: Sketch the Steps (Pseudocode)
```python
def get_flight_board(airport, mode, date):
    headers = {"Ocp-Apim-Subscription-Key": KEY, "Accept": "application/json"}
    raw_data = http_get(f"https://api.swedavia.se/flightinfo/v2/{airport}/{mode}/{date}", headers=headers)
    
    clean_flights = []
    for flight in raw_data["flights"]:
        if flight["locationAndStatus"]["flightLegStatus"] == "DEL":
            continue
        clean_flights.append({
            "time": to_stockholm_time(flight["time"]["scheduledUtc"]),
            "flight": flight["flightScheduleNumber"],
            "city": flight["arrivalAirportSwedish"],
            "resource": flight["gate"] if mode == "departures" else flight["baggageClaimUnit"],
            "status": flight["flightLegStatusSwedish"]
        })
    return sort_chronologically(clean_flights)
```

---

## ⚡ Quick Launch (1-Click)

### 🍏 macOS / Linux
Simply double-click **`start.command`** in Finder (or run `./start.command` in terminal).

### 🪟 Windows
Simply double-click **`start.bat`** in File Explorer.
*(If running for the very first time on a fresh Windows machine, double-click **`setup_windows.bat`** first to set up the environment).*

---

## 🚀 Manual Running (Terminal)

### 1. Start the FastAPI Backend
```bash
# macOS / Linux:
./.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Windows:
.venv\Scripts\uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation is available at `http://localhost:8000/docs`.

### 2. Start the Modern Frontend (Development Mode)
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. All-in-One Production Mode
```bash
npm run build --prefix frontend
python server.py
```
Open `http://localhost:8000` in your browser.
