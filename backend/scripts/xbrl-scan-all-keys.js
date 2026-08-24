import fs from 'fs';
import path from 'path';

// Point to the root data_node directory
const dataNode = path.resolve(process.cwd(), '../data_node');
const allKeys = new Set();
const companyKeys = {};

function scanDir(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Data directory not found at: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.xml') && file.includes('xbrl')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Matches the basic XBRL taxonomy tags inside context boundaries
      const regex = /<([^:>\s]+:)?([a-zA-Z0-9_]+)[^>]*contextRef="([^"]+)"[^>]*>([^<]+)<\//g;
      
      const ticker = fullPath.split(path.sep)[fullPath.split(path.sep).length - 3];
      if (!companyKeys[ticker]) companyKeys[ticker] = new Set();
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        const key = match[2];
        allKeys.add(key);
        companyKeys[ticker].add(key);
      }
    }
  }
}

console.log("Scanning XBRL XML files for unique dictionary keys...");
scanDir(dataNode);

console.log(`\nTotal unique XBRL keys found across all companies: ${allKeys.size}`);
console.log(`\n[Keys related to Equity]`);
Array.from(allKeys).filter(k => k.toLowerCase().includes('equity')).forEach(k => console.log('  - ' + k));

console.log(`\n[Keys related to Depreciation/Amortisation]`);
Array.from(allKeys).filter(k => k.toLowerCase().includes('depreciation') || k.toLowerCase().includes('amortisation')).forEach(k => console.log('  - ' + k));

console.log(`\n[Keys related to Receivables]`);
Array.from(allKeys).filter(k => k.toLowerCase().includes('receivable')).forEach(k => console.log('  - ' + k));

console.log(`\n[Keys related to Inventory]`);
Array.from(allKeys).filter(k => k.toLowerCase().includes('inventor')).forEach(k => console.log('  - ' + k));

console.log(`\n[Keys related to Payables]`);
Array.from(allKeys).filter(k => k.toLowerCase().includes('payable')).forEach(k => console.log('  - ' + k));

console.log(`\n[Keys related to Borrowings]`);
Array.from(allKeys).filter(k => k.toLowerCase().includes('borrowing')).forEach(k => console.log('  - ' + k));

console.log(`\n[Keys related to Taxes]`);
Array.from(allKeys).filter(k => k.toLowerCase().includes('tax')).forEach(k => console.log('  - ' + k));
