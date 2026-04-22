# PROJECT AUDIT

## 1. Visão geral do projeto

| Item | Identificação |
|---|---|
| Nome do projeto | `cha-jose-augusto`, identificado em `package.json`. |
| Objetivo principal | Sistema digital para o evento "Chá do José Augusto", com álbum colaborativo, mural, mensagens, brincadeiras, RSVP, loja/lista de presentes, painel administrativo e exibição em TV. |
| Tipo de sistema | Aplicação web de evento, com PWA, painel admin, galeria social, recursos interativos e APIs próprias. |
| Público-alvo aparente | Convidados do evento, familiares/organizadores e administrador do evento. |
| Problema resolvido | Centraliza fotos, vídeos, mensagens, votações, brincadeiras, confirmação de presença, pedidos/presentes, moderação e exibição ao vivo em uma experiência única. |
| Estado atual | Intermediário/avançado em funcionalidades, porém com dívida técnica relevante: arquivos grandes, APIs heterogêneas, schema SQL incompleto em relação ao runtime, pouca separação de camadas e pontos de segurança que precisam de correção. |

Observações:

- O produto é funcionalmente amplo e já possui integrações com Cloudflare D1, R2, PWA, push notifications, SSE, processamento de mídia e painel administrativo.
- A arquitetura cresceu de forma prática, mas vários módulos concentram responsabilidades demais, principalmente `lib/db.ts`, `components/admin/AdminClient.tsx`, `app/page.tsx` e `components/home/UploadModal.tsx`.
- Não foram identificados testes automatizados no `package.json`.

## 2. Stack tecnológica identificada

| Categoria | Identificado | Onde foi identificado | Observações |
|---|---|---|---|
| Framework principal | Next.js 14.2.20 | `package.json`, pasta `app/` | Usa App Router com rotas em `app/**/page.tsx` e APIs em `app/api/**/route.ts`. |
| Linguagem | TypeScript + JavaScript permitido | `tsconfig.json` | `strict: true`, `allowJs: true`, alias `@/*`. |
| Runtime frontend | React 18.3.0 | `package.json` | Uso intenso de Client Components com `'use client'`. |
| UI framework | Não identificado claramente | Não há Tailwind, MUI, Chakra ou similar em `package.json` | UI é feita com CSS global, CSS modules/inline styles e componentes próprios. |
| Animações | `framer-motion` | `package.json` | Usado para interações visuais em páginas/componentes. |
| Ícones | Não identificado claramente como biblioteca dedicada | `package.json` | Ícones parecem ser tratados via CSS/texto/componentes próprios em vários pontos. |
| Gerenciamento de estado | React state/context | `contexts/GeoAccessContext.tsx`, `contexts/UploadContext.tsx` | Não há Redux/Zustand/Jotai identificado. |
| Formulários | React controlado/manual | Páginas e componentes como `components/home/UploadModal.tsx`, `components/admin/AdminClient.tsx` | Não há React Hook Form/Formik identificado. |
| Validação | Manual, por endpoint/componente | APIs em `app/api/**/route.ts`, `lib/media-processor.ts` | Não há Zod/Yup identificado. Validações por tamanho, tipo, comprimento e campos obrigatórios. |
| ORM | Nenhum ORM identificado | `package.json`, `lib/db.ts` | Acesso ao D1 é feito por HTTP API da Cloudflare em `lib/db.ts`. |
| Banco de dados | Cloudflare D1 | `wrangler.toml`, `schema.sql`, `lib/db.ts` | `schema.sql` cobre parte das tabelas; `lib/db.ts` cria várias tabelas em runtime. |
| Storage de mídia | Cloudflare R2 via S3 API | `wrangler.toml`, `lib/r2.ts`, `app/api/upload/route.ts` | Usa `@aws-sdk/client-s3` e `@aws-sdk/lib-storage`. |
| Autenticação admin | Cookie simples `cha_admin=ok` + senha | `lib/auth.ts`, `app/api/admin/login/route.ts` | Cookie é `httpOnly`, `sameSite=lax`, `secure` em produção. Não há sessão assinada/JWT. |
| Proteção de rotas admin | Helper `isAuthenticated` nas APIs admin | `lib/auth.ts`, `app/api/admin/**/route.ts` | A proteção está nos endpoints admin; a página `/admin` renderiza login/client. |
| Sistema de rotas | Next App Router | `app/` | Rotas frontend por `page.tsx`, backend por `route.ts`. |
| Requisições HTTP | `fetch` nativo | Componentes e APIs | Não há Axios identificado. |
| Build | Next build | `package.json` | Script `build: next build`. |
| Testes | Não identificado | `package.json` | Não há Jest/Vitest/Playwright/Cypress nos scripts/dependências. |
| Lint/format | Next lint implícito no build; config dedicada não identificada | `package.json` | Não foram identificados ESLint/Prettier próprios no levantamento. |
| PWA | Service worker manual + manifest | `public/sw.js`, `public/sw-register.js`, `app/manifest.ts`, `app/layout.tsx` | Suporta cache, atualização de SW, push e fila offline de upload. |
| Tempo real | SSE + fallback por polling/R2 | `app/api/stream/route.ts`, `app/api/realtime/route.ts`, `components/tv/TVClient.tsx` | `/api/stream` mantém conexão curta e clientes reconectam. |
| Processamento de imagem | `sharp` no servidor, canvas/heic2any no cliente | `app/api/upload/route.ts`, `lib/media-processor.ts` | Gera WebP, thumbnails e variantes. |
| Push notifications | `web-push` | `package.json`, `lib/push.ts`, `app/api/push/**` | Requer VAPID em variáveis de ambiente. |
| Infra/deploy | Cloudflare Pages/Workers, D1, R2 | `wrangler.toml` | Binding D1 `DB`, bucket R2 `jose-augusto`. |
| Serviços externos | Cloudflare D1, R2, Cloudflare AI moderation | `lib/db.ts`, `lib/r2.ts`, `app/api/upload/route.ts` | Moderação AI aparece no upload de imagens. |

## 3. Estrutura de pastas

| Caminho | Função identificada | Observações |
|---|---|---|
| `app/` | Rotas frontend, layouts, APIs e arquivos especiais do App Router | Concentra páginas e backend serverless. |
| `app/api/` | Endpoints HTTP do sistema | Há muitos handlers diretos, com pouca camada de controller/service formal. |
| `app/admin/` | Página do painel administrativo | Página carrega `components/admin/AdminClient.tsx` dinamicamente. |
| `components/` | Componentes de interface reutilizáveis e específicos de páginas | Contém componentes grandes e muito acoplados, como `AdminClient`, `FeedItem`, `PhotoBooth`, `BottomNav`. |
| `components/home/` | Componentes da home/upload/galeria | Inclui `UploadModal.tsx` e `MediaGallery.tsx`. |
| `components/admin/` | UI do painel administrativo | Principal arquivo é `AdminClient.tsx`, muito grande. |
| `components/tv/` | Experiência de TV/telão | `TVClient.tsx` consome feed em tempo real/fallback. |
| `contexts/` | Contextos React globais | `GeoAccessContext.tsx` e `UploadContext.tsx`. |
| `hooks/` | Hooks customizados | Regras de UI/dados compartilhadas parcialmente. |
| `lib/` | Utilitários, persistência, storage, push, processamento, auth | `lib/db.ts` centraliza grande parte do backend; `lib/r2.ts` centraliza storage. |
| `public/` | Assets estáticos, service worker e registro do SW | Inclui `sw.js`, `sw-register.js` e imagens/manifest relacionados. |
| `scripts/` | Scripts auxiliares | `scripts/check-api-keys.mjs` verifica chaves/configuração. |
| Raiz | Configuração de projeto/deploy/banco | `package.json`, `next.config.js`, `schema.sql`, `wrangler.toml`, `tsconfig.json`. |

