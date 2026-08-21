# Archived translations

`pt-BR.json` was the Brazilian Portuguese translation. It shipped until 2026-08-21, when it was
pulled out of the system: `lang/` now holds `en.json` alone, `system.json` declares one language,
and `test/lang-keys.test.ts` and `test/generator.test.ts` assert against English only.

Nothing here is loaded, built, or tested. The file is kept verbatim so the translation can come
back without being retyped; it is stale from the moment `lang/en.json` next changes.

To restore: move the file back to `lang/`, re-add the `pt-BR` entry to `system.json`'s
`languages`, and restore the Portuguese assertions in the two specs (`git log -S'pt-BR'` finds
the commit that removed them).
