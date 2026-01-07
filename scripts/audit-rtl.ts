#!/usr/bin/env npx tsx
/**
 * RTL Audit Script
 * Scans source files for physical direction classes that may cause RTL layout issues.
 * Run with: npx tsx scripts/audit-rtl.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface AllowlistConfig {
  description: string;
  allowedFiles: string[];
  allowedPatterns: string[];
}

// Physical direction classes that may break RTL layouts
const RISKY_PATTERNS = [
  // Text alignment (use text-start/text-end instead)
  /\btext-left\b/g,
  /\btext-right\b/g,
  // Justify (use justify-start/justify-end with RTL awareness)
  // Note: justify-start/end are fine, but raw left/right are risky
  /\bjustify-left\b/g,
  /\bjustify-right\b/g,
  // Physical margins (use ms-*/me-* instead)
  /\bml-\d+\b/g,
  /\bmr-\d+\b/g,
  /\bml-auto\b/g,
  /\bmr-auto\b/g,
  /\bml-\[\w+\]\b/g,
  /\bmr-\[\w+\]\b/g,
  // Physical padding (use ps-*/pe-* instead)
  /\bpl-\d+\b/g,
  /\bpr-\d+\b/g,
  /\bpl-\[\w+\]\b/g,
  /\bpr-\[\w+\]\b/g,
  // Physical positioning (use start-*/end-* instead)
  /\bleft-\d+\b/g,
  /\bright-\d+\b/g,
  /\bleft-\[\w+\]\b/g,
  /\bright-\[\w+\]\b/g,
  /\bleft-0\b/g,
  /\bright-0\b/g,
  /\bleft-auto\b/g,
  /\bright-auto\b/g,
  // Border radius physical (use rounded-s-*/rounded-e-* instead)
  /\brounded-l-\w+\b/g,
  /\brounded-r-\w+\b/g,
  /\brounded-tl-\w+\b/g,
  /\brounded-tr-\w+\b/g,
  /\brounded-bl-\w+\b/g,
  /\brounded-br-\w+\b/g,
  // Space-x breaks in RTL (use gap-* instead)
  /\bspace-x-\d+\b/g,
  /\bspace-x-\[\w+\]\b/g,
];

// File extensions to scan
const FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// Directories to skip
const SKIP_DIRS = ['node_modules', 'dist', '.git', 'build', 'coverage'];

function loadAllowlist(): AllowlistConfig {
  const allowlistPath = path.join(process.cwd(), 'scripts', 'rtl-allowlist.json');
  try {
    const content = fs.readFileSync(allowlistPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      description: 'RTL audit allowlist',
      allowedFiles: [],
      allowedPatterns: [],
    };
  }
}

function isAllowlisted(filePath: string, match: string, allowlist: AllowlistConfig): boolean {
  // Check if file is allowlisted
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (allowlist.allowedFiles.some(pattern => normalizedPath.includes(pattern))) {
    return true;
  }
  
  // Check if pattern is allowlisted
  if (allowlist.allowedPatterns.some(pattern => match.includes(pattern))) {
    return true;
  }
  
  return false;
}

function scanFile(filePath: string, allowlist: AllowlistConfig): { file: string; line: number; match: string; pattern: string }[] {
  const issues: { file: string; line: number; match: string; pattern: string }[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // Skip comments and imports that might have false positives
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
        return;
      }
      
      for (const pattern of RISKY_PATTERNS) {
        const matches = line.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (!isAllowlisted(filePath, match, allowlist)) {
              issues.push({
                file: filePath,
                line: lineIndex + 1,
                match,
                pattern: pattern.source,
              });
            }
          }
        }
      }
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  
  return issues;
}

function walkDir(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) {
        walkDir(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (FILE_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function main() {
  console.log('========================================');
  console.log('       RTL Audit Report');
  console.log('========================================\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('Error: src directory not found');
    process.exit(1);
  }
  
  const allowlist = loadAllowlist();
  const files = walkDir(srcDir);
  let allIssues: { file: string; line: number; match: string; pattern: string }[] = [];
  
  for (const file of files) {
    const issues = scanFile(file, allowlist);
    allIssues = allIssues.concat(issues);
  }
  
  console.log(`📁 Files scanned: ${files.length}`);
  console.log(`📋 Allowlisted files: ${allowlist.allowedFiles.length}`);
  console.log(`📋 Allowlisted patterns: ${allowlist.allowedPatterns.length}\n`);
  
  if (allIssues.length === 0) {
    console.log('✅ No RTL issues found!\n');
    console.log('========================================');
    process.exit(0);
  }
  
  console.log(`❌ Found ${allIssues.length} potential RTL issues:\n`);
  
  // Group by file
  const issuesByFile = new Map<string, typeof allIssues>();
  for (const issue of allIssues) {
    const relativePath = path.relative(process.cwd(), issue.file);
    if (!issuesByFile.has(relativePath)) {
      issuesByFile.set(relativePath, []);
    }
    issuesByFile.get(relativePath)!.push(issue);
  }
  
  for (const [file, issues] of issuesByFile) {
    console.log(`\n📄 ${file}:`);
    for (const issue of issues) {
      console.log(`   Line ${issue.line}: "${issue.match}"`);
    }
  }
  
  console.log('\n========================================');
  console.log('💡 Suggested replacements:');
  console.log('   ml-* → ms-* (margin-inline-start)');
  console.log('   mr-* → me-* (margin-inline-end)');
  console.log('   pl-* → ps-* (padding-inline-start)');
  console.log('   pr-* → pe-* (padding-inline-end)');
  console.log('   left-* → start-* (inset-inline-start)');
  console.log('   right-* → end-* (inset-inline-end)');
  console.log('   text-left → text-start');
  console.log('   text-right → text-end');
  console.log('   rounded-l-* → rounded-s-*');
  console.log('   rounded-r-* → rounded-e-*');
  console.log('========================================\n');
  
  console.log('To allowlist files or patterns, edit scripts/rtl-allowlist.json\n');
  
  process.exit(1);
}

main();