Inconsistências estruturais:

- `schema.sql` não representa toda a modelagem real usada em `lib/db.ts`.
- O backend não segue um padrão uniforme de controller/service/repository. Muitos endpoints fazem validação, regra e chamada de banco diretamente.
- Algumas funcionalidades possuem lógica distribuída entre página, componente, API e `lib/db.ts`, dificultando rastreio.
- Há duplicação de padrões de rate limit e acesso ao banco em alguns endpoints.
- `components/admin/AdminClient.tsx` e `lib/db.ts` são pontos de acoplamento excessivo.

## 4. Mapeamento completo de rotas

### Rotas frontend

Todas as rotas abaixo usam o layout raiz `app/layout.tsx`, salvo se indicado. Não foram identificados layouts aninhados relevantes no levantamento.

| Rota | Tipo | Arquivo responsável | Página/componente | Finalidade | Permissões/acesso | Parâmetros/query | Dependências críticas | Observações |
|---|---|---|---|---|---|---|---|---|
| `/` | Pública | `app/page.tsx` | Home principal | Entrada do evento, stories, galeria, upload, mensagem, stats, enquete/avaliação | Pode ser limitada por geofence no cliente | Query de deep link de foto via componente dedicado | `/api/photos`, `/api/stats`, `/api/settings`, `/api/stream`, contextos | Página grande e client-heavy. |
| `/admin` | Admin | `app/admin/page.tsx` | `components/admin/AdminClient.tsx` | Painel administrativo | Login por senha/cookie; APIs protegidas em servidor | Não identificado | `/api/admin/*` | Página client-side dinâmica com `ssr:false`. |
| `/album-print` | Pública/técnica | `app/album-print/page.tsx` | Página de impressão | Álbum/visualização para impressão | Não identificado claramente | Não identificado | APIs de mídia | Finalidade inferida pelo nome/rota. |
| `/bingo` | Pública | `app/bingo/page.tsx` | Página de bingo | Jogo/interação de bingo | Não identificado claramente | Não identificado | `/api/bingo` | Configuração admin por `/api/admin/bingo`. |
| `/carta` | Pública | `app/carta/page.tsx` | Página de carta | Envio/listagem de cartas/mensagens | Não identificado claramente | Não identificado | `/api/carta` | API possui rate limit próprio. |
| `/convite` | Pública | `app/convite/page.tsx` | Convite | Exibição do convite | Não identificado claramente | Não identificado | Configurações/constantes | Rota informativa. |
| `/desafios` | Pública | `app/desafios/page.tsx` | Desafios | Lista/interação de desafios | Não identificado claramente | Não identificado | `/api/desafios` | Admin configura em `/api/admin/desafios`. |
| `/diario` | Pública | `app/diario/page.tsx` | Diário | Exibição/envio de entradas de diário | Não identificado claramente | Não identificado | `/api/diario` | Admin configura em `/api/admin/diario`. |
| `/feed` | Pública | `app/feed/page.tsx` | Feed social | Listagem de fotos/vídeos, reações, comentários | Não identificado claramente | Query `author` aparente via `useSearchParams` | `/api/photos`, `/api/comments`, `/api/react` | Usuário relatou 404 anteriormente; rota existe no código. |
| `/foto/[...slug]` | Dinâmica pública | `app/foto/[...slug]/page.tsx` | Página/deep link de mídia | Abrir mídia específica | Não identificado claramente | `slug` catch-all | `/api/photos`, componentes de feed | Rota dinâmica. |
| `/livro` | Pública | `app/livro/page.tsx` | Livro de mensagens | Mensagens/livro de presença | Não identificado claramente | Não identificado | `/api/livro` | CRUD público parcial. |
| `/marcos` | Pública | `app/marcos/page.tsx` | Marcos | Marcos/eventos importantes | Não identificado claramente | Não identificado | `/api/marcos` | API permite GET/POST/DELETE. |
| `/melhores` | Pública | `app/melhores/page.tsx` | Melhores fotos | Ranking/destaques de mídia | Não identificado claramente | Não identificado | `/api/melhores` | API tem lógica própria de consulta. |
| `/mosaico` | Pública | `app/mosaico/page.tsx` | Mosaico | Grade visual de mídia | Não identificado claramente | Não identificado | `/api/photos` | Usa thumbnails/variantes de imagem. |
| `/mural` | Pública | `app/mural/page.tsx` | Mural | Cards/mural colaborativo | Não identificado claramente | Não identificado | `/api/mural-cards` | API permite GET/POST/DELETE. |
| `/musicas` | Pública | `app/musicas/page.tsx` | Músicas | Sugestões/lista musical | Não identificado claramente | Não identificado | `/api/musicas` | Admin configura/modera em `/api/admin/musicas`. |
| `/palpites` | Pública | `app/palpites/page.tsx` | Palpites | Envio/listagem de palpites | Não identificado claramente | Não identificado | `/api/palpites` | API GET/POST. |
| `/ranking` | Pública | `app/ranking/page.tsx` | Ranking | Ranking/leaderboard | Não identificado claramente | Não identificado | `/api/leaderboard`, `/api/author-stats` | Relacionado a engajamento/autores. |
| `/rsvp` | Pública | `app/rsvp/page.tsx` | RSVP | Confirmação de presença | Não identificado claramente | Não identificado | `/api/rsvp` | API GET/POST. |
| `/store` | Pública | `app/store/page.tsx` | Loja/lista | Itens/pedidos/presentes | Não identificado claramente | Não identificado | `/api/store` | Admin configura em `/api/admin/store`. |
| `/timeline` | Pública | `app/timeline/page.tsx` | Timeline | Linha do tempo visual | Não identificado claramente | Não identificado | `/api/photos` | Usa fontes de imagem/thumbnail. |
| `/tv` | Pública/telão | `app/tv/page.tsx` | `components/tv/TVClient.tsx` | Exibição em TV/telão | Não identificado claramente | Não identificado | `/api/stream`, `/api/realtime`, `/api/photos` | Tem fallback de polling. |
| `/u/[name]` | Dinâmica pública | `app/u/[name]/page.tsx` | Perfil/autor | Mídias por autor | Não identificado claramente | `name` | `/api/photos`, `/api/author-stats` | Rota dinâmica por nome. |
| `/video-mensagens` | Pública | `app/video-mensagens/page.tsx` | Página de vídeo mensagens | Gravar/enviar mensagens em vídeo | Não identificado claramente | Não identificado | `/api/video-mensagens` | Admin visualiza via dashboard, mas API possui risco descrito em Segurança. |

### Rotas backend/API

