/** Only dialogs need this — chat enriches message content itself. */

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
