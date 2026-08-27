const fs = require('fs');
const code = fs.readFileSync('src/data/mockData.ts', 'utf8');
const match = code.match(/export const initialRubrics: Record<string, BudgetRubric\[\]> = (\{[\s\S]*?\});\n/);
if (match) {
  const objText = match[1];
  const obj = new Function('return ' + objText)();
  const r = obj['proj-1961'];
  const getItemNum = (r) => r.itemNumero || r.id.replace('rub-1961-', '') || '1.0';
  const leaves = r.filter(x => !r.some(y => y !== x && getItemNum(y).startsWith(getItemNum(x) + '.')));
  const totalL = leaves.reduce((a, b) => a + (b.valorTotalAprovado || 0), 0);
  console.log('Total leaves Aprovado:', totalL);
  const totalAll = r.reduce((a, b) => a + (b.valorTotalAprovado || 0), 0);
  console.log('Total all Aprovado:', totalAll);
} else {
  console.log('Not found');
}
