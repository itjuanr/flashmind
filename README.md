# 🧠 FlashMind

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

Sistema de flashcards com repetição espaçada para memorização eficiente. Organize seus estudos em decks, estude com sessões cronometradas e acompanhe seu progresso com estatísticas detalhadas.

---

## 🚀 Destaques Técnicos

- **Repetição Espaçada:** Algoritmo de revisão que agenda cada card com base no seu desempenho (escala 1–5), aumentando progressivamente o intervalo para acertos.
- **Autenticação JWT:** Login seguro com tokens armazenados no `localStorage` e refresh automático via interceptor do Axios.
- **Tema Claro/Escuro:** Detecção automática da preferência do sistema operacional com persistência no `localStorage`.
- **Import/Export CSV:** Suporte a arquivos do Excel, Google Sheets e LibreOffice com detecção automática de encoding (UTF-8 / Windows-1252) e remoção de BOM.
- **Áudio nos Cards:** Gravação via microfone ou upload de arquivo, armazenado como Base64 no MongoDB.
- **Busca Global:** Modal `Ctrl+K` com busca em tempo real em todos os decks e flashcards.
- **Sessões de Estudo:** Timer por card, modo foco, embaralhamento e atalhos de teclado (`Espaço`, `F`, `E`, `1–5`).

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
│       │   ├── searchController.js
│       │   └── studyController.js
│       ├── middleware/authMiddleware.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Deck.js
│       │   ├── Flashcard.js
│       │   └── StudySession.js
│       └── routes/
│           ├── auth.js
│           ├── decks.js
│           ├── flashcards.js
│           ├── search.js
│           └── study.js
│
└── frontend/src/
    ├── App.jsx
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
        ├── Dashboard.jsx
        ├── DeckPage.jsx
        ├── FavoritesPage.jsx
        ├── Home.jsx
        ├── Login.jsx
        ├── Register.jsx
        ├── StatsPage.jsx
        └── StudyPage.jsx
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
npm run dev
```

Acesse em `http://localhost:5173`

---

## 📡 Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário logado |
| PATCH | `/api/auth/me` | Atualizar perfil / meta diária |
| GET | `/api/decks` | Listar decks |
| POST | `/api/decks` | Criar deck |
| PUT | `/api/decks/:id` | Editar deck |
| DELETE | `/api/decks/:id` | Excluir deck |
| POST | `/api/decks/:id/clone` | Duplicar deck |
| PATCH | `/api/decks/:id/favorite` | Toggle favorito |
| GET | `/api/flashcards/deck/:id` | Cards do deck |
| POST | `/api/flashcards` | Criar card |
| PUT | `/api/flashcards/:id` | Editar card |
| DELETE | `/api/flashcards/:id` | Excluir card |
| PUT | `/api/flashcards/:id/review` | Registrar revisão |
| PATCH | `/api/flashcards/:id/favorite` | Toggle favorito |
| POST | `/api/study/session` | Salvar sessão de estudo |
| GET | `/api/study/stats` | Estatísticas gerais |
| GET | `/api/study/history?days=N` | Histórico diário + streak |
| GET | `/api/study/deck/:id/history` | Histórico por deck |
| DELETE | `/api/study/reset` | Resetar histórico |
| GET | `/api/search?q=` | Busca global |

---

## ✨ Funcionalidades

- ✅ Autenticação completa (cadastro, login, JWT)
- ✅ Criação e organização de decks com emoji, cor e imagem
- ✅ Tags e filtros por tag nos decks
- ✅ Flashcards com frente, verso, imagem, áudio e anotação
- ✅ Repetição espaçada com escala de dificuldade 1–5
- ✅ Sessão de estudo com timer, modo foco e embaralhamento
- ✅ Edição de cards durante a sessão de estudo (tecla `E`)
- ✅ Favoritar cards durante o estudo (tecla `F`)
- ✅ Import e export de cards via CSV
- ✅ Busca global `Ctrl+K`
- ✅ Busca dentro do deck
- ✅ Histórico de sessões por deck
- ✅ Estatísticas com gráfico de atividade e streak
- ✅ Reset de histórico por tipo e período
- ✅ Tema claro/escuro com detecção automática
- ✅ Cards favoritados com página dedicada
- ✅ Duplicar decks
- ✅ Notificação de cards vencidos para revisão
- ✅ Configuração de delay de novos cards por deck

---

## 🔐 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | Connection string do MongoDB Atlas |
| `JWT_SECRET` | Chave secreta para assinar os tokens |
| `JWT_EXPIRES_IN` | Expiração do token (ex: `7d`) |
| `PORT` | Porta do servidor (padrão: `5000`) |
| `CLIENT_URL` | URL do frontend para CORS |