"""
Genera el seed JSON de la flota a partir de la malla real (malla_horaria.xlsx).

Uso:
    python scripts/build_seed.py [ruta_xlsx]

Salida: src/data/malla.seed.json con { month, zones, pointsOfSale, drivers, shifts }.
Los turnos quedan ya parseados (start/end/hours/kind) para que el frontend no
tenga que interpretar los códigos crudos del Excel.
"""
import json
import math
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_XLSX = ROOT.parent / "malla_horaria.xlsx"
OUT = ROOT / "src" / "data" / "malla.seed.json"

YEAR = 2026
MONTH = 7  # Julio
MONTH_LABEL = "Julio 2026"

WEEKDAYS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

ZONE_PALETTE = [
    "#084878", "#0b7285", "#8a3ffc", "#e2231a", "#2f9e44", "#f08c00",
    "#5f3dc4", "#c2255c", "#1971c2", "#0ca678", "#e8590c", "#ae3ec9",
    "#495057", "#d6336c", "#1098ad", "#66a80f", "#f59f00", "#7048e8",
    "#3b5bdb", "#087f5b", "#e64980", "#4263eb", "#12b886", "#fab005",
    "#845ef7", "#f76707", "#15aabf", "#2b8a3e",
]

KNOWN_CITIES = {
    "MEDELLIN": "Medellín", "BOGOTA": "Bogotá", "CALI": "Cali",
    "BARRANQUILLA": "Barranquilla", "CARTAGENA": "Cartagena",
    "BUCARAMANGA": "Bucaramanga", "PEREIRA": "Pereira", "MANIZALES": "Manizales",
    "BELLO": "Bello", "ENVIGADO": "Envigado", "ITAGUI": "Itagüí",
    "RIONEGRO": "Rionegro", "CAUCASIA": "Caucasia", "APARTADO": "Apartadó",
    "MONTERIA": "Montería", "SINCELEJO": "Sincelejo", "SABANETA": "Sabaneta",
}


def strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


def slug(text: str, prefix: str) -> str:
    base = strip_accents(text).upper()
    base = re.sub(r"[^A-Z0-9]+", "-", base).strip("-")
    return f"{prefix}-{base}"[:60]


def city_for_zone(zona: str) -> str:
    up = strip_accents(zona).upper()
    for key, nice in KNOWN_CITIES.items():
        if key in up:
            return nice
    return "Medellín"


SHIFT_RE = re.compile(r"^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?(\*)?$")


def parse_code(raw):
    """Devuelve dict {code,start,end,hours,kind,isRest,isVacation} o None si inválido."""
    if raw is None:
        return None
    s = str(raw).strip().upper()
    if not s:
        return None
    if s in ("DESC", "DES", "DESCANSO"):
        return {"code": "DESC", "start": None, "end": None, "hours": 0,
                "kind": "REST", "isRest": True, "isVacation": False}
    if s in ("VACAC", "VACACIONES"):
        return {"code": "VACAC", "start": None, "end": None, "hours": 0,
                "kind": "REST", "isRest": True, "isVacation": True}

    m = SHIFT_RE.match(s)
    if not m:
        return None
    h1, m1, h2, m2, star = m.groups()
    start = int(h1) + (int(m1) / 60 if m1 else 0)
    end = int(h2) + (int(m2) / 60 if m2 else 0)
    crosses = end <= start
    if crosses:
        end += 24
    span = end - start
    hours = round(span - (1 if star else 0), 2)

    if crosses or start >= 19:
        kind = "NIGHT"
    elif start < 10:
        kind = "MORNING"
    elif start < 14:
        kind = "MID"
    else:
        kind = "AFTERNOON"

    # Código de presentación normalizado (sin decimales innecesarios).
    def fmt(v):
        return str(int(v)) if float(v).is_integer() else str(v).rstrip("0").rstrip(".")

    display_end = end - 24 if crosses else end
    code = f"{int(start):02d}{('' if float(start).is_integer() else ':' + m1)}-{int(display_end):02d}"
    if m1:
        code = f"{int(start):02d}:{m1}-{int(display_end):02d}"
    if m2:
        code = code + f":{m2}"
    if star:
        code += "*"

    return {"code": code, "start": round(start, 2), "end": round(end, 2),
            "hours": hours, "kind": kind, "isRest": False, "isVacation": False}