| Rota | Métodos | Tipo | Arquivo responsável | Finalidade | Permissões/acesso | Params/query relevantes | Observações |
|---|---|---|---|---|---|---|---|
| `/api/admin/announce` | POST | Admin API | `app/api/admin/announce/route.ts` | Publicar anúncio ao vivo | `isAuthenticated` | Não identificado claramente | Alimenta recursos em tempo real/config. |
| `/api/admin/approve` | GET, POST | Admin API | `app/api/admin/approve/route.ts` | Listar/aprovar/rejeitar mídia | `isAuthenticated` | Status/ids conforme handler | Central para moderação. |
| `/api/admin/bingo` | GET, POST | Admin API | `app/api/admin/bingo/route.ts` | Configurar bingo | `isAuthenticated` | Não identificado claramente | Usa funções em `lib/db.ts`. |
| `/api/admin/capsule` | GET, POST | Admin API | `app/api/admin/capsule/route.ts` | Gerenciar cápsula/mensagens | `isAuthenticated` | Não identificado claramente | Relacionado a `capsule_messages`. |
| `/api/admin/cdn` | GET | Admin API | `app/api/admin/cdn/route.ts` | Diagnóstico/URLs de CDN | `isAuthenticated` | Não identificado claramente | Apoio técnico. |
| `/api/admin/desafios` | GET, POST | Admin API | `app/api/admin/desafios/route.ts` | Configurar desafios | `isAuthenticated` | Não identificado claramente | Dados em D1. |
| `/api/admin/diario` | GET, POST | Admin API | `app/api/admin/diario/route.ts` | Gerenciar diário | `isAuthenticated` | Não identificado claramente | Dados em D1. |
| `/api/admin/enquete` | GET, POST | Admin API | `app/api/admin/enquete/route.ts` | Configurar enquete | `isAuthenticated` | Não identificado claramente | Consumido publicamente por `/api/enquete`. |
| `/api/admin/export/media` | GET | Admin API | `app/api/admin/export/media/route.ts` | Exportar dados/mídia | `isAuthenticated` | Não identificado claramente | Relatório/admin. |
| `/api/admin/export/texts` | GET | Admin API | `app/api/admin/export/texts/route.ts` | Exportar textos | `isAuthenticated` | Não identificado claramente | Relatório/admin. |
| `/api/admin/login` | POST | Auth API | `app/api/admin/login/route.ts` | Login admin | Rate limit por IP; senha | Body com senha | Fallback inseguro para `admin123` se config/env ausentes. |
| `/api/admin/logout` | POST | Auth API | `app/api/admin/logout/route.ts` | Logout admin | Cookie atual | Não identificado claramente | Limpa cookie. |
| `/api/admin/message` | GET | Admin namespace/publicável | `app/api/admin/message/route.ts` | Ler mensagem dos pais/config | Sem auth identificada | Não identificado claramente | Está sob `/admin`, mas sem proteção; dado parece público. |
| `/api/admin/musicas` | GET, POST | Admin API | `app/api/admin/musicas/route.ts` | Gerenciar músicas | `isAuthenticated` | Não identificado claramente | Dados em D1. |
| `/api/admin/settings` | GET, POST | Admin API | `app/api/admin/settings/route.ts` | Configurações gerais/senha | `isAuthenticated` | Não identificado claramente | Permite alterar senha/configurações. |
| `/api/admin/stats` | GET | Admin API | `app/api/admin/stats/route.ts` | Estatísticas admin | `isAuthenticated` | Não identificado claramente | Painel. |
| `/api/admin/store` | GET, POST | Admin API | `app/api/admin/store/route.ts` | Gerenciar loja/lista | `isAuthenticated` | Não identificado claramente | Dados em D1. |
| `/api/author-stats` | GET | Pública API | `app/api/author-stats/route.ts` | Estatísticas por autor | Público | Autor/query não identificado claramente | Ranking/perfis. |
| `/api/avaliacao` | GET, POST | Pública API | `app/api/avaliacao/route.ts` | Avaliação do evento/sistema | Público | Body/query conforme handler | Dados em D1. |
| `/api/bingo` | GET | Pública API | `app/api/bingo/route.ts` | Dados do bingo | Público | Não identificado claramente | Leitura pública. |
| `/api/capsule` | GET, POST | Pública API | `app/api/capsule/route.ts` | Cápsula de mensagens | Público | Body com autor/mensagem/imagem | Dados em `capsule_messages`. |
| `/api/carta` | GET, POST | Pública API | `app/api/carta/route.ts` | Cartas/mensagens | Público + rate limit local | Body conforme handler | Rate limiter próprio. |
| `/api/comments` | GET, POST | Pública API | `app/api/comments/route.ts` | Comentários em mídia | Público | `media_id`, `ids` | Não foi identificado rate limit consistente. |
| `/api/desafios` | GET | Pública API | `app/api/desafios/route.ts` | Listar desafios | Público | Não identificado claramente | Configurado no admin. |
| `/api/diario` | GET | Pública API | `app/api/diario/route.ts` | Listar diário | Público | Não identificado claramente | Configurado no admin. |
| `/api/download` | GET | Pública API | `app/api/download/route.ts` | Proxy/download de arquivo | Público | `url`, `filename` | Usa allowlist por CDN/R2. |
| `/api/download/favoritas` | GET | Pública API | `app/api/download/favoritas/route.ts` | Baixar favoritas | Público | Não identificado claramente | Geração de pacote/arquivo. |
| `/api/download/minhas-fotos` | GET | Pública API | `app/api/download/minhas-fotos/route.ts` | Baixar fotos por usuário | Público | Autor/query | Geração de pacote/arquivo. |
| `/api/enquete` | GET | Pública API | `app/api/enquete/route.ts` | Ler enquete ativa | Público | Não identificado claramente | Usuário relatou 404; rota existe. |
| `/api/enquete/vote` | POST | Pública API | `app/api/enquete/vote/route.ts` | Votar na enquete | Público | Body com voto | Necessita proteção anti-abuso melhor. |
| `/api/leaderboard` | GET | Pública API | `app/api/leaderboard/route.ts` | Ranking | Público | Não identificado claramente | Dados agregados. |
| `/api/livro` | GET, POST | Pública API | `app/api/livro/route.ts` | Livro de mensagens | Público | Body conforme handler | Dados em D1. |
| `/api/marcos` | GET, POST, DELETE | Pública API | `app/api/marcos/route.ts` | Marcos/linha do tempo | Público | Id/body | DELETE público é risco se não houver validação interna suficiente. |
| `/api/melhores` | GET | Pública API | `app/api/melhores/route.ts` | Melhores mídias | Público | `mode`, `ids` | Consulta D1 própria; inclui fontes de imagem. |
| `/api/memorias` | GET, POST | Pública API | `app/api/memorias/route.ts` | Memórias/inscrições | Público | Body conforme handler | Relacionado a `memorias_subscribers`. |
| `/api/mural-cards` | GET, POST, DELETE | Pública API | `app/api/mural-cards/route.ts` | Cards do mural | Público | Id/body | DELETE público merece revisão. |
| `/api/musicas` | GET, POST | Pública API | `app/api/musicas/route.ts` | Sugestões de música | Público | Body conforme handler | Pode ter moderação/admin. |
| `/api/notifications` | GET, POST | Pública API | `app/api/notifications/route.ts` | Notificações internas | Público | `author` | Ligado a autores/ações. |
| `/api/palpites` | GET, POST | Pública API | `app/api/palpites/route.ts` | Palpites | Público | Body conforme handler | Dados em D1. |
| `/api/photos` | GET | Pública API | `app/api/photos/route.ts` | Listar mídia/fotos | Público | `id`, `cursor`, `limit` | Endpoint crítico do feed/home/mosaico/timeline. |
| `/api/push/send` | POST | Pública/API técnica | `app/api/push/send/route.ts` | Enviar push | Não identificado claramente | Body conforme handler | Deve ser revisado para evitar abuso. |
| `/api/push/subscribe` | GET, POST | Pública API | `app/api/push/subscribe/route.ts` | Inscrição push | Público | Subscription body | Usa `lib/push.ts`. |
| `/api/pwa-session` | POST, GET | Pública API | `app/api/pwa-session/route.ts` | Sessão PWA | Público | Body/query | Dados em D1. |
| `/api/qrcode` | GET | Pública API | `app/api/qrcode/route.ts` | Gerar QR Code | Público | `url`, `size` | Usa `qrcode`. |
| `/api/react` | POST | Pública API | `app/api/react/route.ts` | Reações em mídia | Público | Body com mídia/emoji | Não foi identificado rate limit consistente. |
| `/api/realtime` | GET | Pública API | `app/api/realtime/route.ts` | Snapshot realtime | Público | Não identificado claramente | Fallback do TV/SSE. |
| `/api/rsvp` | GET, POST | Pública API | `app/api/rsvp/route.ts` | RSVP | Público | Body conforme handler | Dados em D1. |
| `/api/settings` | GET | Pública API | `app/api/settings/route.ts` | Configurações públicas | Público | Não identificado claramente | Usado por geofence/home. |
| `/api/stats` | GET | Pública API | `app/api/stats/route.ts` | Estatísticas públicas | Público | Não identificado claramente | Home/dashboard público. |
| `/api/store` | GET, POST | Pública API | `app/api/store/route.ts` | Loja/lista | Público | Body conforme handler | Rate limit identificado em parte do fluxo. |
| `/api/stories/seen` | GET, POST | Pública API | `app/api/stories/seen/route.ts` | Marcar stories vistos | Público | `user_id`, `media_id` | Tabela `stories_seen`. |
| `/api/stream` | GET | Pública API/SSE | `app/api/stream/route.ts` | Eventos em tempo real | Público | Não identificado claramente | Mantém conexão curta; logs mostraram ~29s. |
| `/api/suggest-caption` | POST | Pública API | `app/api/suggest-caption/route.ts` | Sugerir legenda | Público | Body com contexto/mídia | Integração/heurística não detalhada no levantamento. |
| `/api/tags` | GET, POST | Pública API | `app/api/tags/route.ts` | Tags em fotos | Público | `media_id`, `person` | Dados de marcação/autores. |
| `/api/upload` | POST | Pública API crítica | `app/api/upload/route.ts` | Upload de mídia | Público + rate limit | FormData `media`, `author`, `caption` | Processa imagem/vídeo/áudio, R2, D1, push. |
| `/api/upload/caption` | POST | Pública API | `app/api/upload/caption/route.ts` | Atualizar legenda | Público | Body com id/caption | Precisa revisão de autorização. |
| `/api/verify-key` | POST | Pública API | `app/api/verify-key/route.ts` | Liberar acesso por chave | Público + rate limit | Body com chave | Usado por geofence. |
| `/api/video-mensagens` | GET, POST, PATCH, DELETE | Pública API crítica | `app/api/video-mensagens/route.ts` | Mensagens em vídeo | Público; admin via query | `admin=1`, `id` | Risco: ações admin não protegidas claramente por `isAuthenticated`. |

