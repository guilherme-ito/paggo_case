# Paggo OCR Case

Fullstack application for document OCR processing with LLM integration. Upload documents (images or PDFs), extract text using OCR, and interact with the extracted data using AI-powered explanations and queries.

## 🚀 Live Application

**Deployed App:** [Live Demo](https://frontend-eight-nu-18.vercel.app)

- Frontend: [https://frontend-eight-nu-18.vercel.app](https://frontend-eight-nu-18.vercel.app)
- Backend API: [https://paggocase-production.up.railway.app/api](https://paggocase-production.up.railway.app/api)

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker & Docker Compose** (for local PostgreSQL database)
- **OpenAI API Key** (optional, for LLM features)

## 🔧 Local Setup and Running

### Quick Start

Simply run the startup script:

```bash
npm start
```

Or directly:
```bash
bash start.sh
```

### What the Script Does

The startup script automatically handles everything for you:

- ✅ **Checks prerequisites** - Verifies Node.js, npm, and Docker are installed
- ✅ **Starts Docker** - Ensures Docker Desktop is running (starts it if needed)
- ✅ **Starts PostgreSQL** - Launches the database container if not already running
- ✅ **Creates environment files** - Generates `.env` files from examples if they don't exist
- ✅ **Installs dependencies** - Installs npm packages only if `node_modules` don't exist
- ✅ **Sets up database** - Generates Prisma client and runs migrations
- ✅ **Creates directories** - Sets up uploads folder and other required directories
- ✅ **Starts application** - Launches both frontend and backend servers

**Safe to run multiple times** - The script checks if things are already set up and skips those steps, so you can run it anytime without issues.

### Access the Application

Once the script finishes starting:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

### First Use

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
- **Database**: PostgreSQL (both local and production)

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

- **Database**: The application uses PostgreSQL for both local development (via Docker) and production (Railway). This ensures consistency and eliminates schema switching issues.
- File uploads are stored locally in `backend/uploads/`
- OCR processing happens asynchronously after upload
- **Docker**: The local PostgreSQL database runs in Docker. Use `npm run docker:up` to start it and `npm run docker:down` to stop it.
