## Sobre este projeto

Loja LOLA, Fase 1 (varejo). A arquitetura tem como referência a loja anterior da
operação (não versionada aqui; o zip fica em `reference/`, ignorado pelo lint).
Acesso ao banco: catálogo
por query direta (RLS libera `SELECT` anônimo), o resto por RPCs `SECURITY DEFINER`.
Admin por senha única em cookie. Detalhes em `docs/superpowers/specs/` e
`docs/superpowers/plans/`. Setup, deploy e QA em `README.md` e `docs/QA-fase1.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
