# ⚡ FlashMind

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat&logo=render&logoColor=white)

Plataforma completa de flashcards com repetição espaçada, caderno de anotações e estatísticas de desempenho. Desenvolvida inteiramente por **Juan Rodrigues** para auxiliar estudantes de todas as áreas.

🌐 **Acesse em produção:** [flashmind-delta.vercel.app](https://flashmind-delta.vercel.app)

---

## 🚀 Destaques Técnicos

- **Repetição Espaçada:** Algoritmo que agenda cada card com base no desempenho (escala 1–5), aumentando progressivamente o intervalo entre revisões.
- **Autenticação Persistente:** Sessão de 7 dias com renovação automática a cada interação. Token migrado automaticamente entre versões sem forçar novo login.
- **Caderno de Anotações:** Sistema completo de notas por matéria e semestre, com editor rico (negrito, itálico, listas, títulos, citações, código) e autosave via refs para evitar closure stale.
- **Import/Export Avançado:** Suporte a CSV, Excel (.xlsx) com template personalizado, e Anki (.apkg) com extração de imagens e áudios via JSZip + sql.js no browser.
- **Compartilhamento de Decks:** Geração de link público com token único. Qualquer pessoa pode visualizar e clonar o deck sem ter conta.
- **Busca Global:** Modal `Ctrl+K` com filtros por tipo (decks, cards, áudio, imagem, favoritos, com nota).
- **Drag & Drop:** Reordenação de cards com persistência no banco.
- **Modo Foco:** Esconde a Navbar durante a sessão de estudo para minimizar distrações.

---

## 🗂️ Estrutura do Projeto

```
flashmind/
├── backend/
│   ├── server.js
│   └── src/
│       ├── config/db.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── deckController.js
│       │   ├── flashcardController.js
│       │   ├── noteController.js
│       │   ├── searchController.js
│       │   ├── studyController.js
│       │   └── subjectController.js
│       ├── middleware/authMiddleware.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Deck.js
│       │   ├── Flashcard.js
│       │   ├── Note.js
│       │   ├── StudySession.js
│       │   └── Subject.js
│       └── routes/
│           ├── auth.js
│           ├── decks.js
│           ├── flashcards.js
│           ├── notebook.js
│           ├── search.js
│           └── study.js
│
└── frontend/src/
    ├── App.jsx
    ├── index.css
    ├── context/
    │   ├── AuthContext.jsx
    │   ├── ThemeContext.jsx
    │   └── ToastContext.jsx
    ├── components/
    │   ├── AudioPicker.jsx
    │   ├── CsvImportModal.jsx
    │   ├── FlashCard.jsx
    │   ├── GlobalSearch.jsx
    │   ├── ImageZoom.jsx
    │   └── Navbar.jsx
    └── pages/
        ├── ContactPage.jsx
        ├── Dashboard.jsx
        ├── DeckPage.jsx
        ├── FavoritesPage.jsx
        ├── Home.jsx
        ├── Login.jsx
        ├── NotebookPage.jsx
        ├── NotePage.jsx
        ├── Register.jsx
        ├── SharePage.jsx
        ├── StatsPage.jsx
        ├── StudyPage.jsx
        └── SubjectPage.jsx
```

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite |
| Estilização | Tailwind CSS + glassmorphism |
| Backend | Node.js + Express |
| Banco de dados | MongoDB Atlas (Mongoose) |
| Autenticação | JWT + bcryptjs |
| HTTP Client | Axios |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Import Anki | JSZip + sql.js (browser) |
| Import/Export | SheetJS (xlsx) |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Conta no [MongoDB Atlas](https://www.mongodb.com/atlas)

### Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` na raiz do backend:

```env
PORT=5000
MONGODB_URI=sua_connection_string_aqui
JWT_SECRET=sua_chave_secreta
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Crie o arquivo `.env` na raiz do frontend:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Acesse em `http://localhost:5173`

---

## 📡 Rotas da API

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário logado |
| PATCH | `/api/auth/me` | Atualizar perfil / meta diária |

### Decks
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/decks` | Listar decks |
| POST | `/api/decks` | Criar deck |
| GET | `/api/decks/:id` | Buscar deck |
| PUT | `/api/decks/:id` | Editar deck |
| DELETE | `/api/decks/:id` | Excluir deck + cards |
| POST | `/api/decks/:id/clone` | Duplicar deck (em lotes) |
| PATCH | `/api/decks/:id/favorite` | Toggle favorito |
| PATCH | `/api/decks/:id/share` | Gerar / revogar link público |
| GET | `/api/decks/share/:token` | Ver deck público (sem auth) |
| POST | `/api/decks/share/:token/clone` | Clonar deck público |

### Flashcards
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/flashcards/deck/:id` | Cards do deck |
| GET | `/api/flashcards/deck/:id/study` | Cards vencidos |
| POST | `/api/flashcards` | Criar card |
| PUT | `/api/flashcards/:id` | Editar card |
| DELETE | `/api/flashcards/:id` | Excluir card |
| PUT | `/api/flashcards/:id/review` | Registrar revisão |
| PATCH | `/api/flashcards/:id/favorite` | Toggle favorito |
| PATCH | `/api/flashcards/reorder` | Reordenar cards (drag & drop) |

### Estudo
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/study/session` | Salvar sessão |
| GET | `/api/study/stats` | Stats: acerto, streak, dueTotal, cardsStudiedToday |
| GET | `/api/study/due-decks` | Decks com cards vencidos (sino) |
| GET | `/api/study/favorites` | Cards favoritados |
| GET | `/api/study/history?days=N` | Histórico diário + streak |
| GET | `/api/study/deck/:id/history` | Histórico por deck |
| DELETE | `/api/study/reset` | Resetar histórico |

### Caderno
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notebook/subjects` | Listar matérias |
| POST | `/api/notebook/subjects` | Criar matéria |
| PUT | `/api/notebook/subjects/:id` | Editar matéria |
| DELETE | `/api/notebook/subjects/:id` | Excluir matéria + aulas |
| GET | `/api/notebook/subjects/:id/notes` | Listar aulas |
| POST | `/api/notebook/subjects/:id/notes` | Criar aula |
| GET | `/api/notebook/notes/:id` | Buscar aula |
| PUT | `/api/notebook/notes/:id` | Editar aula (autosave) |
| DELETE | `/api/notebook/notes/:id` | Excluir aula |
| POST | `/api/notebook/notes/:id/attachments` | Adicionar anexo |
| DELETE | `/api/notebook/notes/:id/attachments/:attachId` | Remover anexo |
| GET | `/api/notebook/search?q=` | Buscar nas anotações |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/search?q=` | Busca global (decks + cards) |

---

## ✨ Funcionalidades

### Flashcards
- ✅ Criação de decks com emoji, cor, imagem e tags
- ✅ Cards com frente, verso, imagem, áudio e anotação
- ✅ Cores personalizadas por card (7 opções)
- ✅ Indicador de nível (Iniciando → Dominado)
- ✅ Drag & drop para reordenar cards
- ✅ Ordenação por posição, A→Z, nível ou próxima revisão
- ✅ Duplicar decks (processamento em lotes)
- ✅ Compartilhar deck via link público
- ✅ Import: CSV, Excel (.xlsx) e Anki (.apkg) com imagens e áudios
- ✅ Export: Excel (.xlsx) com template personalizado
- ✅ Preview com seleção individual antes de importar

### Sessão de Estudo
- ✅ Repetição espaçada com escala 1–5
- ✅ Animação visual da nota escolhida
- ✅ Botão para voltar ao card anterior e reavaliar
- ✅ Timer por card (15s, 30s, 60s)
- ✅ Countdown 3-2-1 antes de iniciar
- ✅ Modo foco (esconde Navbar)
- ✅ Embaralhamento de cards
- ✅ Seleção de quais cards estudar
- ✅ Revisão rápida dos cards errados ao final
- ✅ Atalhos de teclado: `Espaço`, `F`, `E`, `1–5`, `N`

### Dashboard & Stats
- ✅ Meta diária com barra de progresso
- ✅ Sino de notificações com dropdown de decks vencidos
- ✅ Estatísticas: acerto, streak, sessões, cards estudados
- ✅ Gráfico de atividade diária
- ✅ Histórico de sessões por deck
- ✅ Reset de histórico por tipo

### Caderno
- ✅ Matérias organizadas por semestre (nome livre)
- ✅ Aulas com título, data e editor rico
- ✅ Formatação: negrito, itálico, títulos, listas, citação, código
- ✅ Autosave 1.5s após parar de digitar
- ✅ Anexos: imagens, PDFs, links e vídeos (YouTube / Drive)
- ✅ Busca dentro das anotações

### Geral
- ✅ Autenticação JWT com sessão persistente de 7 dias
- ✅ Tema claro/escuro com detecção automática
- ✅ Busca global `Ctrl+K` com filtros avançados
- ✅ Página de contato com formulário e doação via PIX
- ✅ Totalmente responsivo (mobile + desktop)

---

## 🔐 Variáveis de Ambiente

### Backend
| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | Connection string do MongoDB Atlas |
| `JWT_SECRET` | Chave secreta para assinar os tokens |
| `JWT_EXPIRES_IN` | Expiração do token (ex: `7d`) |
| `PORT` | Porta do servidor (padrão: `5000`) |
| `CLIENT_URL` | URL do frontend para CORS |

### Frontend
| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL completa da API (ex: `https://seu-backend.onrender.com/api`) |

---

## 👨‍💻 Autor

Desenvolvido inteiramente por **Juan Rodrigues** — um único desenvolvedor apaixonado por educação e tecnologia.

Se o projeto te ajudou, considere apoiar o desenvolvimento! ☕

---

*Feito com 💙 para a comunidade de estudantes.*
