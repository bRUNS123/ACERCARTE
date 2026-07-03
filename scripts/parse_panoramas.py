#!/usr/bin/env python3
"""
Regenerate panoramas-gratis.json with structured events + category detection.
Also adds date parsing for sorting.
"""
import json, re
from datetime import datetime, timedelta
from pathlib import Path

SITE_DIR = Path.home() / "Desktop" / "ACERCARTE"
JSON_PATH = SITE_DIR / "datos" / "panoramas-gratis.json"

# ── Category detection ──────────────────────────────────

CATEGORY_RULES = [
    # (emoji, name, keywords)
    ("🎵", "Música", ["concierto", "música", "musical", "orquesta", "sinfónica", "sinfonica",
                      "jazz", "tributo", "banda", "cueca", "cuecazo", "milonga", "rap",
                      "salsa", "vinilo", "acordeón", "acordeon", "cantante", "coro"]),
    ("🎭", "Teatro", ["teatro", "obra", "dramaturgia", "actor", "actriz", "escénica",
                      "escenica", "murga", "compañía", "compañia", "monólogo", "monologo"]),
    ("🎬", "Cine", ["cine", "película", "pelicula", "documental", "cineteca", "festival de cine",
                    "audiovisual", "cortometraje", "film"]),
    ("💃", "Danza", ["danza", "baile", "bailar", "cueca", "milonga", "tango", "carnaval",
                     "folclor", "folclore", "folklore"]),
    ("🖼️", "Exposición", ["exposición", "exposicion", "inauguración", "inauguracion",
                          "muestra", "galería", "galeria", "colección", "coleccion",
                          "museo", "exhibición", "exhibicion"]),
    ("🎪", "Festival/Feria", ["festival", "feria", "carnaval", "encuentro", "mercado",
                              "bazar", "expo", "aniversario", "celebración", "celebracion"]),
    ("📚", "Literatura", ["libro", "literatura", "poesía", "poesia", "cuentacuentos",
                          "lectura", "biblioteca", "cómic", "comic", "poético", "poetico"]),
    ("👶", "Infantil/Familiar", ["infantil", "niño", "niña", "familiar", "familia",
                                 "vacaciones", "juvenil", "juguete", "jurásico", "jurasico"]),
    ("🗣️", "Charla/Seminario", ["charla", "conversatorio", "seminario", "conferencia",
                                "masterclass", "taller", "diálogo", "dialogo"]),
    ("🏛️", "Patrimonio", ["patrimonio", "patrimonial", "historia", "histórico", "historico",
                           "archivo", "memoria", "recorrido", "visita guiada", "cementerio"]),
    ("🎨", "Artesanía/Diseño", ["artesanía", "artesania", "diseño", "diseno", "joyería",
                                "joyeria", "artesanal", "oficio", "hecho a mano"]),
    ("🏳️‍🌈", "Diversidad", ["lgbt", "diversidad", "disidencia", "queer", "trans",
                             "orgullo", "diverso", "diversa"]),
    ("🍷", "Gastronomía", ["gastronomía", "gastronomia", "vino", "gourmet", "comida",
                           "restaurant", "vegano", "vegetariano", "cerveza"]),
    ("🧘", "Bienestar", ["yoga", "meditación", "meditacion", "bienestar", "salud",
                         "mindfulness"]),
    ("🌿", "Naturaleza", ["naturaleza", "jardín", "jardin", "zoológico", "zoologico",
                          "animal", "medio ambiente", "ecología", "ecologia", "sustentable"]),
]

def detect_category(text):
    """Detect categories from event description + header text."""
    text_lower = text.lower()
    matches = []
    for emoji, name, keywords in CATEGORY_RULES:
        for kw in keywords:
            if kw in text_lower:
                matches.append((emoji, name))
                break
    if not matches:
        return [("📌", "General")]
    return matches


# ── Date parsing for sorting ────────────────────────────

MESES = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
}
DIAS_SEM = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo']