### Rotas dinâmicas

| Rota | Parâmetro | Arquivo | Uso |
|---|---|---|---|
| `/foto/[...slug]` | `slug` catch-all | `app/foto/[...slug]/page.tsx` | Deep link/visualização de mídia. |
| `/u/[name]` | `name` | `app/u/[name]/page.tsx` | Perfil ou galeria por autor. |

### Rotas protegidas

- Proteção server-side identificada principalmente em `app/api/admin/**` por `lib/auth.ts`.
- A rota `/admin` é renderizada no cliente e depende do login para consumir APIs protegidas.
- Não foi identificado middleware global de proteção em `middleware.ts`.

### Webhooks

- Não foram identificados webhooks formais no código analisado.

## 5. Funcionalidades do sistema

| Funcionalidade | Objetivo | Fluxo resumido | Arquivos principais | Telas | Serviços envolvidos | Regras identificadas | Status aparente |
|---|---|---|---|---|---|---|---|
| Home/evento | Centralizar experiência inicial | Usuário acessa `/`, vê hero, stories, galeria, stats, mensagens e ações | `app/page.tsx`, `components/home/*`, `contexts/*` | `/` | `/api/photos`, `/api/settings`, `/api/stats`, `/api/stream` | Geofence pode limitar experiência; dados carregados por fetch/SSE | Funcional, mas página grande. |
| Upload de mídia | Receber fotos, vídeos e áudio dos convidados | Usuário abre modal, seleciona mídia, cliente processa, envia para `/api/upload`, servidor salva R2/D1 | `components/home/UploadModal.tsx`, `contexts/UploadContext.tsx`, `app/api/upload/route.ts`, `lib/r2.ts`, `lib/media-processor.ts` | `/`, feed e outras entradas | R2, D1, Sharp, Cloudflare AI, push | Limites: imagem 20MB, vídeo 100MB, áudio 30MB; rate limit 60/h/IP; imagens geram variantes | Funcional e robusta, mas complexa. |
| Feed social | Exibir mídia, comentários e reações | Lista `/api/photos`, renderiza itens, envia comentários e reações | `app/feed/page.tsx`, `components/FeedItem.tsx`, `app/api/photos/route.ts`, `app/api/comments/route.ts`, `app/api/react/route.ts` | `/feed`, `/foto/*`, `/u/*` | D1, R2/CDN | Status de mídia aprovado/pending/rejected no banco | Funcional; precisa reforço anti-abuso. |
| Painel admin | Moderar e configurar sistema | Admin loga, consome `/api/admin/*`, aprova mídia e altera configurações | `app/admin/page.tsx`, `components/admin/AdminClient.tsx`, `lib/auth.ts`, `app/api/admin/*` | `/admin` | D1, R2 | Cookie admin, senha em config/env | Funcional, mas monolítico. |
| Autenticação admin | Proteger APIs administrativas | POST login valida senha, seta cookie, APIs chamam `isAuthenticated` | `lib/auth.ts`, `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts` | `/admin` | D1 config/env | Fallback `admin123` se ausente | Funcional, com risco alto. |
| Geofence/chaves | Controlar acesso por localização ou chave | Cliente lê settings, usa geolocation, pode validar chave | `contexts/GeoAccessContext.tsx`, `app/api/settings/route.ts`, `app/api/verify-key/route.ts` | `/` e páginas com provider | D1 config, browser geolocation | Cache local `cha_geo`; env lat/lng/radius | Parcialmente seguro; validação principal é client-side. |
| TV/telão | Exibir mídia em modo apresentação | Cliente TV consome SSE e fallback polling | `app/tv/page.tsx`, `components/tv/TVClient.tsx`, `app/api/stream/route.ts`, `app/api/realtime/route.ts` | `/tv` | R2 realtime, D1 | SSE fecha por volta de 28s e reconecta | Funcional com fallback. |
| PWA/offline | Melhorar uso mobile e conexão instável | Service worker cacheia shell, fotos e uploads offline | `public/sw.js`, `public/sw-register.js`, `app/manifest.ts` | Todas | Cache API, IndexedDB, push | Cache versionado `cha-jose-v4`; retry via sync | Funcional; precisa testes reais por navegador. |
| Push notifications | Enviar avisos/novas mídias | Usuário inscreve, backend envia web push | `lib/push.ts`, `app/api/push/subscribe/route.ts`, `app/api/push/send/route.ts` | PWA/home | web-push, D1 | Remove subscriptions expiradas | Parcial; endpoint de envio deve ser protegido/revisado. |
| Enquete | Configurar e votar em enquete | Admin configura, público lê e vota | `app/api/admin/enquete/route.ts`, `app/api/enquete/route.ts`, `app/api/enquete/vote/route.ts` | Home/admin | D1 | Voto público | Funcional, mas precisa anti-abuso. |
| Avaliação | Coletar avaliação | Público envia/consulta avaliação | `app/api/avaliacao/route.ts` | Home | D1 | Não identificado claramente | Parcial/funcional. |
| RSVP | Confirmação de presença | Usuário preenche confirmação | `app/rsvp/page.tsx`, `app/api/rsvp/route.ts` | `/rsvp` | D1 | Não identificado claramente | Funcional aparente. |
| Store/lista | Lista de presentes/pedidos | Público vê/envia; admin gerencia | `app/store/page.tsx`, `app/api/store/route.ts`, `app/api/admin/store/route.ts` | `/store`, `/admin` | D1 | Rate limit em parte do fluxo | Funcional aparente. |
| Livro | Livro de mensagens | Público lê/envia mensagens | `app/livro/page.tsx`, `app/api/livro/route.ts` | `/livro` | D1 | Não identificado claramente | Funcional aparente. |
| Carta | Cartas/mensagens especiais | Público envia/lista cartas | `app/carta/page.tsx`, `app/api/carta/route.ts` | `/carta` | D1 | Rate limit próprio | Funcional aparente. |
| Palpites | Envio de palpites | Público envia/lista palpites | `app/palpites/page.tsx`, `app/api/palpites/route.ts` | `/palpites` | D1 | Não identificado claramente | Funcional aparente. |
| Marcos/timeline | Eventos/marcos importantes | Público visualiza/edita via API | `app/marcos/page.tsx`, `app/api/marcos/route.ts`, `app/timeline/page.tsx` | `/marcos`, `/timeline` | D1/R2 | DELETE público precisa revisão | Funcional, com risco de permissão. |
| Mural | Cards colaborativos | Público cria/lista/remove cards | `app/mural/page.tsx`, `app/api/mural-cards/route.ts` | `/mural` | D1 | DELETE público precisa revisão | Funcional, com risco de permissão. |
| Músicas | Sugestões musicais | Público sugere; admin gerencia | `app/musicas/page.tsx`, `app/api/musicas/route.ts`, `app/api/admin/musicas/route.ts` | `/musicas`, `/admin` | D1 | Não identificado claramente | Funcional aparente. |
| Desafios | Brincadeiras/desafios | Admin configura; público visualiza | `app/desafios/page.tsx`, `app/api/desafios/route.ts`, `app/api/admin/desafios/route.ts` | `/desafios`, `/admin` | D1 | Não identificado claramente | Funcional aparente. |
| Bingo | Brincadeira de bingo | Admin configura; público joga/visualiza | `app/bingo/page.tsx`, `app/api/bingo/route.ts`, `app/api/admin/bingo/route.ts` | `/bingo`, `/admin` | D1 | Não identificado claramente | Funcional aparente. |
| Diário | Entradas de diário | Admin configura; público visualiza | `app/diario/page.tsx`, `app/api/diario/route.ts`, `app/api/admin/diario/route.ts` | `/diario`, `/admin` | D1 | Não identificado claramente | Funcional aparente. |
| Vídeo mensagens | Gravar/enviar vídeos | Público envia vídeo; admin deveria visualizar/moderar | `app/video-mensagens/page.tsx`, `app/api/video-mensagens/route.ts`, `components/admin/AdminClient.tsx` | `/video-mensagens`, `/admin` | D1/R2 conforme handler | Query `admin=1` expõe listagem admin | Funcional, mas segurança incompleta. |
| Downloads/exportações | Baixar mídia/textos | Usuário/admin solicita arquivos | `app/api/download/*`, `app/api/admin/export/*` | Feed/admin | R2, JSZip | Proxy por allowlist | Funcional aparente. |
| Tags | Marcar pessoas/fotos | API registra/lista tags | `app/api/tags/route.ts`, `lib/db.ts` | Não identificado claramente | D1 | Não identificado claramente | Técnica/parcial. |

