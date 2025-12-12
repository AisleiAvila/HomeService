-- Adiciona campos de latitude e longitude à tabela users para geolocalização de profissionais
ALTER TABLE users
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;
