import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, Clock3, Copy, Check } from "lucide-react";

const PLACES = [
  { label: "New York", timeZone: "America/New_York" },
  { label: "Chile", timeZone: "America/Santiago" },
  { label: "México", timeZone: "America/Mexico_City" },
  { label: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
  { label: "Uruguay", timeZone: "America/Montevideo" },
  { label: "Colombia", timeZone: "America/Bogota" },
  { label: "Perú", timeZone: "America/Lima" },
  { label: "Ecuador", timeZone: "America/Guayaquil" },
  { label: "Costa Rica", timeZone: "America/Costa_Rica" },

  // Nuevos países relevantes LATAM
  { label: "Brasil (São Paulo)", timeZone: "America/Sao_Paulo" },
  { label: "Bolivia", timeZone: "America/La_Paz" },
  { label: "Paraguay", timeZone: "America/Asuncion" },
  { label: "Venezuela", timeZone: "America/Caracas" },
  { label: "Panamá", timeZone: "America/Panama" },
  { label: "Guatemala", timeZone: "America/Guatemala" },
  { label: "El Salvador", timeZone: "America/El_Salvador" },
  { label: "Rep. Dominicana", timeZone: "America/Santo_Domingo" },

  { label: "Inglaterra", timeZone: "Europe/London" },
  { label: "España", timeZone: "Europe/Madrid" },
];

function getNowInTimeZoneValue(timeZone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function formatPartsInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const zoned = formatPartsInZone(date, timeZone);
  const utcTs = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute);
  return (utcTs - date.getTime()) / 60000;
}

function zonedDateTimeToUtc(dateTimeLocal, sourceTimeZone) {
  const [datePart, timePart] = dateTimeLocal.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const naiveUtcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = getTimeZoneOffsetMinutes(naiveUtcGuess, sourceTimeZone);
  return new Date(naiveUtcGuess.getTime() - offset * 60000);
}

function formatDisplay(date, timeZone) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getSortKey(date, timeZone) {
  const { hour, minute } = formatPartsInZone(date, timeZone);
  return hour * 60 + minute;
}

function buildWhatsAppText(results) {
  const lines = ["*Horarios locales de diferentes países:*", ""];

  for (const item of results) {
    lines.push(`* *${item.label}* / ${item.display} h`);
  }

  return lines.join("\n");
}

const DEFAULT_SELECTED_LABELS = [
  "Costa Rica",
  "México",
  "Colombia",
  "Ecuador",
  "Perú",
  "Chile",
  "Argentina",
  "Uruguay",
  "Brasil (São Paulo)",
  "Inglaterra",
  "España",
];

export default function WorldTimeSorterApp() {
  const sourceTimeZone = "America/New_York";
  const [inputDateTime, setInputDateTime] = useState(getNowInTimeZoneValue(sourceTimeZone));
  const [copied, setCopied] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState(DEFAULT_SELECTED_LABELS);
  const textAreaRef = useRef(null);

  const utcDate = useMemo(() => zonedDateTimeToUtc(inputDateTime, sourceTimeZone), [inputDateTime]);

  const orderedResults = useMemo(() => {
    if (!utcDate) return [];

    const sorted = PLACES.map((place) => ({
      ...place,
      display: formatDisplay(utcDate, place.timeZone),
      sortKey: getSortKey(utcDate, place.timeZone),
    })).sort((a, b) => a.sortKey - b.sortKey || a.label.localeCompare(b.label));

    const withoutSpain = sorted.filter((p) => p.label !== "España");
    const spain = sorted.find((p) => p.label === "España");
    return spain ? [...withoutSpain, spain] : sorted;
  }, [utcDate]);

  const selectedResults = useMemo(() => {
    return orderedResults.filter((item) => selectedLabels.includes(item.label));
  }, [orderedResults, selectedLabels]);

  const whatsappText = useMemo(() => buildWhatsAppText(selectedResults), [selectedResults]);

  const toggleLabel = (label) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleCopy = async () => {
    const textToCopy = textAreaRef.current?.value || whatsappText;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        textAreaRef.current?.focus();
        textAreaRef.current?.select();
        textAreaRef.current?.setSelectionRange(0, textToCopy.length);
        document.execCommand("copy");
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        textAreaRef.current?.focus();
        textAreaRef.current?.select();
        textAreaRef.current?.setSelectionRange(0, textToCopy.length);
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        setCopied(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <Clock3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Horarios locales por país
            </h1>
            <p className="mt-1 text-sm text-slate-600 md:text-base">
              La hora de referencia es siempre New York. Ingresás fecha y hora de NYC y la app calcula el resto.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Hora de referencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="datetime">Fecha y hora de New York</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={inputDateTime}
                  onChange={(e) => setInputDateTime(e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                Esta fecha y hora corresponde a <span className="font-semibold">New York</span>.
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-text">Texto copiable para WhatsApp</Label>
                <textarea
                  ref={textAreaRef}
                  id="whatsapp-text"
                  readOnly
                  value={whatsappText}
                  className="w-full h-64 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
                />
                <button
                  onClick={handleCopy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowUpDown className="h-4 w-4" />
                Países para incluir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {orderedResults.map((item) => {
                  const active = selectedLabels.includes(item.label);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleLabel(item.label)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {selectedResults.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                  >
                    <div>
                      <div className="text-sm text-slate-500">#{index + 1}</div>
                      <div className="text-base font-medium text-slate-900">{item.label}</div>
                    </div>
                    <div className="text-right text-base text-slate-700">{item.display} h</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