## 6. Fluxos do usuário

### Login administrativo

1. Admin acessa `/admin`.
2. `components/admin/AdminClient.tsx` exibe formulário de login.
3. Cliente envia senha para `POST /api/admin/login`.
4. `app/api/admin/login/route.ts` aplica rate limit, busca senha em D1 config/env e chama `setSession`.
5. `lib/auth.ts` grava cookie `cha_admin=ok`.
6. Chamadas subsequentes para `/api/admin/*` usam `isAuthenticated`.

Falhas aparentes:

- Se `admin_password` e `ADMIN_PASSWORD` não existirem, há fallback para `admin123`.
- Cookie não é assinado e representa apenas valor fixo.
- Não há CSRF dedicado para ações admin.

### Upload de foto/vídeo/áudio

1. Usuário abre upload via home ou navegação.
2. `UploadModal` captura autor, legenda e arquivo.
3. Cliente valida/processa mídia em `lib/media-processor.ts`.
4. Cliente envia `FormData` para `POST /api/upload`.
5. API valida tipo/tamanho, processa imagem com `sharp`, cria variantes, envia para R2 e registra no D1.
6. API atualiza realtime e dispara push em segundo plano.
7. Cliente atualiza galeria/feed por evento local/SSE/polling.

Falhas aparentes:

- Fluxo é grande e distribuído em poucos arquivos muito extensos.
- Moderação por Cloudflare AI falha aberta.
- Dependência forte de variáveis R2/D1.

### Navegação no feed

1. Usuário acessa `/feed`.
2. Página busca mídia em `/api/photos`.
3. Cada item renderiza via `components/FeedItem.tsx`.
4. Comentários usam `/api/comments`; reações usam `/api/react`.
5. Downloads usam `/api/download` ou rotas específicas.

Falhas aparentes:

- Comentários e reações precisam de limitação anti-abuso mais clara.
- Página já existia apesar de erro 404 relatado; falha anterior pode ter sido cache/chunk de build/dev server.

### Vídeo mensagens

1. Usuário acessa `/video-mensagens`.
2. Página grava/envia vídeo para `/api/video-mensagens`.
3. Admin visualiza no dashboard via `components/admin/AdminClient.tsx`.
4. API suporta GET/POST/PATCH/DELETE.

Falhas aparentes:

- A API aparenta usar `admin=1` para modo admin sem proteção forte por `isAuthenticated`.
- PATCH/DELETE precisam ser protegidos por autenticação admin.

