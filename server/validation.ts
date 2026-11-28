export function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function onlyKeys(value: unknown, allowed: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).every(key => allowed.includes(key));
}

export function text(value: unknown, max: number, min = 1): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max;
}

export function numberInRange(value: unknown, max: number, min = 0): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
