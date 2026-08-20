# Importação real e conciliação documental online

**Data:** 20 de agosto de 2026

**Status:** Aguardando revisão do usuário

**Aplicação-alvo:** `C:\Users\Dell\Downloads\concilia-rouanet`
**Projeto de validação:** pasta `C:\Users\Dell\Desktop\meu_sistema_rouanet\3. 1961`

## 1. Objetivo

Transformar a interface atual em uma aplicação online funcional que comece com o banco vazio, receba uma pasta de projeto cultural e construa a base de dados exclusivamente a partir dos arquivos importados.

O sistema deve confrontar três fontes independentes para cada despesa:

1. informação declarada na planilha manual;
2. movimentação encontrada no extrato bancário;
3. documentação comprobatória encontrada na pasta.

O produto deve permitir que uma pessoa acompanhe o processamento em tempo real, abra os documentos vinculados, revise sugestões automáticas e confirme se cada lançamento possui as evidências exigidas para conciliação e prestação de contas.

## 2. Decisões já aprovadas

- O painel começa sem projetos, lançamentos, métricas ou dados demonstrativos.
- Nenhum resultado anteriormente produzido para o projeto 1961 será usado como fonte de dados.
- A pasta escolhida pelo usuário é a única entrada do teste.
- A planilha manual localizada na raiz da pasta é a base declarada e deve ser confrontada, nunca tomada automaticamente como verdade bancária.
- O processamento será online e poderá usar OCR/inteligência artificial em nuvem, conforme autorização do usuário.
- A arquitetura será um monólito modular, com pacotes regulatórios separados para Lei Rouanet e FSA/ANCINE.
- A validação será híbrida: automação sugere e prioriza; decisões duvidosas ou financeiras relevantes permanecem sob aprovação humana.
- Dados ausentes não serão presumidos nem preenchidos para completar a interface.

## 3. Evidências do conjunto de teste

A pasta de validação contém 211 arquivos:

- 208 PDFs;
- 1 arquivo com extensão `.csv`;
- 1 documento Word;
- 1 arquivo de texto.

O arquivo `3. 1961.csv` não é um CSV textual. Sua assinatura interna corresponde a uma pasta de trabalho Excel compactada. Ele contém seis abas:

- conciliação;
- 1961 - para reembolsar;
- rubricas;
- Fluxo Amir;
- Custos Viagens;
- Reembolsos.

Consequentemente, o importador deve identificar o formato real pelo conteúdo e pela assinatura binária, não apenas pela extensão do nome.

## 4. Arquitetura

### 4.1 Componentes

1. **Frontend React/Vite na Vercel**
   - criação e navegação entre projetos;
   - upload de pasta preservando caminhos relativos;
   - painel de progresso;
   - lista e ficha individual de lançamentos;
   - revisão humana;
   - visualização protegida dos documentos;
   - painel de pendências e dossiê.

2. **Supabase**
   - autenticação;
   - PostgreSQL como fonte persistente dos dados;
   - Storage privado para os arquivos;
   - políticas RLS por organização, projeto e usuário;
   - eventos em tempo real por Broadcast;
   - trilha persistente dos resultados e decisões.

3. **Backend/worker FastAPI em serviço persistente**
   - coordenação de importações;
   - detecção de formatos;
   - parsing de planilhas e extratos;
   - OCR e extração estruturada de PDFs;
   - classificação documental;
   - conciliação e cálculo de confiança;
   - aplicação de regras regulatórias;
   - reprocessamento e tratamento de falhas.

4. **Serviço de OCR/IA em nuvem**
   - leitura de páginas sem texto selecionável;
   - classificação documental;
   - extração estruturada conforme esquema versionado;
   - retorno de campo, evidência, página e confiança;
   - nenhuma autoridade para aprovação financeira final.

### 4.2 Monólito modular

O backend será implantado como uma unidade, porém dividido em módulos com contratos explícitos:

- `ingestao`: inventário, hash, upload e fila;
- `planilhas`: identificação de abas, cabeçalhos, fórmulas e linhas declaradas;
- `extratos`: movimentos, identificadores bancários e normalização;
- `documentos`: classificação, OCR e evidências;
- `conciliacao`: correspondências, pontuação e conflitos;
- `regulatorio`: requisitos Rouanet e FSA/ANCINE;
- `revisao`: aprovação, rejeição, correção e justificativa;
- `auditoria`: eventos imutáveis e proveniência;
- `dossie`: verificação final e exportação.

Pacotes regulatórios implementam uma interface comum de requisitos documentais e validações. O projeto seleciona o pacote e sua versão; alterações futuras de regra não reescrevem a evidência original.