def parse_event_date(date_str, year_hint=None):
    """
    Try to parse a date string like 'Sábado 20 de junio al Viernes 3 de julio'
    Returns (start_date, end_date) as ISO strings or (None, None).
    """
    if not date_str:
        return None, None

    # Determine year
    now = datetime.now()
    if year_hint is None:
        year_hint = now.year

    date_lower = date_str.lower().strip()

    # Try to find dates: "20 de junio", "3 de julio"
    date_pattern = re.compile(r'(\d{1,2})\s+de\s+(' + '|'.join(MESES.keys()) + r')', re.I)
    dates_found = date_pattern.findall(date_lower)

    parsed_dates = []
    for day_str, month_str in dates_found:
        day = int(day_str)
        month = MESES.get(month_str.lower(), 1)
        year = year_hint
        # If month < current month and we're near end of year, assume next year
        if month < now.month - 1:
            year = year_hint + 1
        try:
            parsed_dates.append(datetime(year, month, day))
        except ValueError:
            continue

    if not parsed_dates:
        # Try "Viernes 1, Sábado 2 y Domingo 3" pattern without explicit month
        # Extract the first day number
        first_day = re.search(r'\b(\d{1,2})\b', date_lower)
        if first_day:
            # Use month from header or current month
            day = int(first_day.group(1))
            try:
                d = datetime(year_hint, now.month, day)
                if d < now:
                    d = datetime(year_hint, now.month + 1 if now.month < 12 else 1, day)
                parsed_dates.append(d)
            except ValueError:
                pass

    if not parsed_dates:
        return None, None

    start = min(parsed_dates)
    end = max(parsed_dates) if len(parsed_dates) > 1 else start

    return start.isoformat(), end.isoformat()


# ── Rest of parser (same as before, with category detection) ──

def is_subheader(line):
    days = r'(Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)'
    return bool(re.match(rf'^{days}\s+\d{{1,2}}(\s+(y|al)\s+{days}\s+\d{{1,2}})?:\s*$', line, re.I))

def parse_event_line(text):
    event = {"time": "", "date": "", "description": "", "location": "", "extra": "", "categories": []}
    tr = re.match(r'^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+', text)
    if tr:
        event["time"] = f"{tr.group(1)}–{tr.group(2)}"
        text = text[tr.end():].strip()
    else:
        tm = re.match(r'^(\d{1,2}:\d{2})\s+', text)
        if tm:
            event["time"] = tm.group(1)
            text = text[tm.end():].strip()
    colon_idx = text.find(':')
    if colon_idx > 0:
        date_part = text[:colon_idx].strip()
        after_colon = text[colon_idx + 1:].strip()
    else:
        date_part, after_colon = "", text
    date_kw = {d for d in DIAS_SEM} | set(MESES.keys()) | {'de','del','al','hasta','y',','}
    tokens = re.findall(r'[a-záéíóúñ]+', date_part.lower())
    if tokens and all(t in date_kw or t.isdigit() for t in tokens):
        event["date"] = date_part
    elif date_part:
        after_colon, event["date"] = text, ""
    desc = after_colon.strip()
    for pat in [re.compile(r'\ben\s+(@\w+(?:\.\w+)?(?:\s+y\s+@\w+(?:\.\w+)?)?)', re.I),
                re.compile(r'\ben\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚa-záéíóú]+){0,4}?)(?:,|\.|$)', re.I)]:
        m = pat.search(desc)
        if m:
            event["location"] = m.group(1).strip()
            desc = desc[:m.start()] + desc[m.end():]
            break
    if not event["location"]:
        for v in re.findall(r'@(\w+(?:\.\w+)?)', desc):
            if any(kw in v.lower() for kw in
                   ['museo','teatro','centro','cultura','cine','biblioteca','galeria','plaza','parque','mall','mercado','feria','municipal','casa','espacio','estacion']):
                event["location"] = f"@{v}"
                desc = desc.replace(f"@{v}", "").strip()
                break
    event["description"] = re.sub(r'\s+', ' ', desc).strip().rstrip(',')
    extras = []
    for pat in [r'(previa\s+(inscripción|inscripcion|reserva|descarga)(\s+de\s+(entradas?|tickets?))?(\s+en\s+[^,\.]+)?)',
                r'(invita\s+@?\w[\w@\.\s,]*)', r'(por\s+orden\s+de\s+llegada)']:
        for m in re.finditer(pat, event["description"], re.I):
            extras.append(m.group(1).strip())
            event["description"] = (event["description"][:m.start()]+event["description"][m.end():]).strip()
    event["extra"] = '; '.join(extras).strip()
    event["description"] = re.sub(r'\s+',' ',event["description"]).strip().rstrip(',.;')

    # Detect categories from description + date
    full_text = f"{event.get('description','')} {event.get('date','')}"
    event["categories"] = detect_category(full_text)

    # Parse dates for sorting
    start, end = parse_event_date(event.get("date", ""))
    event["date_start"] = start
    event["date_end"] = end

    return event

