# 📝 Prompts Otimizados para Modelos Menores (Hermes, Qwen, Ollama, Flash-Lite)

Estes templates foram desenhados para modelos com menor capacidade de raciocínio. Eles usam **restrições determinísticas**, **delimitadores claros** e **formato de saída estrito**.

---

## 🎯 1. Prompt Mestre Universal (Para Qualquer Correção/Refatoração)

Copie e cole este prompt substituindo apenas `[ARQUIVO]` e `[TAREFA]`:

```markdown
Você é um programador sênior em TypeScript/Python focado no sistema "RouanetConcilia".

### 📋 REGRAS DE OURO DO PROJETO (NÃO VIOLE):
1. Projeto Canônico: PRONAC 19-1961 (R$ 835.000,00 aprovado | R$ 897.759,15 despesas).
2. Tripé MinC: Extrato BB (FITID) <-> Documento Fiscal <-> Rubrica Aprovada.
3. Não use bibliotecas externas não instaladas.
4. Mantenha os comentários e código existentes que não precisam ser alterados.
5. Tipagem estrita: sem 'any' desnecessário, sem quebrar interfaces existentes.

### 🎯 SUA TAREFA:
[DESCREVA A CORREÇÃO AQUI DE FORMA DIRETA]

### 📂 ARQUIVO ALVO:
[CAMINHO DO ARQUIVO]

### 📥 CÓDIGO ATUAL / TRECHO:
```
[COLE O TRECHO DE CÓDIGO QUE PRECISA DE CORREÇÃO]
```

### 📤 FORMATO DA RESPOSTA:
Retorne APENAS o bloco de código corrigido, sem explicações longas ou introduções.
```

---

## 🧪 2. Prompt para Geração de Testes Unitários (Pytest / Vitest)

```markdown
Escreva um teste unitário em [Pytest ou Vitest] para a seguinte função do sistema RouanetConcilia.

### Requisitos do Teste:
- Cobertura de caso de sucesso (caminho feliz).
- Cobertura de caso de borda / erro (valores negativos, campos vazios, tipos inválidos).
- Asserções estritas (assert resultado == esperado).
- Código pronto para rodar sem dependências extras.

### Função para Testar:
```
[COLE A FUNÇÃO AQUI]
```

Retorne APENAS o código do teste.
```

---

## 🔍 3. Prompt para Identificar e Corrigir Erros de TypeScript (TS2322, etc.)

```markdown
Corrija o seguinte erro de compilação TypeScript no projeto:

### ❌ Erro do Compilador:
[COLE O ERRO DO TSC, EX: "error TS2322: Type 'X' is not assignable to type 'Y'"]

### 📂 Definição de Tipos Atual:
```typescript
[COLE O TRECHO DO TYPES.TS OU COMPONENTE]
```

### 🎯 Ação:
Ajuste a tipagem para que o TypeScript compile com ZERO erros, preservando a semântica do projeto.
Retorne o trecho corrigido.
```

---

## ⚡ 4. Exemplo de Uso Prático via Terminal (Hermes / Ollama)

```powershell
python orquestrador_local.py --coder "
Você é um desenvolvedor Python. Ajuste a função abaixo para garantir que valores de moeda tenham 2 casas decimais e retorno float:

def formatar_valor(v):
    return float(v)

Retorne apenas a função corrigida com tratamento de exceção.
"
```
