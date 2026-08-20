export type PodLeaf = 'value' | 'min' | 'max';

const POD_LEAVES: readonly string[] = ['value', 'min', 'max'];

const ROOT = 'system';

export interface FieldAddress {
  readonly path: string;
  readonly podPath: string;
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
    // A bound isn't itself bounded: min/max describe value only, else raising max could
    // never take effect (it would clamp against itself).
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

export function updateData(changes: readonly FieldChange[]): Record<string, number> {
  const data: Record<string, number> = {};
  for (const change of changes) data[change.path] = change.to;
  return data;
}