## 5. Fluxo de importação

### 5.1 Estado inicial

O banco não recebe seed de demonstração. A primeira tela apresenta lista vazia e a ação “Criar projeto”. Indicadores exibem zero ou “Ainda não calculado”.

### 5.2 Criação e upload

1. O usuário informa nome, identificador e pacote regulatório.
2. O frontend cria um projeto vazio.
3. O navegador lê a pasta com seleção de diretório e produz um manifesto local.
4. Cada entrada do manifesto contém caminho relativo, nome original, tamanho e tipo informado pelo navegador.
5. Os arquivos são enviados diretamente ao Storage privado, com retomada para uploads grandes.
6. O backend calcula ou confirma SHA-256, detecta o tipo real e cria o registro persistente.
7. O mesmo hash no mesmo projeto é marcado como duplicado e não cria nova evidência.

### 5.3 Processamento assíncrono

O fechamento do upload cria tarefas independentes por arquivo. Uma falha não interrompe os demais documentos.

Etapas exibidas ao usuário:

- recebendo;
- armazenado;
- identificando tipo;
- extraindo;
- classificado;
- conciliando;
- aguardando revisão;
- concluído;
- falhou.

O frontend recebe mudanças por canal privado do projeto. O evento informa somente identificadores e estado; o frontend busca os detalhes autorizados pela API.

### 5.4 Descoberta da planilha-base

O módulo de planilhas:

- inspeciona assinatura binária e estrutura interna;
- aceita `.xlsx`, `.xls`, `.ods`, CSV textual e Excel com extensão incorreta;
- pontua abas por cabeçalhos conhecidos, como controle, data, valor, fornecedor e rubrica;
- apresenta a aba candidata ao usuário antes da confirmação;
- preserva nome da aba, linha e coluna como proveniência;
- diferencia valores digitados de fórmulas e mantém ambos quando aplicável;
- ignora linhas totalizadoras e rodapés na criação dos lançamentos.

As linhas importadas recebem o status `declarada`, não `confirmada`.

### 5.5 Extratos

O módulo de extratos procura arquivos bancários por conteúdo e estrutura. Deve aceitar inicialmente:

- OFX;
- CSV bancário;
- planilha de extrato;
- PDF textual do Banco do Brasil;
- PDF digitalizado encaminhado ao OCR.

Cada movimento guarda data, histórico, valor, natureza, saldo quando disponível, conta mascarada, FITID/identificador, arquivo e página/linha de origem.

Movimentos são idempotentes por projeto, conta e identificador bancário. Quando não existe identificador, usa-se uma chave composta normalizada e o item é marcado para revisão caso haja colisão.

### 5.6 Documentos

Cada PDF é classificado como:

- documento fiscal;
- comprovante de pagamento;
- recibo/RPA;
- contrato;
- evidência complementar;
- extrato;
- documento não identificado.

Os campos extraídos são armazenados separadamente da classificação humana. Para cada campo devem existir arquivo, página, trecho delimitador, método, modelo/versão e confiança.

## 6. Modelo de dados

### 6.1 Entidades principais

- `organizations`: organização proprietária;
- `memberships`: vínculo do usuário e papel;
- `projects`: projeto, identificador, lei e pacote regulatório;
- `regulatory_packages`: lei, versão e vigência;
- `imports`: lote de upload e progresso;
- `import_files`: arquivo, caminho, hash, tipo detectado e estado;
- `source_sheets`: planilha, aba e esquema reconhecido;
- `declared_entries`: linhas da planilha manual;
- `bank_accounts`: conta vinculada com dados sensíveis mascarados;
- `bank_transactions`: movimentos do extrato;
- `documents`: classificação atual do documento;
- `document_fields`: valores extraídos e proveniência;
- `reconciliations`: lançamento lógico que reúne os três pilares;
- `evidence_links`: ligações entre lançamento e suas evidências;
- `issues`: pendências e divergências;
- `review_decisions`: decisão humana e justificativa;
- `audit_events`: evento anterior/novo, ator e data;
- `processing_jobs`: fila, tentativas, erro e tempos.

### 6.2 Relação central

Um `reconciliation` pode apontar para:

- uma linha declarada;
- uma movimentação bancária;
- zero ou mais documentos fiscais;
- zero ou mais comprovantes;
- zero ou mais evidências complementares;
- uma rubrica;
- pendências e decisões de revisão.

O vínculo não altera a fonte. A planilha, o extrato e o documento continuam armazenados como registros independentes e auditáveis.

