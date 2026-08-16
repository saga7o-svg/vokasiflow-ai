export type DemandPoint = { period: string; total: number };

export type ForecastResult = {
  key: string;
  competency: string;
  location: string;
  history: DemandPoint[];
  forecast: DemandPoint[];
  growthPct: number | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  sufficient: boolean;
};

export function periodKey(period: string): number {
  const match = /^(\d{4})-S(\d)$/.exec(period);
  if (!match) return 0;
  return Number(match[1]) * 10 + Number(match[2]);
}

export function nextPeriod(period: string): string {
  const match = /^(\d{4})-S(\d)$/.exec(period);
  if (!match) return period;
  const year = Number(match[1]);
  const semester = Number(match[2]);
  return semester === 1 ? `${year}-S2` : `${year + 1}-S1`;
}

function linearRegression(values: number[]): { intercept: number; slope: number } {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { intercept: meanY - slope * meanX, slope };
}

export function forecastSeries(
  competency: string,
  location: string,
  points: DemandPoint[],
  horizon = 4,
): ForecastResult {
  const history = [...points].sort((a, b) => periodKey(a.period) - periodKey(b.period));
  const key = `${competency}__${location}`;
  if (history.length < 3) {
    return {
      key,
      competency,
      location,
      history,
      forecast: [],
      growthPct: null,
      confidence: "LOW",
      sufficient: false,
    };
  }

  const { intercept, slope } = linearRegression(history.map((p) => p.total));
  const forecast: DemandPoint[] = [];
  let period = history[history.length - 1]!.period;
  for (let i = 0; i < horizon; i++) {
    period = nextPeriod(period);
    const value = intercept + slope * (history.length - 1 + i + 1);
    forecast.push({ period, total: Math.max(0, Math.round(value)) });
  }

  const last = history[history.length - 1]!.total;
  const projected = forecast[forecast.length - 1]!.total;
  const growthPct = last === 0 ? null : Math.round(((projected - last) / last) * 1000) / 10;
  const confidence = history.length >= 8 ? "HIGH" : history.length >= 5 ? "MEDIUM" : "LOW";

  return { key, competency, location, history, forecast, growthPct, confidence, sufficient: true };
}

export function groupDemand(
  rows: { competency: string; location: string; period: string; requested_quota: number }[],
): Map<string, { competency: string; location: string; points: Map<string, number> }> {
  const groups = new Map<string, { competency: string; location: string; points: Map<string, number> }>();
  for (const row of rows) {
    const key = `${row.competency}__${row.location}`;
    let group = groups.get(key);
    if (!group) {
      group = { competency: row.competency, location: row.location, points: new Map() };
      groups.set(key, group);
    }
    group.points.set(row.period, (group.points.get(row.period) ?? 0) + row.requested_quota);
  }
  return groups;
}

export function toPoints(points: Map<string, number>): DemandPoint[] {
  return [...points.entries()].map(([period, total]) => ({ period, total }));
}
