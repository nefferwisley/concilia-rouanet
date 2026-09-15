# Agente Avaliador de Dados de Projetos

Ferramenta local e determinística para comparar planilhas de controle com um
snapshot do RouanetConcilia. Ela não chama serviços de IA, não envia dados para
a internet e nunca altera os arquivos-fonte.

## O que o agente verifica

- Detecta planilhas Excel pela assinatura do arquivo, inclusive quando a
  extensão está incorreta (por exemplo, um XLSX chamado `.csv`).
- Ignora metadados `__MACOSX`, `.DS_Store` e arquivos AppleDouble `._*`.
- Separa créditos/entradas de débitos/pagamentos.
- Exclui totais e fórmulas-resumo da lista de lançamentos.
- Compara contagens, totais e fingerprints por tipo, data e valor.
- Propõe inclusões e atualizações somente quando o pareamento é determinístico.
- Mantém exclusões, linhas incompletas e projetos sem ID confirmado em
  quarentena para revisão humana.
- Registra hash SHA-256 da fonte, valor anterior, valor esperado, regra,
  confiança e referência da linha de origem.

## Uso

```powershell
npm run evaluate:data -- `
  --source "proj-1961=C:\caminho\3. 1961" `
  --source "proj-211623=C:\caminho\27º É Tudo Verdade" `
  --snapshot "C:\caminho\snapshot-exportado.json" `
  --output "artifacts\data-evaluator\auditoria" `
  --write-staging
```

Sem `--snapshot`, o agente compara com os dados iniciais atualmente embarcados
em `src/data/mockData.ts`. A opção `--write-staging` cria
`snapshot.staged.json`; ela não modifica o snapshot usado como entrada.

## Saídas

- `evaluation-report.json`: inventário, métricas e divergências.
- `correction-plan.json`: operações determinísticas propostas.
- `quarantine.json`: decisões que exigem uma pessoa revisora.
- `snapshot.staged.json`: cópia com as operações seguras aplicadas, quando
  `--write-staging` é solicitado.

Antes de levar um staging ao banco online, rode o agente novamente usando o
arquivo staged como `--snapshot`. O resultado esperado para um projeto pronto é
zero correções e zero itens em quarentena.