def parse_caption(raw):
    raw = re.sub(r'^[\d,]+ likes.*?panoramasgratis el \w+ \d+, \d{4}: "', '', raw.strip(), flags=re.I).strip().rstrip('"')
    if raw.startswith('"') and raw.endswith('"'):
        raw = raw[1:-1]
    lines = [l.strip() for l in raw.split('\n') if l.strip()]
    if not lines:
        return {"header":"","events":[]}
    header = lines[0].rstrip(':').strip()
    if len(header) < 5 and not any(c.isalpha() for c in header):
        header = ""
    events, cur = [], None
    ev_re = re.compile(r'^(\d{1,2})\s*[).]\s*(.+)')
    for line in lines[1:]:
        if not line or line.startswith('#') or line.startswith('http'):
            continue
        if is_subheader(line):
            continue
        m = ev_re.match(line)
        if m:
            if cur: events.append(cur)
            cur = parse_event_line(m.group(2).strip())
        elif cur:
            if line.lower().startswith('invita'):
                cur["extra"] = (cur.get("extra","")+" "+line).strip()
            elif '@' in line and len(line) < 80:
                if not cur.get("location"): cur["location"] = line.strip()
                else: cur["extra"] = (cur.get("extra","")+" "+line).strip()
            else:
                cur["description"] = (cur.get("description","")+" "+line).strip()
    if cur: events.append(cur)
    return {"header":header, "events":events}


# ── Main ──
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

structured = []
for p in data['posts']:
    parsed = parse_caption(p['caption'])
    structured.append({"header":parsed["header"],"events":parsed["events"],"url":p["url"],"date":p["date"]})

# Collect all unique categories
all_cats = set()
for post in structured:
    for ev in post["events"]:
        for _, cat_name in ev.get("categories", []):
            all_cats.add(cat_name)
all_cats = sorted(all_cats)

# Add "General" at the end if present
if "General" in all_cats:
    all_cats.remove("General")
    all_cats.append("General")

payload = {
    "actualizado": datetime.now().isoformat(),
    "fecha": datetime.now().strftime("%d/%m/%Y"),
    "fuente": data["fuente"],
    "total_posts": len(structured),
    "total_eventos": sum(len(p["events"]) for p in structured),
    "categorias_disponibles": all_cats,
    "posts": structured,
}

# Print sample
for i, post in enumerate(payload['posts'][:2]):
    print(f'\n--- Post {i+1}: {post["header"][:60]}')
    print(f'  Events: {len(post["events"])}')
    for j, ev in enumerate(post['events'][:3]):
        cats = [f"{e} {n}" for e, n in ev.get('categories', [])]
        print(f'  [{j+1}] {ev.get("time",""):8s} | {ev.get("date","")[:35]:35s} | {ev.get("description","")[:60]}')
        print(f'       🏷️  {", ".join(cats)}')
        print(f'       📅 {ev.get("date_start","?")} → {ev.get("date_end","?")}')

print(f'\n✅ {payload["total_posts"]} posts, {payload["total_eventos"]} eventos')
print(f'🏷️  Categories: {all_cats}')

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
print('💾 Saved')