def main():
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    ws = wb["MALLA"]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[1]

    # Columnas de día = las primeras 31 después de las 5 columnas de identidad.
    day_count = 31
    day_dates = [date(YEAR, MONTH, d) for d in range(1, day_count + 1)]

    zones = {}
    points = {}
    drivers = []
    shifts = []

    def ensure_zone(zona: str) -> str:
        if zona not in zones:
            idx = len(zones)
            zones[zona] = {
                "id": slug(zona, "Z") or f"Z{idx}",
                "code": zona,
                "name": zona,
                "city": city_for_zone(zona),
                "color": ZONE_PALETTE[idx % len(ZONE_PALETTE)],
            }
        return zones[zona]["id"]

    def ensure_pos(name: str, zone_id: str) -> str:
        if name not in points:
            points[name] = {
                "id": slug(name, "PDV"),
                "name": name,
                "zoneId": zone_id,
                "minDriversPerShift": 1,
            }
        return points[name]["id"]

    for r in rows[2:]:
        if r[0] is None or str(r[1] or "").strip() == "":
            continue
        cedula = str(int(r[0])) if isinstance(r[0], float) else str(r[0]).strip()
        name = str(r[1]).strip()
        punto = str(r[3]).strip() if r[3] else "SIN PUNTO"
        zona = str(r[4]).strip() if r[4] else "SIN ZONA"

        zone_id = ensure_zone(zona)
        pos_id = ensure_pos(punto, zone_id)

        worked = 0
        vacac = 0
        for i in range(day_count):
            raw = r[5 + i]
            parsed = parse_code(raw)
            if parsed is None:
                # Celda vacía o no reconocida → se asume descanso.
                parsed = {"code": "DESC", "start": None, "end": None, "hours": 0,
                          "kind": "REST", "isRest": True, "isVacation": False}
            d = day_dates[i]
            iso = d.isoformat()
            if parsed["isVacation"]:
                vacac += 1
            elif not parsed["isRest"]:
                worked += 1
            shifts.append({
                "id": f"{cedula}-{iso}",
                "driverId": cedula,
                "date": iso,
                "weekday": WEEKDAYS_ES[d.weekday()],
                "code": parsed["code"],
                "start": parsed["start"],
                "end": parsed["end"],
                "hours": parsed["hours"],
                "kind": parsed["kind"],
                "pointOfSaleId": pos_id,
                "zoneId": zone_id,
            })

        total_hours = round(sum(
            s["hours"] for s in shifts if s["driverId"] == cedula
        ), 1)
        if worked > 0:
            status = "ACTIVE"
        elif vacac > 0:
            status = "VACATION"
        else:
            status = "INACTIVE"
        cap = max(192, int(math.ceil(total_hours / 8.0) * 8) + 8)

        drivers.append({
            "id": cedula,
            "name": name,
            "basePointOfSaleId": pos_id,
            "zoneId": zone_id,
            "status": status,
            "monthlyHourCap": cap,
        })

    seed = {
        "month": {"year": YEAR, "monthIndex": MONTH - 1, "label": MONTH_LABEL},
        "zones": list(zones.values()),
        "pointsOfSale": list(points.values()),
        "drivers": drivers,
        "shifts": shifts,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(seed, ensure_ascii=False), encoding="utf-8")
    print(f"OK -> {OUT}")
    print(f"  zonas={len(zones)} pdv={len(points)} repartidores={len(drivers)} turnos={len(shifts)}")


if __name__ == "__main__":
    main()
