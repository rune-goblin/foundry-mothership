# Comment discipline

Paste the block below at the start of a session. `~/.claude/CLAUDE.md` already carries the rule;
what it does not carry is the reason the rule keeps losing here, which is the first paragraph.

---

**Comment discipline for this repo. This overrides your instinct to match surrounding style.**

This codebase is densely commented — long file headers, multi-paragraph rationale, audit
references. **That is history, not the target.** Those comments record a migration and an audit
that are finished. Do not pattern-match their density. `~/.claude/CLAUDE.md` is the rule, and it
wins:

> Write NO comment unless the WHY is non-obvious — a hidden constraint, a race guard, a workaround
> for a specific bug, or behavior that would otherwise read like a mistake. Never restate what the
> code already says.

**The test for every comment you're about to write:** delete it, and ask whether a competent reader
would now reach a wrong conclusion or waste real time rediscovering something. If not, leave it
deleted. Most code needs none.

**Never write:**

- A file-header docstring on a new file.
- A doc comment on a function, type or interface whose name and signature already say it.
  `/** The band a weapon's damage belongs to. */` above `function rangeLabel(item)` is noise.
- `@param` / `@returns` — the types carry it.
- A comment above a `describe` or `it` — the test name is the documentation.
- Design rationale, alternatives considered, or what the code used to be. That belongs in the
  commit message.

**Do write** — one line, at the site:

- A trap that will be stepped on again: `The wrapper stays: roll-image sets flex: 0 24px, so as a
  direct flex item the image renders at 24px.`
- A non-obvious constraint: `Str/10 is the book's shorthand, not a formula — a button has to carry
  dice Foundry can roll.`
- A deliberate-looking mistake: `stopPropagation keeps the sheet from also submitting the form
  around it.`

Two lines maximum, and only when one won't fit.

**Before you report any edit as done:** re-read every comment in your diff and delete the ones that
fail the test above. Expect to delete more than half of what you first wrote. If your diff adds more
than a couple of comment lines per fifty lines of code, you have over-commented — cut again.

---

## Cleaning up existing comments instead

Append to the block above:

> Apply this to the comments in `<path>`. Change no code — comments only. Run `npm test`
> afterwards, since some tests assert on source text.

That last clause matters: `test/checks-damage.test.ts` greps `module/checks/damage.ts`'s own source
for forbidden identifiers, so a comment edit there can fail a test.

## Making it stick without pasting

The project `CLAUDE.md` currently says only *"Code style: global `~/.claude/CLAUDE.md` — comment
only the non-obvious why"*. That one line is outweighed by a thousand counter-examples in the code
itself. Moving the first paragraph above into `CLAUDE.md` — the part naming the existing comments
as history rather than as the target — is what would make it hold without a paste.
