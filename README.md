# Paggo OCR Case

Fullstack application for document OCR processing with LLM integration. Upload documents (images or PDFs), extract text using OCR, and interact with the extracted data using AI-powered explanations and queries.

## 🚀 Live Application

**Deployed App:** [Add your Vercel deployment URL here]

- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-backend.railway.app/api`

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **OpenAI API Key** (optional, for LLM features)

## 🔧 Local Setup and Running

### 1. Clone the repository

```bash
git clone <repository-url>
cd paggo_case
```

### 2. Install dependencies

```bash
npm install
npm install --workspaces
```

### 3. Configure environment variables

#### Backend (`backend/.env`)

Create `backend/.env` file:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
OPENAI_API_KEY="your-openai-api-key"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
MAX_FILE_SIZE=10485760
UPLOAD_DEST="./uploads"
```

#### Frontend (`frontend/.env.local`)

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Set up the database

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
cd ..
```

### 5. Run the application

**Run both frontend and backend together:**

```bash
npm run dev
```

**Or run separately:**

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend  
npm run dev:frontend
```

### 6. Access the application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

### 7. First use

1. Open http://localhost:3000
2. Click "Create a new account"
3. Register with email and password
4. Upload a document (image or PDF)
5. Wait for OCR processing to complete
6. View extracted text and use AI features

## 📁 Project Structure

This is a monorepo containing:

```
paggo_case/
├── frontend/              # Next.js frontend application
│   ├── app/              # Next.js App Router pages
│   │   ├── auth/        # Authentication pages (login, register)
│   │   ├── documents/   # Document management pages
│   │   └── api/         # NextAuth API routes
│   ├── components/      # React components
│   └── lib/             # Utilities, API client, types
│
├── backend/              # NestJS backend application
│   ├── src/
│   │   ├── auth/        # Authentication module (JWT)
│   │   ├── documents/   # Document management module
│   │   ├── ocr/         # OCR processing service
│   │   ├── llm/         # LLM integration service
│   │   ├── prisma/      # Prisma database service
│   │   └── common/      # Shared utilities and filters
│   ├── prisma/          # Database schema and migrations
│   └── uploads/         # Uploaded document files
│
└── package.json         # Root workspace configuration
```

### Key Files Explanation

**Frontend:**
- `app/` - Next.js pages and routes
- `lib/api.ts` - API service functions
- `lib/api-client.ts` - Axios HTTP client configuration
- `lib/types.ts` - TypeScript type definitions
- `components/ThemeToggle.tsx` - Dark mode toggle component

**Backend:**
- `src/main.ts` - Application entry point
- `src/app.module.ts` - Root module configuration
- `src/auth/` - User authentication (register, login, JWT)
- `src/documents/` - Document CRUD, upload, download
- `src/ocr/` - Text extraction from images/PDFs
- `src/llm/` - OpenAI API integration for explanations/queries
- `prisma/schema.prisma` - Database schema definition

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, NextAuth.js
- **Backend**: NestJS 11, TypeScript, Prisma ORM, Tesseract.js, OpenAI API
- **Database**: SQLite (development) / PostgreSQL (production)

## 📡 API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List all user documents
- `GET /api/documents/:id` - Get document details
- `POST /api/documents/:id/explain` - Generate AI explanation
- `POST /api/documents/:id/query` - Query document with AI
- `GET /api/documents/:id/download` - Download document with extracted data

## 🐛 Troubleshooting

- **Backend won't start**: Check port 3001 is available, verify `.env` file exists
- **Frontend won't start**: Check port 3000 is available, verify `.env.local` exists
- **OCR not working**: Ensure `backend/uploads` directory exists, check file size/format
- **LLM features failing**: Verify `OPENAI_API_KEY` is set correctly in `backend/.env`

## 📝 Notes

- The application uses SQLite for local development (no setup required)
- For production deployment, PostgreSQL is recommended
- File uploads are stored locally in `backend/uploads/`
- OCR processing happens asynchronously after upload
