#!/usr/bin/env python3
"""Regenerate panoramas-gratis.json with structured events from existing data."""
import json, re
from datetime import datetime
from pathlib import Path

SITE_DIR = Path.home() / "Desktop" / "ACERCARTE"
JSON_PATH = SITE_DIR / "datos" / "panoramas-gratis.json"

def is_subheader(line):
    days = r'(Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)'
    return bool(re.match(rf'^{days}\s+\d{{1,2}}(\s+(y|al)\s+{days}\s+\d{{1,2}})?:\s*$', line, re.I))

def parse_event_line(text):
    event = {"time": "", "date": "", "description": "", "location": "", "extra": ""}
    # Time range: "10:00 - 17:00" or single "15:00"
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
    date_kw = {'lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado',
               'domingo','enero','febrero','marzo','abril','mayo','junio','julio','agosto',
               'septiembre','octubre','noviembre','diciembre','de','del','al','hasta','y',','}
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
            elif '@' in line and len(line) < 80 and not any(kw in line.lower() for kw in ['descripción','información']):
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

payload = {
    "actualizado": datetime.now().isoformat(),
    "fecha": datetime.now().strftime("%d/%m/%Y"),
    "fuente": data["fuente"],
    "total_posts": len(structured),
    "total_eventos": sum(len(p["events"]) for p in structured),
    "posts": structured,
}

for i, post in enumerate(payload['posts'][:3]):
    print(f'\n--- Post {i+1}: {post["header"][:60]}')
    print(f'  Events: {len(post["events"])}')
    for j, ev in enumerate(post['events'][:4]):
        print(f'  [{j+1}] {ev.get("time",""):8s} | {ev.get("date","")[:40]:40s} | {ev.get("description","")[:70]}')
        if ev.get('location'): print(f'       📍 {ev["location"]}')
        if ev.get('extra'): print(f'       ℹ️ {ev["extra"][:60]}')
print(f'\n✅ {payload["total_posts"]} posts, {payload["total_eventos"]} eventos')

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
print('💾 Saved')