### Geofence/chave de acesso

1. App carrega `GeoAccessProvider`.
2. Provider busca `/api/settings`.
3. Se geofence estiver ativa, browser pede geolocalização.
4. Se fora da área, usuário pode usar chave em `/api/verify-key`.
5. Resultado é cacheado no `localStorage`.

Falhas aparentes:

- Controle principal está no cliente; APIs públicas continuam acessíveis se chamadas diretamente.
- A proteção por geofence é mais UX/controle leve do que segurança server-side.

### Admin modera mídia/configura recursos

1. Admin logado acessa `/admin`.
2. Dashboard busca estatísticas, mídias pendentes, configurações e módulos.
3. Admin aprova/rejeita conteúdo por `/api/admin/approve`.
4. Admin altera recursos como enquete, store, bingo, desafios, diário e músicas por `/api/admin/*`.

Falhas aparentes:

- Dashboard é monolítico e difícil de manter.
- Algumas entidades públicas também possuem DELETE/POST sem proteção admin clara.

### PWA/offline

1. `app/layout.tsx` carrega `/sw-register.js`.
2. Service worker `public/sw.js` cacheia shell e intercepta recursos.
3. Uploads offline podem ser enfileirados e reenviados via sync.
4. Push notifications são processadas pelo SW.

Falhas aparentes:

- Fluxo depende de suporte do navegador a background sync/IndexedDB.
- Precisa validação manual em mobile real.

## 7. Modelagem de dados

### Entidades em `schema.sql`

| Tabela | Campos principais | Relacionamentos/regras | Observações |
|---|---|---|---|
| `media` | `id`, `author`, `status`, `type`, `caption`, `created_at` | `status` com CHECK `approved/pending/rejected`; `type` com CHECK `image/video/audio` | Entidade central de mídia. |
| `comments` | `id`, `media_id`, `author`, `text`, `created_at` | FK `media_id` -> `media(id)` com cascade | Comentários do feed. |
| `stories_seen` | `user_id`, `media_id`, `seen_at` | PK composta `user_id`, `media_id`; FK para `media` | Controle de stories vistos. |
| `access_keys` | `id`, `name`, `key`, `created_at` | `key` unique | Chaves de acesso/geofence. |
| `reactions` | `media_id`, `emoji`, `count` | PK composta `media_id`, `emoji`; FK para `media` | Contadores por emoji. |
| `capsule_messages` | `id`, `author`, `message`, `image_url`, `created_at` | Sem FK identificada | Cápsula/mensagens. |
| `config` | `key`, `value` | PK `key` | Configurações gerais. |

Índices identificados em `schema.sql`:

- `idx_media_status_created`
- `idx_reactions_media`
- `idx_capsule_created`
- `idx_comments_media_created`
- `idx_access_keys_key`
- `idx_stories_seen_user`

### Entidades adicionais identificadas em `lib/db.ts`

`lib/db.ts` cria e opera diversas entidades além de `schema.sql`. Entre elas:

- leaderboard/ranking
- store/lista
- livro
- palpites
- notifications
- event stats
- cartas
- push subscriptions
- avaliação
- enquete
- músicas
- desafios
- bingo
- diário
- RSVP
- marcos
- video_mensagens
- mural_cards
- memorias_subscribers
- tags/fotos marcadas
- sessões PWA

Inconsistências:

- `schema.sql` está incompleto em relação ao banco real usado pela aplicação.
- Muitas tabelas são garantidas por `CREATE TABLE IF NOT EXISTS` dentro de `lib/db.ts`, o que mistura migração, repository e regra de negócio.
- Não foi identificado ORM, migrations versionadas ou ferramenta formal de evolução do schema.
- Não foi identificado campo de tenant/multi-tenant.
- Campos financeiros formais não foram identificados claramente, embora exista funcionalidade de store/lista.
- Campos de auditoria aparecem parcialmente como `created_at`; `updated_at`, `deleted_at`, `created_by` e trilhas de auditoria não foram identificados de forma consistente.

## 8. Arquitetura do frontend

Organização:

- O frontend usa Next App Router, mas muitas páginas são Client Components.
- Layout global em `app/layout.tsx`.
- Estilo global concentrado em `app/globals.css`.
- Componentes compartilhados em `components/`.
- Contextos globais em `contexts/GeoAccessContext.tsx` e `contexts/UploadContext.tsx`.

Padrões identificados:

- Dados são carregados com `fetch` diretamente nos componentes.
- Estado local usa `useState`, `useEffect`, `useMemo`, contextos e `localStorage`.
- Não há camada clara de API client.
- Não há design system formal identificado.
- Vários componentes usam estilos inline, classes globais e lógica de negócio no mesmo arquivo.

Pontos positivos:

- Há componentes reutilizáveis para navegação, feed, upload, TV e galeria.
- PWA e offline foram tratados de forma prática.
- Imagens possuem thumbnails/variantes para melhorar performance.
- Experiências específicas como TV, mosaico e timeline têm telas dedicadas.

Problemas de manutenção/performance:

- `components/admin/AdminClient.tsx` é muito grande e concentra muitas abas/fluxos.
- `app/page.tsx` é grande e mistura vários blocos da experiência.
- `components/home/UploadModal.tsx` concentra processamento, UI, fila offline e envio.
- `components/FeedItem.tsx` concentra muitas interações por item.
- Uso intenso de Client Components reduz oportunidades de SSR/cache.
- `app/globals.css` é grande e pode dificultar isolamento visual.

Acessibilidade:

- Não foi feita validação visual/assistiva completa nesta auditoria.
- Pelo padrão identificado, há risco de botões/controles customizados sem semântica ARIA consistente.
- Estados de erro/loading existem em vários fluxos, mas não há padrão global identificado.

## 9. Arquitetura do backend

Organização:

- Backend é composto por Route Handlers do Next em `app/api/**/route.ts`.
- Persistência principal fica em `lib/db.ts`.
- Storage R2 fica em `lib/r2.ts`.
- Autenticação fica em `lib/auth.ts`.
- Rate limit reutilizável fica em `lib/rate-limit.ts`, mas nem todos endpoints usam.

Padrões identificados:

- Endpoints fazem parsing de request, validação, regra e chamada ao banco diretamente.
- `lib/db.ts` atua como camada de banco, migrations, queries e helpers de domínio.
- Não há controllers/services/repositories formais separados por domínio.
- Tratamento de erro é feito localmente por endpoint.

Pontos positivos:

- APIs cobrem bem as funcionalidades do produto.
- Upload possui validações de tipo/tamanho e concorrência.
- Admin APIs principais usam `isAuthenticated`.
- Integrações R2/D1 estão centralizadas em arquivos utilitários.

Riscos técnicos:

- `lib/db.ts` virou gargalo de manutenção.
- Falta padronização de autorização em rotas públicas com métodos destrutivos.
- Falta validação de entrada com schema.
- Rate limit é em memória, não distribuído.
- Falta suíte de testes para proteger fluxos críticos.

## 10. Segurança

### Pontos positivos

- Cookie admin é `httpOnly`.
- Cookie usa `secure` em produção e `sameSite=lax`.
- Login admin possui rate limit por IP.
- Upload tem rate limit por IP e limite de concorrência.
- Upload valida tipo e tamanho de arquivo.
- Download por proxy usa allowlist de domínio/CDN/R2.
- Secrets são esperados por variáveis de ambiente e `.env.example` documenta configuração.

