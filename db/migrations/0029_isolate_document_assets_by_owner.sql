-- Evita colisões entre contas que reutilizam IDs textuais de projeto/documento.
alter table document_assets
  drop constraint if exists document_assets_project_id_document_id_key;

create unique index if not exists uq_document_assets_owner_project_document
  on document_assets(owner_id, project_id, document_id);