## 7. Conciliação e confiança

### 7.1 Ordem de decisão

1. validar e normalizar os campos sem IA;
2. executar correspondência determinística por identificador, documento e valor;
3. aplicar correspondência probabilística aos itens restantes;
4. usar IA somente para explicar, classificar ou sugerir candidatos;
5. solicitar revisão humana conforme política e confiança.

### 7.2 Pontuação inicial configurável

- valor: 40%;
- proximidade de data: 20%;
- nome/CPF/CNPJ: 25%;
- número ou referência documental: 10%;
- tributos e coerência líquido/bruto: 5%.

Os pesos pertencem à versão do pacote regulatório e são registrados com o vínculo. O primeiro lançamento funcional não terá aprovação financeira silenciosa: até que os resultados sejam avaliados, toda sugestão automática ficará reversível e visível para aprovação humana.

### 7.3 Estados do lançamento

- não analisado;
- processando;
- correspondência provável;
- aguardando aprovação;
- completo;
- incompleto;
- divergente;
- erro de leitura.

“Completo” exige compatibilidade entre planilha, extrato e todos os documentos obrigatórios definidos pelo pacote regulatório. A ausência de uma fonte gera pendência explícita.

## 8. Experiência do usuário

### 8.1 Projetos

- estado vazio verdadeiro;
- criação de projeto;
- seleção de pasta;
- progresso por arquivo e etapa;
- retomada após atualizar ou fechar a página.

### 8.2 Painel executivo

- total declarado na planilha;
- total encontrado no extrato;
- total documentado;
- lançamentos completos, incompletos, divergentes e não identificados;
- arquivos processados, pendentes e com erro;
- origem e horário da última atualização.

Nenhuma métrica é exibida antes de ser calculada. O estado usa “Ainda não calculado” em vez de valores fictícios.

### 8.3 Lançamentos

- paginação e busca;
- filtros por estado, documento, valor, favorecido, rubrica e confiança;
- numeração sequencial;
- nome da pessoa e razão social/documento quando existirem;
- ficha individual sincronizada com a linha selecionada.

### 8.4 Ficha individual

Apresenta lado a lado:

- planilha-base;
- extrato;
- documento fiscal;
- comprovante;
- evidências complementares;
- diferenças e confiança;
- arquivos e páginas de origem;
- ações de aprovar, rejeitar, corrigir e substituir vínculo.

### 8.5 Documentos e pendências

O módulo de documentos mostra itens vinculados e não vinculados. Pendências são derivadas das evidências reais, nunca de contagens fixas. Cada pendência possui responsável, estado, prazo opcional e histórico.

### 8.6 Dossiê

O dossiê só é liberado quando as pendências bloqueadoras do pacote regulatório estiverem resolvidas ou justificadas por usuário autorizado.

## 9. API e eventos

Contratos mínimos:

- `POST /projects`: cria projeto vazio;
- `POST /projects/{id}/imports`: cria lote e manifesto;
- `POST /imports/{id}/upload-urls`: retorna destinos autorizados;
- `POST /imports/{id}/finalize`: valida manifesto e enfileira processamento;
- `GET /imports/{id}`: progresso agregado;
- `GET /projects/{id}/transactions`: lista paginada;
- `GET /reconciliations/{id}`: ficha e evidências;
- `PATCH /reconciliations/{id}/links`: correção de vínculo;
- `POST /reconciliations/{id}/decisions`: aprovação ou rejeição;
- `GET /documents/{id}/signed-url`: acesso temporário ao arquivo;
- `POST /jobs/{id}/retry`: reprocessamento autorizado.

As operações de escrita exigem chave de idempotência. Eventos em tempo real incluem projeto, importação, tipo, identificador, estado e versão; não incluem conteúdo sensível do documento.

## 10. Segurança e privacidade

- buckets privados;
- URLs assinadas de curta duração;
- RLS em todas as tabelas expostas;
- políticas por organização, associação e projeto;
- chave privilegiada disponível somente no backend;
- validação de tipo real, tamanho e integridade do arquivo;
- nomes de arquivos tratados como dados, nunca como comandos;
- isolamento entre projetos;
- conta bancária e documentos pessoais mascarados na interface quando desnecessários;
- registro de leitura, alteração e exportação;
- retenção e exclusão configuráveis;
- nenhuma credencial ou documento real incluído no repositório ou em fixtures públicas.

## 11. Tratamento de erros

