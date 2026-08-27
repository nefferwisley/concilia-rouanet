const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.ts', 'utf8');

content = content.replace(/"tipo":\s*"Bilhete de Passagem \(BP-e\)"/g, '"tipo": "Bilhete de Passagem Aérea (BP-e / E-Ticket)"');
content = content.replace(/"tipo":\s*"Recibo de Verba"/g, '"tipo": "Recibo de Diária / Verba de Alimentação"');
content = content.replace(/"tipo":\s*"RPA \(Aut.+nomo\)"/g, '"tipo": "RPA (Autônomo)"');

fs.writeFileSync('src/data/mockData.ts', content, 'utf8');
