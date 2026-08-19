# 📚 Especificação das Rotas da API — RouanetConcilia

| Método | Rota | Parâmetros | Respostas |
| --- | --- | --- | --- |
| GET | /api/v1/projetos | - | Retorna uma lista de projetos culturais PRONAC |
| POST | /api/v1/projetos | - | Cria um novo projeto cultural PRONAC |
| PUT | /api/v1/projetos/{id} | - | Atualiza um projeto cultural PRONAC existente |
| DELETE | /api/v1/projetos/{id} | - | Remove um projeto cultural PRONAC existente |
| GET | /api/v1/conciliar | - | Inicia o fluxo de conciliação extrato x notas fiscais |
| POST | /api/v1/documentos | - | Upload e vínculo de NFS-e / comprovantes |
| GET | /api/v1/auditoria | - | Retorna um painel de inconformidades e regras MinC |
| GET | /api/v1/salic | - | Exportações e relatórios oficiais |
| GET | /api/v1/dev/demo-login | - | Login de desenvolvimento sem Supabase |
