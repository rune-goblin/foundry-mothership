import { formatAction } from '../../../../module/chat/enrichers.ts';
import { CONDITIONS } from '../../../../content/books/psg/conditions.ts';
import { HOTBAR_MACROS, isConditionMacro, TRIGGERED_MACROS } from '../../../../content/books/psg/macros.ts';
import type { ContentRecord, PackDefinition } from '../../record.ts';
import { html, PACKS } from './uuid.ts';

const SOURCE = 'content/books/psg';
const CONDITION_ICON = 'systems/mothershiprpg/images/icons/ui/conditions';

const CONDITIONS_PACK: PackDefinition = {
  ...PACKS.conditions,
  documentType: 'Item',
  load: (): ContentRecord[] =>
    CONDITIONS.map((condition) => ({
      contentId: condition.id,
      name: condition.name,
      img: `${CONDITION_ICON}/${condition.icon}`,
      body: {
        kind: 'Item',
        type: 'condition',
        system: {
          // The action renders as a button by itself (chat/enrichers.ts) — its label comes from
          // `actionLabel` at render time, so the book's macro-name restatement (audit C10) is gone.
          description: html(condition.text, ...condition.actions.map(formatAction)),
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
  load: (): ContentRecord[] =>
    TRIGGERED_MACROS.map((macro) => ({
      contentId: macro.contentId,
      name: macro.name,
      img: macro.img,
      body: {
        kind: 'Macro',
        type: 'script',
        scope: 'global',
        // The slug is the whole address: `applyCondition` resolves it through `CONDITION_IDS`, so
        // no macro command carries a bare document id any more (audit C2).
        command: isConditionMacro(macro)
          ? `game.mothershiprpg.applyCondition('${macro.condition}', ${macro.severity});`
          : macro.command,
      },
      provenance: { source: `${SOURCE}/macros.ts`, sourceId: macro.contentId },
    })),
};

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
