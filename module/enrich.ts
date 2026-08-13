/**
 * Stored rich text on its way into a window. Chat enriches message content itself, so only the
 * dialogs need this: a skill's description reaches the roll prompt with its links resolved
 * instead of as the raw HTML legacy pasted into a template string (audit F23).
 */

declare const foundry:
  | {
      readonly applications: {
        readonly ux: {
          readonly TextEditor: {
            readonly implementation: { enrichHTML(html: string): Promise<string> };
          };
        };
      };
    }
  | undefined;

export async function enrich(html: string): Promise<string> {
  const text = String(html ?? '');
  if (typeof foundry === 'undefined' || text === '') return text;
  return await foundry.applications.ux.TextEditor.implementation.enrichHTML(text);
}
