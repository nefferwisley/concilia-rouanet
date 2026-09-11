# Publicação no Render

O serviço publicado deve ser criado a partir deste repositório:

`https://github.com/nefferwisley/concilia-rouanet`

Ele usa o `render.yaml` da raiz e publica, no mesmo endereço, a interface React
e a API FastAPI. Não use o serviço `rouanetconcilia-backend`: ele pertence ao
repositório `rouanet-concilia-api` e é apenas a API legada.

## Configuração única

No Render, crie um **Blueprint** usando este repositório e a branch `main`.
O nome esperado é `concilia-rouanet-1961`. Preencha apenas os segredos marcados
como `sync: false` no painel do Render; eles nunca devem ser copiados para o Git.

Depois disso, cada envio para `main` executa a checagem de tipos, os testes da
interface, o build e a publicação automaticamente. O Render só troca a versão
ativa após `GET /health` responder com sucesso.
