-- O backend mantém a lista explícita de formatos aceitos. No banco, valide o
-- formato do MIME sem limitar o dossiê a PDF e imagens, pois planilhas, OFX,
-- XML, CSV e documentos Office também são evidências persistentes.
alter table public.document_assets
  drop constraint if exists document_assets_mime_type_check;

alter table public.document_assets
  add constraint document_assets_mime_type_check
  check (
    char_length(mime_type) between 3 and 255
    and mime_type ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$'
  );