### Riscos

| Risco | Evidência | Impacto |
|---|---|---|
| Senha admin padrão | `app/api/admin/login/route.ts` usa fallback `admin123` se config/env ausentes | Alto |
| Sessão admin simples | `lib/auth.ts` usa cookie fixo `cha_admin=ok` | Alto |
| Ações admin de vídeo mensagens sem proteção clara | `app/api/video-mensagens/route.ts` aceita `admin=1`, PATCH e DELETE sem evidência de `isAuthenticated` | Alto |
| DELETE público em algumas APIs | `app/api/marcos/route.ts`, `app/api/mural-cards/route.ts`, `app/api/video-mensagens/route.ts` | Alto/médio |
| Falta CSRF dedicado | APIs admin usam cookie, mas não foi identificado token CSRF | Médio |
| Rate limit parcial | Comentários, reações, votos e vídeo mensagens precisam revisão | Médio |
| Geofence client-side | `contexts/GeoAccessContext.tsx` controla UI, mas APIs públicas continuam acessíveis | Médio |
| Falta validação por schema | Não há Zod/Yup; validação manual dispersa | Médio |
| Rate limit em memória | `lib/rate-limit.ts` não é distribuído | Médio em serverless/múltiplas instâncias |
| Falha aberta na moderação AI | Upload pode continuar se moderação externa falhar | Médio |

### Melhorias recomendadas

- Remover fallback `admin123` e exigir `ADMIN_PASSWORD` ou senha configurada.
- Trocar cookie fixo por sessão assinada/token aleatório com expiração real.
- Proteger `PATCH/DELETE` e modo admin de `/api/video-mensagens`.
- Revisar todos endpoints públicos com métodos POST/DELETE/PATCH.
- Adicionar validação centralizada com schemas por endpoint.
- Implementar rate limit persistente/distribuído para endpoints sensíveis.
- Adicionar CSRF token ou exigir header/token para ações administrativas.
- Formalizar política de upload seguro, incluindo extensões, MIME real, duração e varredura.

## 11. UX/UI e design do produto

Pontos fortes:

- Produto tem escopo emocional claro e várias experiências adequadas a evento: álbum, mural, TV, mensagens, brincadeiras e convite.
- Navegação por páginas dedicadas ajuda a organizar funcionalidades extensas.
- Recursos como mosaico, timeline, ranking e TV aumentam valor percebido.
- Upload com processamento e feedback tende a melhorar usabilidade em mobile.
- PWA/offline é coerente com ambiente de evento, onde conexão pode oscilar.

Pontos fracos/riscos:

- A quantidade de funcionalidades pode gerar navegação carregada se não houver hierarquia clara.
- Páginas grandes e client-heavy podem gerar carregamentos inconsistentes em dispositivos fracos.
- Estados vazios/erro/loading não parecem padronizados em todo o app.
- Admin concentra muitas ações em um único componente, aumentando risco de UI confusa.
- Falta de design system formal pode causar inconsistência visual.
- Acessibilidade não está comprovada por testes ou padrão centralizado.

Análise de produto:

- O sistema parece mais próximo de uma aplicação de evento completa do que uma landing page.
- A percepção de valor é forte quando feed, TV, upload e admin funcionam em conjunto.
- O maior risco de usabilidade está em performance, excesso de opções e feedback inconsistente em falhas de rede/upload.

## 12. Qualidade de código

| Critério | Avaliação |
|---|---|
| Legibilidade | Boa em partes, prejudicada por arquivos muito grandes. |
| Organização | Funcional, mas com camadas misturadas em endpoints e componentes. |
| Consistência | Parcial; há padrões diferentes para rate limit, validação e acesso ao banco. |
| Duplicação | Aparente em consultas/handlers e validações manuais. |
| Complexidade | Alta em upload, admin, home, feed e DB. |
| Acoplamento | Alto em `lib/db.ts`, `AdminClient.tsx` e `UploadModal.tsx`. |
| Tipagem | TypeScript com `strict: true`, ponto positivo. |
| Tratamento de erros | Presente, porém local e sem padrão central. |
| Testabilidade | Baixa por ausência de testes e arquivos monolíticos. |
| Manutenção | Possível, mas exige refatoração incremental para reduzir risco. |

Arquivos grandes/estratégicos:

- `components/admin/AdminClient.tsx`: aproximadamente 127 KB.
- `lib/db.ts`: aproximadamente 76 KB.
- `app/globals.css`: aproximadamente 63 KB.
- `components/home/UploadModal.tsx`: aproximadamente 42 KB.
- `app/page.tsx`: aproximadamente 33 KB.
- `components/FeedItem.tsx`: aproximadamente 27 KB.
- `components/PhotoBooth.tsx`: aproximadamente 27 KB.
- `components/tv/TVClient.tsx`: aproximadamente 26 KB.
- `components/BottomNav.tsx`: aproximadamente 24 KB.

## 13. Dependências críticas e arquivos estratégicos

| Arquivo | Por que é estratégico |
|---|---|
| `package.json` | Define stack, scripts e dependências. |
| `next.config.js` | Configura imagens remotas para R2/CDN. |
| `wrangler.toml` | Define deploy Cloudflare, D1, R2 e variáveis públicas. |
| `schema.sql` | Schema base do D1, embora incompleto em relação ao runtime. |
| `app/layout.tsx` | Layout raiz, providers, service worker e metadados. |
| `app/page.tsx` | Home principal e maior porta de entrada do usuário. |
| `app/admin/page.tsx` | Entrada do painel administrativo. |
| `components/admin/AdminClient.tsx` | Dashboard/admin principal. |
| `components/home/UploadModal.tsx` | Fluxo crítico de upload. |
| `components/home/MediaGallery.tsx` | Galeria principal da home. |
| `components/FeedItem.tsx` | Renderização/interação social por mídia. |
| `components/tv/TVClient.tsx` | Experiência de TV/telão. |
| `contexts/GeoAccessContext.tsx` | Controle client-side de geofence/acesso. |
| `contexts/UploadContext.tsx` | Estado global de upload/photobooth. |
| `lib/db.ts` | Persistência e modelagem runtime. |
| `lib/r2.ts` | Storage R2, URLs e variantes de imagem. |
| `lib/auth.ts` | Sessão admin. |
| `lib/rate-limit.ts` | Rate limit reutilizável. |
| `lib/media-processor.ts` | Pré-processamento client-side de mídia. |
| `lib/push.ts` | Push notifications. |
| `app/api/upload/route.ts` | Upload server-side, R2, D1, processamento e push. |
| `app/api/photos/route.ts` | Endpoint crítico de feed/galeria. |
| `app/api/stream/route.ts` | SSE/realtime. |
| `app/api/video-mensagens/route.ts` | Vídeo mensagens, com risco de autorização. |
| `public/sw.js` | PWA/offline/cache/push/background sync. |
| `public/sw-register.js` | Registro e atualização do service worker. |

## 14. Problemas encontrados

