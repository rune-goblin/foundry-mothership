/**
 * The dotted address a macro passes — `'system.other.stress.value'` — parsed once and resolved
 * against the field it names. The string stays the boundary because 39 shipped macros carry it;
 * everything past this module is typed (audit F12).
 *
 * **The pod contract.** `module/data/actor-models.js` never stores a tracked number bare: it
 * wraps it in a `SchemaField` beside the bounds and the label that describe it. Three shapes
 * exist, and the difference is real rather than incidental:
 *
 * - **bounded** `{value, min, max, label}` — `health`, `hits`, `netHP`, `other.stress`, and every
 *   entry of `stats`, which carries further siblings the bounds do not care about.
 * - **floored** `{value, min, label}` — `bleeding` alone: severity has no ceiling.
 * - **bare** `{value}` — `xp`, `attributes.level`, `swarm.combat`, and the four string pods
 *   `class`, `rank`, `pronouns`, `credits` plus `other.stressdesc`.
 *
 * So "has a maximum" is a property of the pod, not of the convention, and a resolved field says
 * which bounds it actually has instead of assuming four siblings exist.
 */

export type PodLeaf = 'value' | 'min' | 'max';

const POD_LEAVES: readonly string[] = ['value', 'min', 'max'];

const ROOT = 'system';

export interface FieldAddress {
  /** The canonical dotted path, which is what an update payload is keyed by. */
  readonly path: string;
  readonly podPath: string;
  /** The pod's own key — `health`, `stress`, `body` — which is what the rules dispatch on. */
  readonly pod: string;
  readonly leaf: PodLeaf;
}

export type AddressFault = 'malformed' | 'missing' | 'not-a-number';

/** A bad address is an error, never a zero: silently discarding a write is this repo's bug. */
export class AddressError extends Error {
  readonly address: string;
  readonly fault: AddressFault;

  constructor(address: string, fault: AddressFault, detail: string) {
    super(`${address}: ${detail}`);
    this.name = 'AddressError';
    this.address = address;
    this.fault = fault;
  }
}

export function parseFieldAddress(address: string): FieldAddress {
  const path = String(address ?? '').trim();
  const segments = path.split('.');
  const leaf = segments[segments.length - 1];

  if (segments.length < 3 || segments[0] !== ROOT || segments.some((segment) => segment === '')) {
    throw new AddressError(path, 'malformed', `not a ${ROOT}.<pod>.<leaf> address`);
  }
  if (!POD_LEAVES.includes(leaf)) {
    throw new AddressError(path, 'malformed', `${leaf} is not one of ${POD_LEAVES.join(', ')}`);
  }

  const podPath = segments.slice(0, -1).join('.');
  return { path, podPath, pod: segments[segments.length - 2], leaf: leaf as PodLeaf };
}

export interface Bounds {
  readonly min: number | null;
  readonly max: number | null;
}

const UNBOUNDED: Bounds = { min: null, max: null };

export interface FieldRef {
  readonly address: FieldAddress;
  readonly value: number;
  readonly bounds: Bounds;
  readonly label: string | null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function podOf(system: unknown, address: FieldAddress): Record<string, unknown> {
  let node: unknown = system;
  for (const segment of address.podPath.split('.').slice(1)) {
    if (typeof node !== 'object' || node === null) {
      throw new AddressError(address.path, 'missing', `${address.podPath} is not on this document`);
    }
    node = (node as Record<string, unknown>)[segment];
  }
  if (typeof node !== 'object' || node === null) {
    throw new AddressError(address.path, 'missing', `${address.podPath} is not on this document`);
  }
  return node as Record<string, unknown>;
}

/** The pod's numbers, read out of a document's system data. Throws rather than guess. */
export function resolveField(system: unknown, address: FieldAddress): FieldRef {
  const pod = podOf(system, address);
  const raw = pod[address.leaf];

  if (raw === undefined) {
    throw new AddressError(address.path, 'missing', `${address.pod} has no ${address.leaf}`);
  }
  const value = numberOrNull(raw);
  if (value === null) {
    throw new AddressError(address.path, 'not-a-number', `${address.leaf} holds ${typeof raw}`);
  }

  return {
    address,
    value,
    // A bound is not itself bounded — `min` and `max` describe `value`. Legacy clamped
    // `…stress.max` against itself, so an effect raising it could never take effect.
    bounds:
      address.leaf === 'value'
        ? { min: numberOrNull(pod.min), max: numberOrNull(pod.max) }
        : UNBOUNDED,
    label: typeof pod.label === 'string' ? pod.label : null,
  };
}

export interface FieldChange {
  readonly path: string;
  readonly from: number;
  readonly to: number;
}

/** One update payload, built from computed keys — never `JSON.parse` on a string (audit F12). */
export function updateData(changes: readonly FieldChange[]): Record<string, number> {
  const data: Record<string, number> = {};
  for (const change of changes) data[change.path] = change.to;
  return data;
}
