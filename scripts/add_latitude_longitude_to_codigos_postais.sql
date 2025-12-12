-- Migração: Adiciona latitude e longitude à tabela codigos_postais
ALTER TABLE codigos_postais
ADD COLUMN latitude DOUBLE PRECISION;

ALTER TABLE codigos_postais
ADD COLUMN longitude DOUBLE PRECISION;

-- Opcional: Preencher latitude/longitude via script externo após migração
-- UPDATE codigos_postais SET latitude = ..., longitude = ... WHERE ...;
