#!/bin/bash

# Paggo OCR Case - Local Development Startup Script
# This script handles all setup and starts the application

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Paggo OCR Case - Starting Local Development${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📦 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js >= 18.0.0${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

if ! command_exists npm; then
    echo -e "${RED}✗ npm is not installed. Please install npm >= 9.0.0${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

if ! command_exists docker; then
    echo -e "${RED}✗ Docker is not installed. Please install Docker Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

echo ""

# Check if Docker is running
echo -e "${YELLOW}🐳 Checking Docker status...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Attempting to start Docker Desktop...${NC}"
    # Try to start Docker Desktop (Windows)
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        start "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>/dev/null || true
        echo -e "${YELLOW}   Waiting for Docker to start (this may take 30-60 seconds)...${NC}"
        for i in {1..30}; do
            if docker info >/dev/null 2>&1; then
                echo -e "${GREEN}✓ Docker is now running${NC}"
                break
            fi
            sleep 2
        done
        if ! docker info >/dev/null 2>&1; then
            echo -e "${RED}✗ Docker failed to start. Please start Docker Desktop manually and run this script again.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Docker is not running. Please start Docker and run this script again.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Docker is running${NC}"
fi
echo ""

# Check if PostgreSQL container is running
echo -e "${YELLOW}🗄️  Checking PostgreSQL database...${NC}"
if docker ps --format '{{.Names}}' | grep -q "^paggo_postgres$"; then
    echo -e "${GREEN}✓ PostgreSQL container is already running${NC}"
else
    echo -e "${YELLOW}   Starting PostgreSQL container...${NC}"
    if docker-compose up -d postgres 2>/dev/null || docker compose up -d postgres 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL container started${NC}"
        echo -e "${YELLOW}   Waiting for database to be ready...${NC}"
        sleep 5
    else
        echo -e "${RED}✗ Failed to start PostgreSQL container${NC}"
        exit 1
    fi
fi
echo ""

# Check if .env files exist
echo -e "${YELLOW}⚙️  Checking environment files...${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}   Creating backend/.env from env.example...${NC}"
    if [ -f "backend/env.example" ]; then
        cp backend/env.example backend/.env
        # Update DATABASE_URL for local PostgreSQL
        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
            # Windows Git Bash
            sed -i 's|DATABASE_URL="postgresql://.*"|DATABASE_URL="postgresql://paggo_user:paggo_password@localhost:5433/paggo_db?schema=public"|' backend/.env
        else
            # Linux/Mac
            sed -i.bak 's|DATABASE_URL="postgresql://.*"|DATABASE_URL="postgresql://paggo_user:paggo_password@localhost:5433/paggo_db?schema=public"|' backend/.env
            rm -f backend/.env.bak
        fi
        echo -e "${GREEN}✓ Backend .env file created${NC}"
    else
        echo -e "${YELLOW}⚠️  backend/env.example not found, skipping...${NC}"
    fi
else
    echo -e "${GREEN}✓ Backend .env file exists${NC}"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}   Creating frontend/.env.local from env.example...${NC}"
    if [ -f "frontend/env.example" ]; then
        cp frontend/env.example frontend/.env.local
        echo -e "${GREEN}✓ Frontend .env.local file created${NC}"
    else
        echo -e "${YELLOW}⚠️  frontend/env.example not found, skipping...${NC}"
    fi
else
    echo -e "${GREEN}✓ Frontend .env.local file exists${NC}"
fi
echo ""

# Install dependencies if node_modules don't exist
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}   Installing root dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Root dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Root dependencies already installed${NC}"
fi

if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}   Installing workspace dependencies...${NC}"
    npm install --workspaces
    echo -e "${GREEN}✓ Workspace dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Workspace dependencies already installed${NC}"
fi
echo ""

# Setup database
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
cd backend

# Generate Prisma client
echo -e "${YELLOW}   Generating Prisma client...${NC}"
if npm run prisma:generate >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma client generation had issues (may already be generated)${NC}"
fi

# Run migrations (only if needed)
echo -e "${YELLOW}   Checking database migrations...${NC}"
if npm run prisma:migrate >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Database migrations up to date${NC}"
else
    # Check if it's just "already in sync" message
    if npm run prisma:migrate 2>&1 | grep -q "Already in sync\|no schema change"; then
        echo -e "${GREEN}✓ Database is already in sync${NC}"
    else
        echo -e "${YELLOW}⚠️  Migration check completed (database may need manual setup)${NC}"
    fi
fi

cd ..
echo ""

# Create uploads directory
echo -e "${YELLOW}📁 Checking uploads directory...${NC}"
if [ ! -d "backend/uploads" ]; then
    mkdir -p backend/uploads
    echo -e "${GREEN}✓ Uploads directory created${NC}"
else
    echo -e "${GREEN}✓ Uploads directory exists${NC}"
fi
echo ""

# Start the application
echo -e "${CYAN}🎉 Starting application...${NC}"
echo -e "${CYAN}   Frontend: http://localhost:3000${NC}"
echo -e "${CYAN}   Backend API: http://localhost:3001/api${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the application${NC}"
echo ""

# Start both frontend and backend
npm run dev

