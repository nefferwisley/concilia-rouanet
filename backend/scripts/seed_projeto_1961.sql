-- seed_projeto_1961.sql — Ingestão Alinhada do Projeto 1961

-- 1. Usuário auditor padrão
INSERT INTO auth.users (id, email, created_at)
VALUES ('840b3bf2-9520-423b-95cd-0c2557eef1db', 'auditor@cultura.gov.br', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir Projeto 1961
INSERT INTO projetos (
    id, pronac, nome, proponente, controller, banco,
    data_inicio, data_fim, orcamento_aprovado, valor_captado, created_at, updated_at
)
VALUES (
    '19611961-0000-0000-0000-000000001961',
    '19-1961/FSA-BRDE',
    '1961 (Longa-Metragem Documental - ANCINE/FSA)',
    'Circunstância Produções / Amir Labaki',
    'Mônica Guimarães',
    'Banco do Brasil (001)',
    '2022-10-01',
    '2025-12-31',
    835000.00,
    835000.00,
    NOW(),
    NOW()
)
ON CONFLICT (pronac) DO UPDATE SET
    orcamento_aprovado = 835000.00,
    valor_captado = 835000.00,
    updated_at = NOW();

-- 3. Membro Auditor com permissão admin no projeto 1961
INSERT INTO membros_projeto (id, projeto_id, user_id, papel, created_at)
VALUES (
    gen_random_uuid(),
    '19611961-0000-0000-0000-000000001961',
    '840b3bf2-9520-423b-95cd-0c2557eef1db',
    'admin',
    NOW()
)
ON CONFLICT (projeto_id, user_id) DO NOTHING;

-- 4. Inserir Rubricas Orçamentárias
INSERT INTO rubricas (id, projeto_id, codigo, descricao, descricao_completa, valor_orcado, created_at, updated_at)
VALUES
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '1.1', 'Roteiro e Pesquisa', 'Desenvolvimento - Roteiro e Pesquisa Histórica', 30000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '1.2', 'Direção Geral (Amir Labaki)', 'Desenvolvimento - Direção Geral', 60000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '2.1', 'Produção Executiva', 'Produção - Produção Executiva', 50000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '2.2', 'Equipe de Fotografia e Câmera', 'Produção - Direção de Fotografia e Operação', 95000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '2.3', 'Locação de Equipamentos e Som', 'Produção - Equipamentos de Áudio e Luz', 80000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '3.1', 'Montagem e Edição', 'Pós-Produção - Montagem e Corte Final', 75000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '3.2', 'Trilha Sonora e Mixagem', 'Pós-Produção - Trilha Sonora Original e Mixagem 5.1', 45000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '4.1', 'Assessoria de Imprensa e Divulgação', 'Comercialização - Lançamento e Imprensa', 40000.00, NOW(), NOW()),
    (gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '5.1', 'Custos Administrativos e Auditoria', 'Administração - Gestão Financeira e Auditoria', 40000.00, NOW(), NOW())
ON CONFLICT (projeto_id, codigo) DO UPDATE SET
    valor_orcado = EXCLUDED.valor_orcado,
    descricao = EXCLUDED.descricao,
    updated_at = NOW();
