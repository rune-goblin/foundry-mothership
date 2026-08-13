import { CONDITIONS } from '../../../../content/books/psg/conditions.ts';
import { HOTBAR_MACROS, isConditionMacro, TRIGGERED_MACROS } from '../../../../content/books/psg/macros.ts';
import type { ContentRecord, IdLookup, PackDefinition } from '../../record.ts';
import { html, link, PACKS, uuid } from './uuid.ts';

const SOURCE = 'content/books/psg';
const CONDITION_ICON = 'systems/mothershiprpg/images/icons/ui/conditions';

/** The macro label the shipped conditions used: "Fear Save -" reads as "Fear Save [-]" in prose. */
const MACRO_LABEL: Record<string, string> = {
  'fear-save': 'Fear Save',
  'fear-save-minus': 'Fear Save [-]',
  'rest-save-minus': 'Rest Save [-]',
  'panic-check-minus': 'Panic Check [-]',
  'plus-1-stress': '+1 Stress',
  'plus-1d5-stress': '+1d5 Stress',
  'take-bleeding-damage': 'Take Bleeding Damage',
};

const CONDITIONS_PACK: PackDefinition = {
  ...PACKS.conditions,
  documentType: 'Item',
  load: (ids: IdLookup): ContentRecord[] =>
    CONDITIONS.map((condition) => ({
      contentId: condition.id,
      name: condition.name,
      img: `${CONDITION_ICON}/${condition.icon}`,
      body: {
        kind: 'Item',
        type: 'condition',
        system: {
          description: html(
            condition.text,
            ...condition.macros.map((id) => link(ids, 'triggered', id, MACRO_LABEL[id] ?? id)),
          ),
          severity: 1,
          treatment: { value: 0 },
          modifiers: condition.modifiers.map(({ modifier, scope }) => ({ modifier, scope })),
        },
      },
      // The panic result that grants it, not a page: the book states the condition inside the
      // Panic table's text, and has no conditions list of its own.
      provenance: { source: `${SOURCE}/conditions.ts`, sourceId: condition.id },
    })),
};

const TRIGGERED: PackDefinition = {
  ...PACKS.triggered,
  documentType: 'Macro',
  load: (ids: IdLookup): ContentRecord[] =>
    TRIGGERED_MACROS.map((macro) => ({
      contentId: macro.contentId,
      name: macro.name,
      img: macro.img,
      body: {
        kind: 'Macro',
        type: 'script',
        scope: 'global',
        command: isConditionMacro(macro)
          ? `game.mothershiprpg.initModifyItem('${idOf(ids, macro.condition)}',${macro.severity});`
          : macro.command,
      },
      provenance: { source: `${SOURCE}/macros.ts`, sourceId: macro.contentId },
    })),
};

/** `initModifyItem` takes a bare `_id` and resolves it across compendia — see mosh.js fromIdUuid. */
function idOf(ids: IdLookup, condition: string): string {
  return uuid(ids, 'conditions', condition).split('.').pop()!;
}

const HOTBAR: PackDefinition = {
  ...PACKS.hotbar,
  documentType: 'Macro',
  load: (): ContentRecord[] =>
    HOTBAR_MACROS.map((macro) => ({
      contentId: macro.contentId,
      name: macro.name,
      img: macro.img,
      body: { kind: 'Macro', type: 'script', scope: 'global', command: macro.command },
      provenance: { source: `${SOURCE}/macros.ts`, sourceId: macro.contentId },
    })),
};

export const DOCUMENT_PACKS = [CONDITIONS_PACK, TRIGGERED, HOTBAR];
