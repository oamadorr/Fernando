# Repository Guidelines

## Project Structure & Modules
- `index.html`: front-end single-page app; core logic, Firebase sync, UI.
- `import-backup-to-firebase.js`, `export-complete-backup.js`: Node scripts for importing/exporting Firestore backups.
- `tests/`, `test-*.js`: Playwright/Node helpers to validate backups and restoration flows.
- `backup-*.json`, `localstorage-backup-*.json`: backup artifacts (ignored by Git; keep locally).
- `.firebase/`: service account key (ignored) for admin scripts.

## Build, Test & Development
- Instalar deps: `npm install`.
- Rodar local (estático): abrir `index.html` no navegador ou servir com `npx http-server .`.
- Exportar backup completo: `node export-complete-backup.js`.
- Importar backup: `node import-backup-to-firebase.js <arquivo.json> [arquivo-detalhado.json]`.
- Teste de restauração (UI automatizada): `node test-restore-version.js`.

## Coding Style & Naming
- JS/CSS/HTML em arquivos únicos (preferir funções puras e helpers curtos).
- Indentação 4 espaços; strings em aspas duplas no front; preferir `const`/`let` no lugar de `var`.
- Nome de scripts utilitários: `verbo-acao.js` (ex.: `check-history-detailed.js`).
- Backups: `backup-completo-YYYY-MM-DD.json`, `backup-linhas-vida-YYYY-MM-DD.json`.

## Testing Guidelines
- Scripts de teste em Node/Playwright; executar com `node <arquivo>.js`.
- Use dados de teste em backups locais; não rodar contra produção sem credenciais válidas.
- Antes de salvar no Firebase, sanitizar (já há helpers internos).

## Commit & Pull Request
- Mensagens curtas em inglês, imperativo: `Add`, `Fix`, `Cleanup`.
- Agrupe mudanças lógicas; evite commitar `node_modules`, chaves ou backups.
- Em PRs: descreva objetivo, passos de teste (comando + resultado) e cite backups usados se aplicável.

## Security & Config
- Nunca versione `.firebase/serviceAccountKey.json` ou `.env`.
- Verifique sandbox de rede antes de rodar scripts que acessam o Firebase.
- Em modo offline, a UI fica read-only; edições exigem conexão ativa e autenticação.
