const fs = require('fs');
const code = fs.readFileSync('src/data/mockData.ts', 'utf8');
const match = code.match(/export const initialDocuments: Record<string, FiscalDocument\[\]> = (\{[\s\S]*?\});\n/);
if (match) {
  const obj = new Function('return ' + match[1])();
  const r = obj['proj-1961'];
  if (r) {
    const tipos = new Set(r.map(d => d.tipo));
    console.log(Array.from(tipos));
  } else { console.log('proj-1961 not found'); }
} else {
  console.log('Not found');
}
