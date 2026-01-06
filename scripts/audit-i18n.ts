/**
 * i18n Key Audit Script
 * 
 * Scans codebase for t('...'), tGlobal('...'), .t('...') and verifies keys exist.
 * Run: npx tsx scripts/audit-i18n.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../src');
const ALLOWLIST_PATH = path.resolve(__dirname, 'i18n-allowlist.json');

// Patterns to detect i18n key usage
const T_PATTERN = /\bt\(['"]([^'"]+)['"]\)/g;
const T_GLOBAL_PATTERN = /\btGlobal\(['"]([^'"]+)['"]\)/g;
const DOT_T_PATTERN = /\.t\(['"]([^'"]+)['"]\)/g;

// Dynamic key patterns (template literals)
const DYNAMIC_PATTERNS = [
  /\bt\(`([^`]*)\$\{[^}]+\}[^`]*`\)/g,
  /\btGlobal\(`([^`]*)\$\{[^}]+\}[^`]*`\)/g,
];

interface AuditResult {
  usedKeys: Set<string>;
  dynamicKeys: Array<{ file: string; pattern: string }>;
  dotTKeys: Array<{ file: string; key: string }>;
  missingInEn: string[];
  missingInAr: string[];
}

interface Allowlist {
  description?: string;
  dynamicPatterns: string[];
}

function loadAllowlist(): Allowlist {
  try {
    if (fs.existsSync(ALLOWLIST_PATH)) {
      return JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf-8'));
    }
  } catch (e) {
    console.warn('Warning: Could not load allowlist file');
  }
  return { dynamicPatterns: [] };
}

function extractKeys(dir: string): {
  staticKeys: Set<string>;
  dynamicKeys: Array<{ file: string; pattern: string }>;
  dotTKeys: Array<{ file: string; key: string }>;
} {
  const staticKeys = new Set<string>();
  const dynamicKeys: Array<{ file: string; pattern: string }> = [];
  const dotTKeys: Array<{ file: string; key: string }> = [];
  
  function scanFile(filePath: string) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    if (filePath.includes('/locales/')) return;
    if (filePath.includes('node_modules')) return;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = filePath.replace(dir, '');
    
    // Extract t('key') patterns
    T_PATTERN.lastIndex = 0;
    let match;
    while ((match = T_PATTERN.exec(content)) !== null) {
      staticKeys.add(match[1]);
    }
    
    // Extract tGlobal('key') patterns
    T_GLOBAL_PATTERN.lastIndex = 0;
    while ((match = T_GLOBAL_PATTERN.exec(content)) !== null) {
      staticKeys.add(match[1]);
    }
    
    // Extract .t('key') patterns - WARNING only (may be false positives)
    DOT_T_PATTERN.lastIndex = 0;
    while ((match = DOT_T_PATTERN.exec(content)) !== null) {
      // Only add if it looks like an i18n key (has dots for nesting)
      if (match[1].includes('.')) {
        dotTKeys.push({ file: relativePath, key: match[1] });
      }
    }
    
    // Detect dynamic keys
    for (const pattern of DYNAMIC_PATTERNS) {
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        const truncated = match[0].length > 60 ? match[0].substring(0, 57) + '...' : match[0];
        dynamicKeys.push({ file: relativePath, pattern: truncated });
      }
    }
  }
  
  function scanDir(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        scanFile(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return { staticKeys, dynamicKeys, dotTKeys };
}

function getNestedValue(obj: any, keyPath: string): any {
  return keyPath.split('.').reduce((acc, part) => acc?.[part], obj);
}

async function loadLocales(): Promise<{ en: any; ar: any }> {
  // Support both named and default exports
  const enModule = await import('../src/i18n/locales/en.js');
  const arModule = await import('../src/i18n/locales/ar.js');
  
  // Try named export first, then default export
  const en = enModule.en || enModule.default?.en || enModule.default;
  const ar = arModule.ar || arModule.default?.ar || arModule.default;
  
  if (!en || !ar) {
    throw new Error('Could not load locale files. Check export format.');
  }
  
  return { en, ar };
}

async function runAudit(): Promise<AuditResult> {
  const { staticKeys, dynamicKeys, dotTKeys } = extractKeys(SRC_DIR);
  const { en, ar } = await loadLocales();
  
  const missingInEn: string[] = [];
  const missingInAr: string[] = [];
  
  for (const key of staticKeys) {
    if (getNestedValue(en, key) === undefined) {
      missingInEn.push(key);
    }
    if (getNestedValue(ar, key) === undefined) {
      missingInAr.push(key);
    }
  }
  
  return {
    usedKeys: staticKeys,
    dynamicKeys,
    dotTKeys,
    missingInEn,
    missingInAr,
  };
}

// Main execution
runAudit().then((result) => {
  const allowlist = loadAllowlist();
  
  console.log('\n========================================');
  console.log('       i18n Key Audit Report');
  console.log('========================================\n');
  
  console.log(`Total static keys used: ${result.usedKeys.size}`);
  console.log(`Dynamic keys found: ${result.dynamicKeys.length}`);
  console.log(`.t('...') patterns: ${result.dotTKeys.length}`);
  console.log(`Missing in en.ts: ${result.missingInEn.length}`);
  console.log(`Missing in ar.ts: ${result.missingInAr.length}`);
  
  if (result.missingInEn.length > 0) {
    console.log('\n❌ MISSING KEYS IN en.ts:');
    result.missingInEn.sort().forEach(k => console.log(`  - ${k}`));
  }
  
  if (result.missingInAr.length > 0) {
    console.log('\n❌ MISSING KEYS IN ar.ts:');
    result.missingInAr.sort().forEach(k => console.log(`  - ${k}`));
  }
  
  if (result.dynamicKeys.length > 0) {
    console.log('\n⚠️  DYNAMIC KEYS (cannot be statically verified):');
    result.dynamicKeys.forEach(k => console.log(`  - ${k.file}: ${k.pattern}`));
    if (allowlist.dynamicPatterns.length > 0) {
      console.log('\n📋 Allowlisted patterns:');
      allowlist.dynamicPatterns.forEach(p => console.log(`  ✓ ${p}`));
    }
  }
  
  if (result.dotTKeys.length > 0) {
    console.log('\n⚠️  .t() PATTERNS (warning only - verify manually):');
    const uniqueDotT = result.dotTKeys.slice(0, 10);
    uniqueDotT.forEach(k => console.log(`  - ${k.file}: ${k.key}`));
    if (result.dotTKeys.length > 10) {
      console.log(`  ... and ${result.dotTKeys.length - 10} more`);
    }
  }
  
  if (result.missingInEn.length === 0 && result.missingInAr.length === 0) {
    console.log('\n✅ All static i18n keys are properly defined!');
  }
  
  console.log('\n========================================\n');
  
  // Exit with error if missing keys
  const exitCode = result.missingInEn.length + result.missingInAr.length > 0 ? 1 : 0;
  process.exit(exitCode);
}).catch((error) => {
  console.error('Audit failed:', error);
  process.exit(1);
});
