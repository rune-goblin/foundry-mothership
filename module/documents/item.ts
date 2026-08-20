import {
  ammoState,
  planFire,
  planReload,
  type FireOutcome,
  type ReloadOutcome,
} from '../inventory/ammo.ts';

// A subset of Foundry's `Item`; the global supplies the rest at runtime.
interface ItemDocument {
  readonly id: string | null;
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly system: unknown;
  update(data: Record<string, unknown>): Promise<unknown>;
}

declare const Item: new (...args: never[]) => ItemDocument;

// Data only — the chat layer owns the markup.
export interface ItemCard {
  readonly itemId: string | null;
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly description: string;
  // An ability's roll expression, evaluated and printed beside the description.
  readonly roll: string | null;
}

function text(system: unknown, key: string): string {
  const fields = (typeof system === 'object' && system !== null ? system : {}) as Record<string, unknown>;
  return typeof fields[key] === 'string' ? (fields[key] as string) : '';
}

export class MothershipItem extends Item {
  // Only the attack path calls this — a damage roll never does.
  async fire(): Promise<FireOutcome> {
    const outcome = planFire(ammoState(this.system));
    if (outcome.spent > 0) await this.update({ 'system.curShots': outcome.curShots });
    return outcome;
  }

  async reload(): Promise<ReloadOutcome> {
    const outcome = planReload(ammoState(this.system));
    if (outcome.status === 'reloaded') {
      await this.update({ 'system.curShots': outcome.curShots, 'system.ammo': outcome.ammo });
    }
    return outcome;
  }

  toChat(): ItemCard {
    return {
      itemId: this.id,
      name: this.name,
      img: this.img,
      type: this.type,
      description: text(this.system, 'description'),
      roll: text(this.system, 'roll') || null,
    };
  }
}