| Categoria | Problema | Evidência | Risco |
|---|---|---|---|
| Segurança | Fallback admin `admin123` | `app/api/admin/login/route.ts` | Alto |
| Segurança | Cookie admin fixo | `lib/auth.ts` | Alto |
| Segurança | Vídeo mensagens admin sem proteção clara | `app/api/video-mensagens/route.ts` | Alto |
| Segurança | Métodos destrutivos públicos | `app/api/marcos/route.ts`, `app/api/mural-cards/route.ts` | Alto/médio |
| Arquitetura | DB monolítico | `lib/db.ts` | Alto |
| Arquitetura | Admin monolítico | `components/admin/AdminClient.tsx` | Alto |
| Dados | `schema.sql` incompleto | Comparação com `lib/db.ts` | Médio |
| Qualidade | Ausência de testes | `package.json` | Alto |
| Qualidade | Validação manual dispersa | APIs variadas | Médio |
| Performance | Muitas páginas client-heavy | `app/**/page.tsx` e componentes | Médio |
| UX | Estados/feedback sem padrão global claro | Componentes diversos | Médio |
| Operação | Rate limit em memória | `lib/rate-limit.ts` | Médio |
| Manutenção | Lógica duplicada/heterogênea | `/api/melhores`, `/api/carta`, endpoints diversos | Médio |
| Build/dev | 404 de chunk pode ocorrer após build/dev server simultâneo | Logs anteriores de `_next/static/chunks/...` | Baixo/médio operacional |

## 15. Pontos fortes

- Escopo funcional muito completo para um evento.
- Uso de Next.js App Router com APIs internas.
- Integração real com Cloudflare D1 e R2.
- Upload de mídia com processamento de imagem, variantes e thumbnails.
- PWA com service worker, cache, push e fila offline.
- Experiência de TV/telão com SSE e fallback.
- Painel admin cobre muitas áreas do produto.
- TypeScript com modo estrito.
- Boa separação inicial de utilitários críticos (`lib/r2.ts`, `lib/auth.ts`, `lib/push.ts`, `lib/media-processor.ts`).
- Rotas principais existem para feed, home, video mensagens e enquete.

## 16. Pontos fracos

- Segurança admin precisa de endurecimento.
- Algumas APIs públicas parecem permitir ações destrutivas ou administrativas.
- Não há testes automatizados identificados.
- Arquivos centrais grandes demais dificultam manutenção.
- Modelagem do banco não está formalizada em migrations completas.
- Validação de entrada não é padronizada.
- Não há design system formal.
- Uso intenso de client-side pode afetar performance.
- Rate limit em memória não é suficiente para ambiente distribuído.
- Camadas backend e frontend misturam responsabilidades em vários pontos.

## 17. Melhorias recomendadas

### Curto prazo

| Melhoria | Impacto | Dificuldade | Prioridade |
|---|---|---|---|
| Remover fallback `admin123` e falhar se senha admin não estiver configurada | Alto | Baixa | P0 |
| Proteger `/api/video-mensagens` para modo admin, PATCH e DELETE | Alto | Baixa/média | P0 |
| Revisar DELETE/POST públicos em `marcos`, `mural-cards`, `upload/caption`, `push/send` | Alto | Média | P0 |
| Adicionar rate limit em comentários, reações, enquete e vídeo mensagens | Médio/alto | Baixa/média | P1 |
| Documentar variáveis obrigatórias e validar boot/config | Médio | Baixa | P1 |
| Separar abas do admin em componentes menores | Médio | Média | P1 |
| Criar testes mínimos para auth, upload, photos, enquete e video mensagens | Alto | Média | P1 |
| Atualizar `schema.sql` com tabelas reais usadas por `lib/db.ts` | Alto | Média | P1 |

### Médio prazo

| Melhoria | Impacto | Dificuldade | Prioridade |
|---|---|---|---|
| Dividir `lib/db.ts` por domínio | Alto | Média/alta | P1 |
| Introduzir validação com schemas por endpoint | Alto | Média | P1 |
| Criar API client/hook layer no frontend | Médio | Média | P2 |
| Padronizar estados de loading/erro/vazio | Médio | Média | P2 |
| Reduzir `app/page.tsx` em seções/componentes menores | Médio | Média | P2 |
| Criar design tokens/componentes base | Médio | Média | P2 |
| Melhorar cache e paginação de feeds grandes | Médio/alto | Média | P2 |
| Criar migrações versionadas para D1 | Alto | Média | P1 |

### Longo prazo

| Melhoria | Impacto | Dificuldade | Prioridade |
|---|---|---|---|
| Implementar sessão admin assinada/rotativa com CSRF | Alto | Média/alta | P1 |
| Rate limit distribuído em D1/KV/Durable Object | Alto | Média/alta | P2 |
| Observabilidade com logs estruturados e métricas | Médio/alto | Média | P2 |
| Testes E2E dos fluxos principais em mobile | Alto | Média/alta | P2 |
| Modularizar domínios do produto | Alto | Alta | P2 |
| Revisar acessibilidade com checklist WCAG | Médio | Média | P3 |

## 18. Plano de ação priorizado

1. Corrigir segurança imediata: remover `admin123`, proteger vídeo mensagens admin/PATCH/DELETE e revisar endpoints destrutivos públicos.
2. Garantir estabilidade das rotas críticas: `/`, `/feed`, `/video-mensagens`, `/api/enquete`, `/api/photos`, `/api/upload` e `/api/stream`.
3. Criar testes mínimos de regressão para auth, feed, upload, enquete, admin e video mensagens.
4. Atualizar `schema.sql` para refletir as tabelas realmente usadas em `lib/db.ts`.
5. Adicionar validação com schemas e rate limit em endpoints públicos sensíveis.
6. Refatorar `components/admin/AdminClient.tsx` em módulos por aba/funcionalidade.
7. Refatorar `lib/db.ts` por domínio: media, admin/config, interações, jogos, store, mensagens, push.
8. Reduzir a home e o upload em componentes menores, preservando comportamento atual.
9. Padronizar UX de loading, erro, vazio, sucesso e retry.
10. Revisar PWA/offline em dispositivos reais e documentar comportamento esperado.
11. Melhorar observabilidade: logs estruturados em APIs críticas e mensagens de erro seguras.
12. Evoluir segurança admin com sessão assinada, CSRF e auditoria de ações.

## 19. Resumo executivo final

O projeto `cha-jose-augusto` é uma aplicação de evento bastante completa, com home interativa, feed social, upload de mídia, painel admin, PWA/offline, TV/telão, enquetes, RSVP, loja/lista, jogos e mensagens. O potencial do produto é alto porque as funcionalidades se conectam bem ao contexto de um evento real e oferecem valor para convidados e organizadores.

O nível de maturidade funcional é intermediário/avançado. O nível de maturidade técnica é intermediário, com riscos claros em segurança, manutenção e padronização. O maior risco imediato está em autenticação/autorização administrativa e em endpoints públicos que podem executar ações sensíveis. O maior risco de manutenção está nos arquivos monolíticos `lib/db.ts` e `components/admin/AdminClient.tsx`.

A recomendação objetiva é priorizar segurança e estabilidade antes de novas funcionalidades: corrigir auth/admin, proteger endpoints sensíveis, adicionar testes mínimos, formalizar schema/migrations e só depois avançar na refatoração de arquitetura e UX. O sistema já tem uma base funcional forte, mas precisa de endurecimento técnico para operar com menos risco e evoluir sem quebrar funcionalidades existentes.
