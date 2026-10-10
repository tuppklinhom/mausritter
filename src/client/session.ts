/** Per-browser identity and GM keys. Wrapped in try/catch: storage can be blocked. */

const PID_KEY = "mt.pid";
const NAME_KEY = "mt.name";
const GM_KEYS = "mt.gmKeys";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

let memoPid: string | null = null;

export function playerId(): string {
  if (memoPid) return memoPid;
  memoPid = read(PID_KEY) ?? crypto.randomUUID();
  write(PID_KEY, memoPid);
  return memoPid;
}

export const savedName = () => read(NAME_KEY) ?? "";
export const saveName = (name: string) => write(NAME_KEY, name);

function gmKeys(): Record<string, string> {
  try {
    return JSON.parse(read(GM_KEYS) ?? "{}");
  } catch {
    return {};
  }
}

export const gmKeyFor = (code: string) => gmKeys()[code];

export function saveGmKey(code: string, key: string) {
  write(GM_KEYS, JSON.stringify({ ...gmKeys(), [code]: key }));
}