- falha por arquivo não cancela o lote;
- tarefas usam tentativas limitadas com atraso progressivo;
- erros permanentes são enviados para fila de revisão;
- o usuário vê mensagem, arquivo, etapa e ação possível;
- reprocessamento cria nova tentativa sem apagar a evidência anterior;
- interrupções de upload podem ser retomadas;
- fechamento da página não interrompe o worker;
- dados parciais permanecem identificados como parciais;
- o sistema nunca converte erro de leitura em ausência confirmada de documento.

## 12. Auditoria

Todo evento relevante registra:

- organização e projeto;
- ator humano ou serviço;
- ação;
- estado anterior e novo;
- arquivo ou lançamento relacionado;
- regra/pacote regulatório aplicado;
- modelo e versão quando houver IA;
- data, justificativa e identificador de correlação.

Eventos de auditoria são anexados, não sobrescritos. Correções produzem novos eventos.

## 13. Estratégia de testes

### 13.1 Unidade

- detecção de formato por assinatura;
- leitura da planilha com extensão incorreta;
- identificação de cabeçalhos e linhas totalizadoras;
- normalização de moeda, data e CPF/CNPJ;
- parser de extratos;
- idempotência de arquivo e movimento;
- classificação de documentos;
- cálculo de pontuação e pendências;
- políticas de pacote regulatório.

### 13.2 Integração

- projeto vazio até o primeiro upload;
- upload privado com autorização;
- manifesto de 211 arquivos;
- processamento parcial diante de arquivo inválido;
- persistência após recarregar a página;
- eventos em tempo real;
- acesso negado entre organizações;
- repetição da mesma importação sem duplicidade;
- decisão humana refletida no lançamento e na auditoria.

### 13.3 Ponta a ponta com o projeto real

O teste usa a pasta local indicada pelo usuário, sem copiar seus documentos para o repositório. Deve provar:

- banco inicialmente vazio;
- um projeto criado pela importação;
- 211 arquivos inventariados;
- planilha-base detectada pelo conteúdo;
- movimentações criadas somente a partir dos arquivos;
- campos com fonte consultável;
- documentos acessíveis na ficha;
- pendências derivadas das evidências;
- atualização em tempo real;
- retomada após atualização da página;
- ausência de dados demonstrativos ou resultados antigos.

Os totais financeiros não serão definidos previamente como expectativa. Eles serão comparados com as fontes importadas e apresentados como resultado do teste.

## 14. Observabilidade

- métricas por etapa e duração;
- quantidade de arquivos por estado;
- taxa de erro de extração;
- taxa de vínculos sugeridos, aprovados e rejeitados;
- divergência entre valores declarados, bancários e documentados;
- logs com identificador de correlação e sem conteúdo sensível;
- alerta para lote parado ou fila acumulada.

## 15. Implantação incremental

1. banco vazio, autenticação e Storage privado;
2. criação de projeto, manifesto e upload retomável;
3. planilha-base e extratos;
4. inventário e visualização dos PDFs;
5. OCR e campos estruturados;
6. conciliação e ficha individual;
7. revisão humana e auditoria;
8. pacote FSA/ANCINE validado no projeto 1961;
9. pacote Rouanet e testes de regressão;
10. dossiê e exportações.

Cada etapa deve produzir uma demonstração verificável. Nenhuma etapa usa dados simulados no fluxo do projeto real.

## 16. Critérios de aceite

O primeiro teste funcional é aceito quando:

1. a aplicação abre com banco e painel vazios;
2. a seleção da pasta cria um projeto novo;
3. os 211 arquivos aparecem com estado real;
4. a planilha manual é reconhecida e suas linhas entram como declaradas;
5. extratos geram movimentos bancários independentes;
6. documentos classificados podem ser abertos no site;
7. cada lançamento mostra os três pilares e suas fontes;
8. documentos obrigatórios ausentes geram pendência;
9. sugestões ambíguas exigem aprovação humana;
10. atualizar a página preserva dados e progresso;
11. repetir a importação não duplica arquivos ou movimentos;
12. falhas ficam visíveis e podem ser reprocessadas;
13. todo valor exibido possui proveniência;
14. nenhuma informação demonstrativa ou resultado antigo aparece;
15. ações humanas são registradas na auditoria.

## 17. Fora do primeiro ciclo

- integração automática com internet banking;
- envio direto da prestação de contas ao MinC/ANCINE;
- aprovação automática irreversível;
- aplicativo móvel nativo;
- cobrança e assinatura comercial;
- migração de resultados antigos do projeto 1961;
- treinamento de modelo próprio.

Esses itens podem ser avaliados somente após o fluxo real de importação, conciliação e revisão ser validado.
