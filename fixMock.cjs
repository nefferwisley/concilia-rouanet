const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.ts', 'utf8');

// Replace Passagem
content = content.replace(/"tipo":\s*"[^"]+",\s*"numeroDoc":\s*"([^"]+)",\s*"dataEmissao":\s*"([^"]+)",\s*"fornecedorNome":\s*"([^"]+)",\s*"fornecedorCnpjCpf":\s*"([^"]+)",\s*"descricaoServico":\s*"([^"]*Passagem[^"]*)"/gi, 
  '"tipo": "Bilhete de Passagem (BP-e)",\n      "numeroDoc": "$1",\n      "dataEmissao": "$2",\n      "fornecedorNome": "$3",\n      "fornecedorCnpjCpf": "$4",\n      "descricaoServico": "$5"');

// Replace Alimentacao
content = content.replace(/"tipo":\s*"[^"]+",\s*"numeroDoc":\s*"([^"]+)",\s*"dataEmissao":\s*"([^"]+)",\s*"fornecedorNome":\s*"([^"]+)",\s*"fornecedorCnpjCpf":\s*"([^"]+)",\s*"descricaoServico":\s*"([^"]*alimenta[^"]*)"/gi, 
  '"tipo": "Recibo de Verba",\n      "numeroDoc": "$1",\n      "dataEmissao": "$2",\n      "fornecedorNome": "$3",\n      "fornecedorCnpjCpf": "$4",\n      "descricaoServico": "$5"');

// Replace Material
content = content.replace(/"tipo":\s*"[^"]+",\s*"numeroDoc":\s*"([^"]+)",\s*"dataEmissao":\s*"([^"]+)",\s*"fornecedorNome":\s*"([^"]+)",\s*"fornecedorCnpjCpf":\s*"([^"]+)",\s*"descricaoServico":\s*"([^"]*Material[^"]*)"/gi, 
  '"tipo": "NF-e (Produto)",\n      "numeroDoc": "$1",\n      "dataEmissao": "$2",\n      "fornecedorNome": "$3",\n      "fornecedorCnpjCpf": "$4",\n      "descricaoServico": "$5"');

// Replace RPA (let's pick Roteirista and Diretor as RPA)
content = content.replace(/"tipo":\s*"[^"]+",\s*"numeroDoc":\s*"([^"]+)",\s*"dataEmissao":\s*"([^"]+)",\s*"fornecedorNome":\s*"([^"]+)",\s*"fornecedorCnpjCpf":\s*"([^"]+)",\s*"descricaoServico":\s*"([^"]*(Roteirista|Diretor \()[^"]*)"/gi, 
  '"tipo": "RPA (Autônomo)",\n      "numeroDoc": "$1",\n      "dataEmissao": "$2",\n      "fornecedorNome": "$3",\n      "fornecedorCnpjCpf": "$4",\n      "descricaoServico": "$5"');

fs.writeFileSync('src/data/mockData.ts', content, 'utf8');
