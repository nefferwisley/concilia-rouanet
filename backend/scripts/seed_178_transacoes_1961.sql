-- Inserção em lote das 178 despesas do Projeto 1961
BEGIN;
DELETE FROM transacoes WHERE projeto_id = '19611961-0000-0000-0000-000000001961';
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2022-11-04',
            11000.00, 0.00, 11000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2022-11-04',
            30000.00, 0.00, 30000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2022-11-04',
            20000.00, 0.00, 20000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2022-11-04',
            5000.00, 0.00, 5000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Felipe G Rosa', '', '2022-11-10',
            1200.00, 0.00, 1200.00, true, true,
            'CONCILIADO_OK', 'Felipe G Rosa', 'Felipe G Rosa', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis Felipe Labaki', '26.591.927/0001-37', '2022-11-10',
            1200.00, 0.00, 1200.00, true, true,
            'CONCILIADO_OK', 'Luis Felipe Labaki', 'Luis Felipe Labaki', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis F Monte Cipullo', '442.561.298-12', '2022-11-21',
            800.00, 0.00, 800.00, true, true,
            'CONCILIADO_OK', 'Luis F Monte Cipullo', 'Luis F Monte Cipullo', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2022-11-28',
            20000.00, 0.00, 20000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2022-12-12',
            30000.00, 0.00, 30000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Julia Barbara Melo de Sousa 40926175', '29.399.659/0001-44', '2022-12-14',
            6000.00, 0.00, 6000.00, true, true,
            'CONCILIADO_OK', 'Julia Barbara Melo de Sousa 40926175', 'Julia Barbara Melo de Sousa 40926175', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Planifilmes Ltda', '61.374.229/0001-80', '2022-12-14',
            2000.00, 0.00, 2000.00, true, true,
            'CONCILIADO_OK', 'Planifilmes Ltda', 'Planifilmes Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2022-12-20',
            20000.00, 0.00, 20000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2023-01-23',
            30000.00, 0.00, 30000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2023-01-23',
            4500.00, 0.00, 4500.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2023-02-22',
            19550.00, 0.00, 19550.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Circunstancia Cinematografica e Prod', '11.400.274/0001-94', '2023-07-03',
            25000.00, 0.00, 25000.00, true, true,
            'CONCILIADO_OK', 'Circunstancia Cinematografica e Prod', 'Circunstancia Cinematografica e Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mog Produtora', '7.007.705/0001-80', '2023-07-03',
            25000.00, 0.00, 25000.00, true, true,
            'CONCILIADO_OK', 'Mog Produtora', 'Mog Produtora', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Radio e Televisao Bandeirantes S.a.', '60.509.239/0001-13', '2023-08-18',
            380.00, 0.00, 380.00, true, true,
            'CONCILIADO_OK', 'Radio e Televisao Bandeirantes S.a.', 'Radio e Televisao Bandeirantes S.a.', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Memoria Coletiva Imagens e Textos Lt', '7.922.433/0001-43', '2023-08-25',
            10500.00, 0.00, 10500.00, true, true,
            'CONCILIADO_OK', 'Memoria Coletiva Imagens e Textos Lt', 'Memoria Coletiva Imagens e Textos Lt', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Porviroscopio Projetos C. C. Ltda', '47.647.727/0001-29', '2023-09-04',
            700.00, 0.00, 700.00, true, true,
            'CONCILIADO_OK', 'Porviroscopio Projetos C. C. Ltda', 'Porviroscopio Projetos C. C. Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'favorecido', '05.111.581/0001-52', '2023-09-05',
            33000.00, 0.00, 33000.00, true, true,
            'CONCILIADO_OK', 'favorecido', 'favorecido', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', ':', '11.400.274/0001-94', '2023-09-05',
            120.00, 0.00, 120.00, true, true,
            'CONCILIADO_OK', ':', ':', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Julia Barbara Melo de Sousa 40926175', '29.399.659/0001-44', '2023-09-06',
            4900.00, 0.00, 4900.00, true, true,
            'CONCILIADO_OK', 'Julia Barbara Melo de Sousa 40926175', 'Julia Barbara Melo de Sousa 40926175', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Ana Beatriz Hermanson Pomar Servicos', '34.179.595/0001-06', '2023-09-11',
            3000.00, 0.00, 3000.00, true, true,
            'CONCILIADO_OK', 'Ana Beatriz Hermanson Pomar Servicos', 'Ana Beatriz Hermanson Pomar Servicos', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            2870.87, 0.00, 2870.87, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            2870.87, 0.00, 2870.87, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            2870.87, 0.00, 2870.87, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            2870.87, 0.00, 2870.87, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            1524.64, 0.00, 1524.64, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            1524.64, 0.00, 1524.64, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            1524.64, 0.00, 1524.64, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Gol Linhas Aéreas', '7.575.651/0004-00', '2023-09-20',
            1524.64, 0.00, 1524.64, true, true,
            'CONCILIADO_OK', 'Gol Linhas Aéreas', 'Gol Linhas Aéreas', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'LUIS FELIPE LABAKI', '', '2023-09-26',
            10000.00, 0.00, 10000.00, true, false,
            'PENDENTE', 'LUIS FELIPE LABAKI', 'LUIS FELIPE LABAKI', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'ANA BEATRIZ HERMANSON POMA', '', '2023-09-26',
            3000.00, 0.00, 3000.00, true, false,
            'PENDENTE', 'ANA BEATRIZ HERMANSON POMA', 'ANA BEATRIZ HERMANSON POMA', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Filmes de Taipa Prod', '28.105.588/0001-67', '2023-09-26',
            11250.00, 0.00, 11250.00, true, true,
            'CONCILIADO_OK', 'Filmes de Taipa Prod', 'Filmes de Taipa Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Casa do Roadie', '9.400.918/0001-00', '2023-09-28',
            350.00, 0.00, 350.00, true, true,
            'CONCILIADO_OK', 'Casa do Roadie', 'Casa do Roadie', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Sofia V Baccarini', '', '2023-09-28',
            1000.00, 0.00, 1000.00, true, true,
            'CONCILIADO_OK', 'Sofia V Baccarini', 'Sofia V Baccarini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Manfrim', '', '2023-09-28',
            1000.00, 0.00, 1000.00, true, true,
            'CONCILIADO_OK', 'Andre Lima Manfrim', 'Andre Lima Manfrim', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Casa do Roadie', '9.400.918/0001-00', '2023-09-28',
            15.30, 0.00, 15.30, true, true,
            'CONCILIADO_OK', 'Casa do Roadie', 'Casa do Roadie', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cityhome Servicos Imobiliarios Ltda', '41.594.764/0001-30', '2023-09-28',
            8800.00, 0.00, 8800.00, true, true,
            'CONCILIADO_OK', 'Cityhome Servicos Imobiliarios Ltda', 'Cityhome Servicos Imobiliarios Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Pateo Moinhos de Vento Adm e Part Lt', '68.815.141/0001-04', '2023-09-29',
            5768.40, 0.00, 5768.40, true, true,
            'CONCILIADO_OK', 'Pateo Moinhos de Vento Adm e Part Lt', 'Pateo Moinhos de Vento Adm e Part Lt', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cityhome Servicos Imobiliarios Ltda', '41.594.764/0001-30', '2023-09-29',
            500.00, 0.00, 500.00, true, true,
            'CONCILIADO_OK', 'Cityhome Servicos Imobiliarios Ltda', 'Cityhome Servicos Imobiliarios Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Martina Milla Raffaelli Me', '9.466.037/0001-84', '2023-09-29',
            35000.00, 0.00, 35000.00, true, true,
            'CONCILIADO_OK', 'Martina Milla Raffaelli Me', 'Martina Milla Raffaelli Me', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Matron Informatica', '10.372.701/0001-05', '2023-09-29',
            3116.00, 0.00, 3116.00, true, true,
            'CONCILIADO_OK', 'Matron Informatica', 'Matron Informatica', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis F Monte Cipullo', '', '2023-09-29',
            1050.00, 0.00, 1050.00, true, true,
            'CONCILIADO_OK', 'Luis F Monte Cipullo', 'Luis F Monte Cipullo', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Felipe G Rosa', '', '2023-09-29',
            1050.00, 0.00, 1050.00, true, true,
            'CONCILIADO_OK', 'Felipe G Rosa', 'Felipe G Rosa', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Thiago A Gomas Cunha', '', '2023-09-29',
            1050.00, 0.00, 1050.00, true, true,
            'CONCILIADO_OK', 'Thiago A Gomas Cunha', 'Thiago A Gomas Cunha', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Sofia V Baccarini', '', '2023-09-29',
            560.00, 0.00, 560.00, true, true,
            'CONCILIADO_OK', 'Sofia V Baccarini', 'Sofia V Baccarini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fabio Baltar Duarte', '', '2023-09-29',
            560.00, 0.00, 560.00, true, true,
            'CONCILIADO_OK', 'Fabio Baltar Duarte', 'Fabio Baltar Duarte', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Monfrini', '', '2023-09-29',
            1050.00, 0.00, 1050.00, true, true,
            'CONCILIADO_OK', 'Andre Lima Monfrini', 'Andre Lima Monfrini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cityhome Servicos Imobiliarios Ltda', '41.594.764/0001-30', '2023-09-29',
            150.00, 0.00, 150.00, true, true,
            'CONCILIADO_OK', 'Cityhome Servicos Imobiliarios Ltda', 'Cityhome Servicos Imobiliarios Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Scm Prest Serv Postais Ltda', '5.690.175/0001-91', '2023-09-29',
            35.10, 0.00, 35.10, true, true,
            'CONCILIADO_OK', 'Scm Prest Serv Postais Ltda', 'Scm Prest Serv Postais Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Pateo Moinhos de Vento Adm e Part Lt', '68.815.141/0001-04', '2023-10-02',
            1610.00, 0.00, 1610.00, true, true,
            'CONCILIADO_OK', 'Pateo Moinhos de Vento Adm e Part Lt', 'Pateo Moinhos de Vento Adm e Part Lt', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Glademir M Machado', '', '2023-10-03',
            200.00, 0.00, 200.00, true, true,
            'CONCILIADO_OK', 'Glademir M Machado', 'Glademir M Machado', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Matron Informatica', '10.372.701/0001-05', '2023-10-03',
            3020.00, 0.00, 3020.00, true, true,
            'CONCILIADO_OK', 'Matron Informatica', 'Matron Informatica', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'EDSON DE CAMARGO', '', '2023-10-05',
            700.00, 0.00, 700.00, true, false,
            'PENDENTE', 'EDSON DE CAMARGO', 'EDSON DE CAMARGO', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Edson de Camargo Transportes', '30.710.338/0001-06', '2023-10-05',
            700.00, 0.00, 700.00, true, true,
            'CONCILIADO_OK', 'Edson de Camargo Transportes', 'Edson de Camargo Transportes', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Amir Labaki', '', '2023-10-05',
            500.00, 0.00, 500.00, true, true,
            'CONCILIADO_OK', 'Amir Labaki', 'Amir Labaki', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Memoria Coletiva Imagens e Textos Lt', '7.922.433/0001-43', '2023-10-06',
            10500.00, 0.00, 10500.00, true, true,
            'CONCILIADO_OK', 'Memoria Coletiva Imagens e Textos Lt', 'Memoria Coletiva Imagens e Textos Lt', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Amir Labaki', '', '2023-10-09',
            945.49, 0.00, 945.49, true, true,
            'CONCILIADO_OK', 'Amir Labaki', 'Amir Labaki', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Amir Labaki', '', '2023-10-09',
            945.49, 0.00, 945.49, true, true,
            'PENDENTE', 'Amir Labaki', 'Amir Labaki', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mog Produtora', '7.007.705/0001-80', '2023-10-09',
            13500.00, 0.00, 13500.00, true, true,
            'CONCILIADO_OK', 'Mog Produtora', 'Mog Produtora', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis Felipe Monte Cipullo 4425612981', '22.592.616/0001-31', '2023-10-09',
            7500.00, 0.00, 7500.00, true, true,
            'CONCILIADO_OK', 'Luis Felipe Monte Cipullo 4425612981', 'Luis Felipe Monte Cipullo 4425612981', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Thiago Augusto Gomas Cunha 397893948', '21.527.058/0001-68', '2023-10-09',
            4800.00, 0.00, 4800.00, true, true,
            'CONCILIADO_OK', 'Thiago Augusto Gomas Cunha 397893948', 'Thiago Augusto Gomas Cunha 397893948', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fabio Baltar Duarte', '34.999.542/0001-31', '2023-10-09',
            1800.00, 0.00, 1800.00, true, true,
            'CONCILIADO_OK', 'Fabio Baltar Duarte', 'Fabio Baltar Duarte', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fabio Baltar Duarte', '34.999.542/0001-31', '2023-10-09',
            1800.01, 0.00, 1800.01, true, true,
            'CONCILIADO_OK', 'Fabio Baltar Duarte', 'Fabio Baltar Duarte', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mandala Tours', '7.758.486/0001-70', '2023-10-09',
            9502.77, 0.00, 9502.77, true, true,
            'CONCILIADO_OK', 'Mandala Tours', 'Mandala Tours', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis F Monte Cipullo', '', '2023-10-09',
            240.00, 0.00, 240.00, true, true,
            'CONCILIADO_OK', 'Luis F Monte Cipullo', 'Luis F Monte Cipullo', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Monfrini', '', '2023-10-09',
            240.00, 0.00, 240.00, true, true,
            'CONCILIADO_OK', 'Andre Lima Monfrini', 'Andre Lima Monfrini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Felipe G Rosa', '', '2023-10-09',
            240.00, 0.00, 240.00, true, true,
            'CONCILIADO_OK', 'Felipe G Rosa', 'Felipe G Rosa', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Thiago A Gomas Cunha', '', '2023-10-09',
            240.00, 0.00, 240.00, true, true,
            'CONCILIADO_OK', 'Thiago A Gomas Cunha', 'Thiago A Gomas Cunha', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Monfrini', '', '2023-10-10',
            500.00, 0.00, 500.00, true, false,
            'PENDENTE', 'Andre Lima Monfrini', 'Andre Lima Monfrini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Faculdade de Arquitetura e Urbanismo', '63.025.530/0011-86', '2023-10-10',
            2300.00, 0.00, 2300.00, true, true,
            'CONCILIADO_OK', 'Faculdade de Arquitetura e Urbanismo', 'Faculdade de Arquitetura e Urbanismo', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Ana Beatriz Hermanson Pomar Servicos', '34.179.595/0001-06', '2023-10-11',
            1500.00, 0.00, 1500.00, true, true,
            'CONCILIADO_OK', 'Ana Beatriz Hermanson Pomar Servicos', 'Ana Beatriz Hermanson Pomar Servicos', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Aamac', '6.004.984/0001-65', '2023-10-11',
            400.00, 0.00, 400.00, true, true,
            'CONCILIADO_OK', 'Aamac', 'Aamac', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Malnes Transporte e Produção', '34.494.177/0001-03', '2023-10-11',
            500.00, 0.00, 500.00, true, true,
            'CONCILIADO_OK', 'Malnes Transporte e Produção', 'Malnes Transporte e Produção', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Vondoc Filmes Ltda', '39.928.813/0001-81', '2023-10-11',
            4000.00, 0.00, 4000.00, true, true,
            'CONCILIADO_OK', 'Vondoc Filmes Ltda', 'Vondoc Filmes Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Idalina S R Silva', '', '2023-10-11',
            1000.00, 0.00, 1000.00, true, true,
            'CONCILIADO_OK', 'Idalina S R Silva', 'Idalina S R Silva', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mandala Tours', '7.758.486/0001-70', '2023-10-11',
            9672.00, 0.00, 9672.00, true, true,
            'CONCILIADO_OK', 'Mandala Tours', 'Mandala Tours', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Monfrini', '', '2023-10-13',
            1200.00, 0.00, 1200.00, true, true,
            'CONCILIADO_OK', 'Andre Lima Monfrini', 'Andre Lima Monfrini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Felipe G Rosa', '', '2023-10-13',
            1200.00, 0.00, 1200.00, true, true,
            'CONCILIADO_OK', 'Felipe G Rosa', 'Felipe G Rosa', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis F Monte Cipullo', '', '2023-10-13',
            1200.00, 0.00, 1200.00, true, true,
            'CONCILIADO_OK', 'Luis F Monte Cipullo', 'Luis F Monte Cipullo', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Thiago A Gomas Cunha', '', '2023-10-13',
            1200.00, 0.00, 1200.00, true, true,
            'CONCILIADO_OK', 'Thiago A Gomas Cunha', 'Thiago A Gomas Cunha', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Manfrim', '', '2023-10-13',
            1000.00, 0.00, 1000.00, true, true,
            'CONCILIADO_OK', 'Andre Lima Manfrim', 'Andre Lima Manfrim', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Idalina S R Silva', '', '2023-10-13',
            480.00, 0.00, 480.00, true, true,
            'CONCILIADO_OK', 'Idalina S R Silva', 'Idalina S R Silva', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Anne C Melo Santos', '', '2023-10-13',
            480.00, 0.00, 480.00, true, true,
            'CONCILIADO_OK', 'Anne C Melo Santos', 'Anne C Melo Santos', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Ricardo Dias Santos', '', '2023-10-13',
            300.00, 0.00, 300.00, true, true,
            'CONCILIADO_OK', 'Ricardo Dias Santos', 'Ricardo Dias Santos', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Maga Projetos Culturais', '27.813.406/0001-40', '2023-10-13',
            2000.00, 0.00, 2000.00, true, true,
            'CONCILIADO_OK', 'Maga Projetos Culturais', 'Maga Projetos Culturais', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Camila Licariao de Carvalho Braune 4', '36.584.511/0001-45', '2023-10-16',
            3000.00, 0.00, 3000.00, true, true,
            'CONCILIADO_OK', 'Camila Licariao de Carvalho Braune 4', 'Camila Licariao de Carvalho Braune 4', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Camila Licariao de Carvalho Braune 4', '36.584.511/0001-45', '2023-10-16',
            3000.00, 0.00, 3000.00, true, true,
            'PENDENTE', 'Camila Licariao de Carvalho Braune 4', 'Camila Licariao de Carvalho Braune 4', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luz Rio Locacao de Equipamentos Cine', '19.979.994/0001-68', '2023-10-16',
            1100.00, 0.00, 1100.00, true, true,
            'CONCILIADO_OK', 'Luz Rio Locacao de Equipamentos Cine', 'Luz Rio Locacao de Equipamentos Cine', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cristhiano Rodrigues de Jesus 041338', '48.807.652/0001-69', '2023-10-17',
            4375.00, 0.00, 4375.00, true, true,
            'CONCILIADO_OK', 'Cristhiano Rodrigues de Jesus 041338', 'Cristhiano Rodrigues de Jesus 041338', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Claudia', '', '2023-10-17',
            4900.00, 0.00, 4900.00, true, true,
            'CONCILIADO_OK', 'Claudia', 'Claudia', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fernando M Efron', '09.279.669/0001-39', '2023-10-18',
            550.00, 0.00, 550.00, true, true,
            'CONCILIADO_OK', 'Fernando M Efron', 'Fernando M Efron', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Monica G P Moraes', '', '2023-10-24',
            9427.38, 0.00, 9427.38, true, true,
            'CONCILIADO_OK', 'Monica G P Moraes', 'Monica G P Moraes', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mog Produtora', '7.007.705/0001-80', '2023-10-25',
            10000.00, 0.00, 10000.00, true, true,
            'CONCILIADO_OK', 'Mog Produtora', 'Mog Produtora', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fogo Filmes Ltda', '5.111.581/0001-52', '2023-10-25',
            20625.00, 0.00, 20625.00, true, true,
            'CONCILIADO_OK', 'Fogo Filmes Ltda', 'Fogo Filmes Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Anne Santos', '13.555.738/0001-67', '2023-10-25',
            3600.00, 0.00, 3600.00, true, true,
            'CONCILIADO_OK', 'Anne Santos', 'Anne Santos', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mog Produtora', '7.007.705/0001-80', '2023-10-25',
            13500.00, 0.00, 13500.00, true, true,
            'CONCILIADO_OK', 'Mog Produtora', 'Mog Produtora', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mog Produtora', '7.007.705/0001-80', '2023-10-25',
            10000.00, 0.00, 10000.00, true, true,
            'PENDENTE', 'Mog Produtora', 'Mog Produtora', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Maga Projetos Culturais', '27.813.406/0001-40', '2023-10-25',
            2000.00, 0.00, 2000.00, true, true,
            'CONCILIADO_OK', 'Maga Projetos Culturais', 'Maga Projetos Culturais', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Thiago Augusto Gomas Cunha 397893948', '21.527.058/0001-68', '2023-10-25',
            1800.00, 0.00, 1800.00, true, true,
            'CONCILIADO_OK', 'Thiago Augusto Gomas Cunha 397893948', 'Thiago Augusto Gomas Cunha 397893948', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Thiago Augusto Gomas Cunha 397893948', '21.527.058/0001-68', '2023-10-25',
            4800.00, 0.00, 4800.00, true, true,
            'CONCILIADO_OK', 'Thiago Augusto Gomas Cunha 397893948', 'Thiago Augusto Gomas Cunha 397893948', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Sofia V Baccarini', '', '2023-10-25',
            816.42, 0.00, 816.42, true, true,
            'CONCILIADO_OK', 'Sofia V Baccarini', 'Sofia V Baccarini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Caleidoskopica Producoes', '29.227.754/0001-60', '2023-10-25',
            450.00, 0.00, 450.00, true, true,
            'CONCILIADO_OK', 'Caleidoskopica Producoes', 'Caleidoskopica Producoes', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Filmes de Taipa Prod', '28.105.588/0001-67', '2023-10-25',
            4500.00, 0.00, 4500.00, true, true,
            'CONCILIADO_OK', 'Filmes de Taipa Prod', 'Filmes de Taipa Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', ':', '46.009.874/0001-00', '2023-10-25',
            600.00, 0.00, 600.00, true, true,
            'CONCILIADO_OK', ':', ':', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Filmes de Taipa Prod', '28.105.588/0001-67', '2023-10-26',
            11250.00, 0.00, 11250.00, true, true,
            'CONCILIADO_OK', 'Filmes de Taipa Prod', 'Filmes de Taipa Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'GRIFE RIO LOCADORA LTDA', '', '2023-10-26',
            6550.00, 0.00, 6550.00, true, true,
            'CONCILIADO_OK', 'GRIFE RIO LOCADORA LTDA', 'GRIFE RIO LOCADORA LTDA', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Loc All de Cinema e Televisao Limita', '53.563.292/0006-41', '2023-10-26',
            995.00, 0.00, 995.00, true, true,
            'CONCILIADO_OK', 'Loc All de Cinema e Televisao Limita', 'Loc All de Cinema e Televisao Limita', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis Felipe Monte Cipullo 4425612981', '22.592.616/0001-31', '2023-10-26',
            7500.00, 0.00, 7500.00, true, true,
            'CONCILIADO_OK', 'Luis Felipe Monte Cipullo 4425612981', 'Luis Felipe Monte Cipullo 4425612981', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Windsor Administracao de Hoteis e Se', '10.348.318/0006-26', '2023-10-30',
            2529.85, 0.00, 2529.85, true, true,
            'CONCILIADO_OK', 'Windsor Administracao de Hoteis e Se', 'Windsor Administracao de Hoteis e Se', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Windsor Administracao de Hoteis e Se', '10.348.318/0008-98', '2023-10-30',
            1559.33, 0.00, 1559.33, true, true,
            'CONCILIADO_OK', 'Windsor Administracao de Hoteis e Se', 'Windsor Administracao de Hoteis e Se', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', '-', '33.242.286/0001-70', '2023-10-30',
            450.00, 0.00, 450.00, true, true,
            'CONCILIADO_OK', '-', '-', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Brilho', '47.879.867/0001-22', '2023-10-30',
            211.50, 0.00, 211.50, true, true,
            'CONCILIADO_OK', 'Brilho', 'Brilho', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Martina Milla Raffaelli Me', '9.466.037/0001-84', '2023-10-30',
            1500.00, 0.00, 1500.00, true, true,
            'CONCILIADO_OK', 'Martina Milla Raffaelli Me', 'Martina Milla Raffaelli Me', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Jefferson S Oliveira', '', '2023-10-31',
            320.00, 0.00, 320.00, true, true,
            'CONCILIADO_OK', 'Jefferson S Oliveira', 'Jefferson S Oliveira', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Felipe G Rosa', '', '2023-10-31',
            1020.00, 0.00, 1020.00, true, true,
            'CONCILIADO_OK', 'Felipe G Rosa', 'Felipe G Rosa', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Luis F Monte Cipullo', '', '2023-10-31',
            1020.00, 0.00, 1020.00, true, true,
            'CONCILIADO_OK', 'Luis F Monte Cipullo', 'Luis F Monte Cipullo', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Monfrini', '', '2023-10-31',
            1020.00, 0.00, 1020.00, true, true,
            'CONCILIADO_OK', 'Andre Lima Monfrini', 'Andre Lima Monfrini', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Andre Lima Manfrim', '', '2023-10-31',
            200.00, 0.00, 200.00, true, true,
            'CONCILIADO_OK', 'Andre Lima Manfrim', 'Andre Lima Manfrim', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Windsor Administracao de Hoteis e Se', '10.348.318/0006-26', '2023-11-01',
            316.23, 0.00, 316.23, true, true,
            'CONCILIADO_OK', 'Windsor Administracao de Hoteis e Se', 'Windsor Administracao de Hoteis e Se', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'BERNARDO TAVARES ROSA', '', '2023-11-08',
            300.00, 0.00, 300.00, true, false,
            'PENDENTE', 'BERNARDO TAVARES ROSA', 'BERNARDO TAVARES ROSA', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Bernardo T S Costa', '', '2023-11-08',
            300.00, 0.00, 300.00, true, true,
            'CONCILIADO_OK', 'Bernardo T S Costa', 'Bernardo T S Costa', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cristhiano Rodrigues de Jesus 041338', '48.807.652/0001-69', '2023-11-08',
            4750.00, 0.00, 4750.00, true, true,
            'CONCILIADO_OK', 'Cristhiano Rodrigues de Jesus 041338', 'Cristhiano Rodrigues de Jesus 041338', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Mog Produtora', '7.007.705/0001-80', '2023-11-14',
            27000.00, 0.00, 27000.00, true, true,
            'CONCILIADO_OK', 'Mog Produtora', 'Mog Produtora', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Monica G P Moraes', '', '2023-11-14',
            3724.74, 0.00, 3724.74, true, true,
            'CONCILIADO_OK', 'Monica G P Moraes', 'Monica G P Moraes', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Monica G P Moraes', '', '2023-11-14',
            3724.74, 0.00, 3724.74, true, true,
            'PENDENTE', 'Monica G P Moraes', 'Monica G P Moraes', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Bie Cinema e Tv Ltda Me', '59.875.666/0001-36', '2023-11-14',
            750.00, 0.00, 750.00, true, true,
            'CONCILIADO_OK', 'Bie Cinema e Tv Ltda Me', 'Bie Cinema e Tv Ltda Me', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Filmes de Taipa Prod', '28.105.588/0001-67', '2023-11-14',
            400.00, 0.00, 400.00, true, true,
            'CONCILIADO_OK', 'Filmes de Taipa Prod', 'Filmes de Taipa Prod', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fogo Filmes Ltda', '5.111.581/0001-52', '2023-11-27',
            20625.00, 0.00, 20625.00, true, true,
            'CONCILIADO_OK', 'Fogo Filmes Ltda', 'Fogo Filmes Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Memoria Coletiva Imagens e Textos Lt', '7.922.433/0001-43', '2023-12-11',
            2000.00, 0.00, 2000.00, true, true,
            'CONCILIADO_OK', 'Memoria Coletiva Imagens e Textos Lt', 'Memoria Coletiva Imagens e Textos Lt', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Raquel de Oliveira Lazaro 0483723061', '30.476.092/0001-41', '2023-12-20',
            585.00, 0.00, 585.00, true, true,
            'CONCILIADO_OK', 'Raquel de Oliveira Lazaro 0483723061', 'Raquel de Oliveira Lazaro 0483723061', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fogo Filmes Ltda', '5.111.581/0001-52', '2023-12-20',
            20625.00, 0.00, 20625.00, true, true,
            'CONCILIADO_OK', 'Fogo Filmes Ltda', 'Fogo Filmes Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fogo Filmes Ltda', '5.111.581/0001-52', '2024-01-24',
            20625.00, 0.00, 20625.00, true, true,
            'CONCILIADO_OK', 'Fogo Filmes Ltda', 'Fogo Filmes Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'In Sampa Courier Entregas Eireli', '34.253.619/0001-20', '2024-01-31',
            487.20, 0.00, 487.20, true, true,
            'CONCILIADO_OK', 'In Sampa Courier Entregas Eireli', 'In Sampa Courier Entregas Eireli', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Juba Producoes', '29.399.659/0001-44', '2024-02-23',
            6000.00, 0.00, 6000.00, true, true,
            'CONCILIADO_OK', 'Juba Producoes', 'Juba Producoes', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fogo Filmes', '5.111.581/0001-52', '2024-02-23',
            22500.00, 0.00, 22500.00, true, true,
            'CONCILIADO_OK', 'Fogo Filmes', 'Fogo Filmes', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Julia Barbara Melo de Sousa 40926175', '29.399.659/0001-44', '2024-05-07',
            4000.00, 0.00, 4000.00, true, true,
            'CONCILIADO_OK', 'Julia Barbara Melo de Sousa 40926175', 'Julia Barbara Melo de Sousa 40926175', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Ganzah', '13.597.285/0001-31', '2024-05-31',
            5000.00, 0.00, 5000.00, true, true,
            'CONCILIADO_OK', 'Ganzah', 'Ganzah', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fogo Filmes', '5.111.581/0001-52', '2024-06-03',
            13500.00, 0.00, 13500.00, true, true,
            'CONCILIADO_OK', 'Fogo Filmes', 'Fogo Filmes', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Giovana Amano', '24.192.708/0001-50', '2024-07-03',
            5000.00, 0.00, 5000.00, true, true,
            'CONCILIADO_OK', 'Giovana Amano', 'Giovana Amano', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Brasil Imagem', '18.148.355/0001-98', '2024-07-30',
            8000.00, 0.00, 8000.00, true, true,
            'CONCILIADO_OK', 'Brasil Imagem', 'Brasil Imagem', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'ANJO AZUL FILMES LTDA.', '', '2024-08-09',
            2815.00, 0.00, 2815.00, true, true,
            'CONCILIADO_OK', 'ANJO AZUL FILMES LTDA.', 'ANJO AZUL FILMES LTDA.', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Sociedade Amigos da Cinemateca - Sac', '59.090.092/0001-90', '2024-08-09',
            2873.00, 0.00, 2873.00, true, true,
            'CONCILIADO_OK', 'Sociedade Amigos da Cinemateca - Sac', 'Sociedade Amigos da Cinemateca - Sac', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'F. Werneck Barcinski Ltda', '37.500.855/0001-91', '2024-08-09',
            4000.00, 0.00, 4000.00, true, true,
            'CONCILIADO_OK', 'F. Werneck Barcinski Ltda', 'F. Werneck Barcinski Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Biblioteca Nacional', '11400274/0001-94', '2024-08-09',
            550.00, 0.00, 550.00, true, true,
            'CONCILIADO_OK', 'Biblioteca Nacional', 'Biblioteca Nacional', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', ':', '33.641.663/0001-44', '2024-08-16',
            130.00, 0.00, 130.00, true, true,
            'CONCILIADO_OK', ':', ':', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Sociedade Amigos da Cinemateca - Sac', '59.090.092/0001-90', '2024-08-19',
            8627.00, 0.00, 8627.00, true, true,
            'CONCILIADO_OK', 'Sociedade Amigos da Cinemateca - Sac', 'Sociedade Amigos da Cinemateca - Sac', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Camila Braune', '36.584.511/0001-45', '2024-09-03',
            600.00, 0.00, 600.00, true, true,
            'CONCILIADO_OK', 'Camila Braune', 'Camila Braune', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'GLOBO COMUNICACAO E PARTICIPACOES S.A. - CNPJ: 27.865.757/0001-02', '27.865.757/0001-02', '2024-09-05',
            938.50, 0.00, 938.50, true, true,
            'CONCILIADO_OK', 'GLOBO COMUNICACAO E PARTICIPACOES S.A. - CNPJ: 27.865.757/0001-02', 'GLOBO COMUNICACAO E PARTICIPACOES S.A. - CNPJ: 27.865.757/0001-02', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'LAPFILME P C LTDA', '', '2024-09-17',
            2250.00, 0.00, 2250.00, true, true,
            'CONCILIADO_OK', 'LAPFILME P C LTDA', 'LAPFILME P C LTDA', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'S.A. O ESTADO DE S.PAULO CNPJ 61.533.949/0001-41', '011.400.274/0001-94', '2024-09-17',
            2632.45, 0.00, 2632.45, true, true,
            'CONCILIADO_OK', 'S.A. O ESTADO DE S.PAULO CNPJ 61.533.949/0001-41', 'S.A. O ESTADO DE S.PAULO CNPJ 61.533.949/0001-41', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', ':', '08.561.701/0001-01', '2024-09-23',
            5500.00, 0.00, 5500.00, true, true,
            'CONCILIADO_OK', ':', ':', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cotacao D.t.v.m. S/a - Sefic', '17.354.911/0001-10', '2024-09-25',
            6726.23, 0.00, 6726.23, true, true,
            'CONCILIADO_OK', 'Cotacao D.t.v.m. S/a - Sefic', 'Cotacao D.t.v.m. S/a - Sefic', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'do Contribuinte', '11400274/0001-94', '2024-09-30',
            700.00, 0.00, 700.00, true, true,
            'CONCILIADO_OK', 'do Contribuinte', 'do Contribuinte', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'do Contribuinte', '11400274/0001-94', '2024-09-30',
            2400.00, 0.00, 2400.00, true, true,
            'CONCILIADO_OK', 'do Contribuinte', 'do Contribuinte', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cotacao D.t.v.m. S/a - Sefic', '17.354.911/0001-10', '2024-10-10',
            1836.22, 0.00, 1836.22, true, true,
            'CONCILIADO_OK', 'Cotacao D.t.v.m. S/a - Sefic', 'Cotacao D.t.v.m. S/a - Sefic', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Sociedade Amigos da Cinemateca - Sac', '59.090.092/0001-90', '2024-10-10',
            372.00, 0.00, 372.00, true, true,
            'CONCILIADO_OK', 'Sociedade Amigos da Cinemateca - Sac', 'Sociedade Amigos da Cinemateca - Sac', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Porviroscopio Projetos C. C. Ltda', '47.647.727/0001-29', '2024-10-31',
            5000.00, 0.00, 5000.00, true, true,
            'CONCILIADO_OK', 'Porviroscopio Projetos C. C. Ltda', 'Porviroscopio Projetos C. C. Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Caliban Producoes Cinematograficas L', '27.651.181/0001-72', '2024-10-31',
            5500.00, 0.00, 5500.00, true, true,
            'CONCILIADO_OK', 'Caliban Producoes Cinematograficas L', 'Caliban Producoes Cinematograficas L', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'do Contribuinte', '', '2024-11-01',
            140.00, 0.00, 140.00, true, true,
            'CONCILIADO_OK', 'do Contribuinte', 'do Contribuinte', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'do Contribuinte', '11400274/0001-94', '2024-11-04',
            400.00, 0.00, 400.00, true, true,
            'CONCILIADO_OK', 'do Contribuinte', 'do Contribuinte', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Echo S Comunicacao Sonora e Visual', '49.924.475/0001-63', '2024-11-08',
            600.00, 0.00, 600.00, true, true,
            'CONCILIADO_OK', 'Echo S Comunicacao Sonora e Visual', 'Echo S Comunicacao Sonora e Visual', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Roberto F D Avila', '', '2024-11-08',
            1000.00, 0.00, 1000.00, true, true,
            'CONCILIADO_OK', 'Roberto F D Avila', 'Roberto F D Avila', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'do Contribuinte', '', '2024-11-12',
            12.00, 0.00, 12.00, true, true,
            'CONCILIADO_OK', 'do Contribuinte', 'do Contribuinte', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'do Contribuinte', '11400274/0001-94', '2024-11-14',
            200.00, 0.00, 200.00, true, true,
            'CONCILIADO_OK', 'do Contribuinte', 'do Contribuinte', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Marach Servicos Audiovisuais Eireli', '34.336.977/0001-04', '2024-11-28',
            230.00, 0.00, 230.00, true, true,
            'CONCILIADO_OK', 'Marach Servicos Audiovisuais Eireli', 'Marach Servicos Audiovisuais Eireli', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', ':', '02.903.707/0001-33', '2024-12-05',
            6400.00, 0.00, 6400.00, true, true,
            'CONCILIADO_OK', ':', ':', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Geisa Silva Jesus', '', '2024-12-05',
            1500.00, 0.00, 1500.00, true, true,
            'CONCILIADO_OK', 'Geisa Silva Jesus', 'Geisa Silva Jesus', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', ':', '33.641.663/0001-44', '2024-12-10',
            100.00, 0.00, 100.00, true, true,
            'CONCILIADO_OK', ':', ':', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Editora e Importadora Musical Fermat', '60.599.644/0001-70', '2024-12-17',
            3000.00, 0.00, 3000.00, true, true,
            'CONCILIADO_OK', 'Editora e Importadora Musical Fermat', 'Editora e Importadora Musical Fermat', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Som Livre', '43.203.520/0017-71', '2024-12-17',
            2000.00, 0.00, 2000.00, true, true,
            'CONCILIADO_OK', 'Som Livre', 'Som Livre', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Carlos Lyra Edicoes Musicais', '97.489.819/0001-04', '2024-12-17',
            3500.00, 0.00, 3500.00, true, true,
            'CONCILIADO_OK', 'Carlos Lyra Edicoes Musicais', 'Carlos Lyra Edicoes Musicais', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Cotacao D.t.v.m. S/a - Sefic', '17.354.911/0001-10', '2024-12-17',
            8393.30, 0.00, 8393.30, true, true,
            'CONCILIADO_OK', 'Cotacao D.t.v.m. S/a - Sefic', 'Cotacao D.t.v.m. S/a - Sefic', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Giovana Amano', '24.192.708/0001-50', '2024-12-26',
            5000.00, 0.00, 5000.00, true, true,
            'CONCILIADO_OK', 'Giovana Amano', 'Giovana Amano', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Arquivo Nacional', '11400274/0001-94', '2025-01-16',
            50.00, 0.00, 50.00, true, true,
            'CONCILIADO_OK', 'Arquivo Nacional', 'Arquivo Nacional', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'CIRCUNSTANC 1961 FSAMPJFN', '', '2025-02-03',
            975.04, 0.00, 975.04, true, false,
            'PENDENTE', 'CIRCUNSTANC 1961 FSAMPJFN', 'CIRCUNSTANC 1961 FSAMPJFN', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'BANCO RENDIMENTO S/A', '', '2025-02-03',
            975.04, 0.00, 975.04, true, false,
            'PENDENTE', 'BANCO RENDIMENTO S/A', 'BANCO RENDIMENTO S/A', 'PF', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Banco Rendimento S/a', '68.900.810/0001-38', '2025-02-03',
            975.04, 0.00, 975.04, true, true,
            'CONCILIADO_OK', 'Banco Rendimento S/a', 'Banco Rendimento S/a', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Ganzah', '13.597.285/0001-31', '2025-02-27',
            7000.00, 0.00, 7000.00, true, true,
            'CONCILIADO_OK', 'Ganzah', 'Ganzah', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', ':', '04.884.574/0001-20', '2025-03-25',
            626.30, 0.00, 626.30, true, true,
            'CONCILIADO_OK', ':', ':', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Giovana Amano', '24.192.708/0001-50', '2025-04-30',
            3000.00, 0.00, 3000.00, true, true,
            'CONCILIADO_OK', 'Giovana Amano', 'Giovana Amano', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Planifilmes Ltda', '61.374.229/0001-80', '2025-04-30',
            1200.00, 0.00, 1200.00, true, true,
            'CONCILIADO_OK', 'Planifilmes Ltda', 'Planifilmes Ltda', 'PJ', NOW(), NOW()
        );
INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '19611961-0000-0000-0000-000000001961', 'Fogo Filmes', '5.111.581/0001-52', '2025-05-07',
            18093.63, 0.00, 18093.63, true, true,
            'CONCILIADO_OK', 'Fogo Filmes', 'Fogo Filmes', 'PF', NOW(), NOW()
        );
COMMIT;
