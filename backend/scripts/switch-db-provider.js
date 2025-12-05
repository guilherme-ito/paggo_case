#!/usr/bin/env node

/**
 * Automatically switch Prisma schema provider based on DATABASE_URL
 * - If DATABASE_URL starts with "postgresql://" -> use PostgreSQL
 * - If DATABASE_URL starts with "file:" -> use SQLite
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const databaseUrl = process.env.DATABASE_URL || '';

// Determine provider based on DATABASE_URL
let targetProvider;
if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
  targetProvider = 'postgresql';
} else if (databaseUrl.startsWith('file:')) {
  targetProvider = 'sqlite';
} else {
  // Default to sqlite for local development
  targetProvider = 'sqlite';
}

// Read current schema
let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

// Get current provider
const currentProviderMatch = schemaContent.match(/provider\s*=\s*"(\w+)"/);
const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;

// Switch if needed
if (currentProvider !== targetProvider) {
  schemaContent = schemaContent.replace(
    /provider\s*=\s*"\w+"/,
    `provider = "${targetProvider}"`
  );
  
  fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
  console.log(`✓ Switched Prisma provider from ${currentProvider} to ${targetProvider} (based on DATABASE_URL)`);
} else {
  console.log(`✓ Prisma provider is already set to ${targetProvider}`);
}

