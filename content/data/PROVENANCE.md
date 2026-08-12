# Vendored: `mothership-data`

`*.json` here and in `schema/` are a byte-identical copy of `data/` and `schema/` from
**`runegoblin/modules/mothership-data`** — a Python pipeline that extracts the Mothership
*Player's Survival Guide* v1.2 to validated JSON. Nothing in this directory is edited by hand.
Fix a defect upstream and re-sync.

## The copy

| | |
|---|---|
| Vendored on | 2026-08-12 |
| Upstream path | `runegoblin/modules/mothership-data` (sibling of this repo) |
| Upstream revision | **none — the upstream is not under version control** (see below) |
| Files | 19 data + 20 schema |
| Bytes | 171,363 |
| Digest of `CHECKSUMS` content | `420e76133a06cff7a7656904736d35032008dcdb4236ae0d8fb3fbfef4d7e74f` |

`CHECKSUMS` holds a `sha256  path` line per file, sorted. `scripts/sync-content.ts` compares
against it and refuses to overwrite a local edit it cannot explain.

## No upstream commit hash

The plan asks for the source commit. There is none to record: `mothership-data` has no `.git`
directory, so the copy cannot be pinned to a revision. The per-file SHA-256 digests in
`CHECKSUMS` stand in — they identify the exact bytes copied, which is what the pin was for, but
they cannot tell you *when* upstream changed or *why*. Put `mothership-data` under version
control and this table gains a real revision.

## Why vendored rather than a submodule

The build must be reproducible from this repo alone: a fresh clone runs `npm ci && npm run build`
with no Python toolchain, no second checkout, and no network. 171 KB of reviewable JSON is
cheaper than a cross-repo dependency, and CI never reaches outside this repo. The cost is
double-commit drift when upstream changes — `sync-content.ts` exists to make that a one-command,
diff-reviewed step. `docs/plans/architecture.md` Decision 6 records this as the least-certain
call in its section; a submodule is the fallback if the drift proves annoying.

## Licence

Transcribed from the published book, so no third-party *code* licence reaches it. It answers to
Tuesday Knight Games' third-party policy like the rest of this system — `MODERNIZATION.md` §19.
