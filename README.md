# Sistema de Gestão - Linhas de Vida

Sistema web para gerenciamento da instalação de linhas de vida nas usinas hidrelétricas Pimental e Belo Monte.

**Desenvolvido para:** Thommen Engenharia • Norte Energia

## Acesso ao Sistema

- **Arquivo principal:** `index.html`
- **Vercel Deploy:** https://linhasdevida.vercel.app ✅
- **GitHub Pages:** Em configuração

## Funcionalidades

- Dashboard com métricas de progresso
- Tabelas interativas com filtros e busca
- Sistema de notificações toast
- Relatórios PDF e Excel completos
- Coluna de data de execução
- Sincronização Firebase em tempo real

## Smoke Playwright (deploy público)

- Arquivo de teste: `tests/smoke-public.spec.cjs`
- Requer variáveis: `SMOKE_URL` (ex.: https://linhasdevida.vercel.app), `SMOKE_PASSWORD` (padrão `thommen2025`), `SMOKE_PROJECT_ID` (opcional, define o doc no Firebase).
- Execução:
  - Com npm script (Chromium headed): `SMOKE_URL="https://linhasdevida.vercel.app" SMOKE_PROJECT_ID="smoke-$(date +%s)" npm run smoke:public`
  - Direto: `SMOKE_URL="..." SMOKE_PASSWORD="..." SMOKE_PROJECT_ID="..." npx playwright test tests/smoke-public.spec.cjs --browser=chromium`
- O teste é pulado se `SMOKE_URL` não estiver definida.
- Artefatos: screenshots e vídeos são salvos em `test-results/` apenas em caso de falha; traces permanecem ativados no primeiro retry.

## Tecnologias

- HTML5, CSS3, JavaScript (Vanilla)
- Chart.js, jsPDF, SheetJS, Font Awesome
- Firebase Firestore
- Responsive Design

---

_Sistema atualizado em 16/09/2025_

# Deploy Test - Tue Sep 16 10:15:59 -03 2025

# Deploy test - Tue Sep 16 14:44:56 -03 2025
