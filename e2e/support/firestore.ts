// Minimal Firestore emulator client (REST). `Bearer owner` bypasses security rules for seeding and assertions;
// the app itself still goes through firestore.rules.
const PROJECT_ID = 'demo-khitma';
const EMULATOR = 'http://127.0.0.1:8080';
const DOCUMENTS = `${EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const ADMIN_HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

type FirestoreValue = Record<string, unknown>;

function toValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: toFields(value as Record<string, unknown>) } };
}

function toFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toValue(value)]));
}

function fromValue(value: any): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromValue);
  if ('mapValue' in value) return fromFields(value.mapValue.fields ?? {});
  throw new Error(`Unsupported Firestore value: ${JSON.stringify(value)}`);
}

function fromFields(fields: Record<string, unknown>): Record<string, any> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromValue(value)]));
}

export async function resetFirestore(): Promise<void> {
  const res = await fetch(`${EMULATOR}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Emulator reset failed: ${res.status} ${await res.text()}`);
}

export async function setDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${DOCUMENTS}/${path}`, {
    method: 'PATCH',
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`setDoc(${path}) failed: ${res.status} ${await res.text()}`);
}

export async function getDoc<T = Record<string, any>>(path: string): Promise<(T & { id: string }) | null> {
  const res = await fetch(`${DOCUMENTS}/${path}`, { headers: ADMIN_HEADERS });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getDoc(${path}) failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { id: String(json.name).split('/').pop(), ...fromFields(json.fields ?? {}) } as T & { id: string };
}

export async function listDocs(collection: string): Promise<Array<Record<string, any>>> {
  const res = await fetch(`${DOCUMENTS}/${collection}?pageSize=300`, { headers: ADMIN_HEADERS });
  if (!res.ok) throw new Error(`listDocs(${collection}) failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.documents ?? []).map((doc: any) => ({
    id: String(doc.name).split('/').pop(),
    ...fromFields(doc.fields ?? {}),
  }));
}
