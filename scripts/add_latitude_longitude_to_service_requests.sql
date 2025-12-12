-- Adiciona campos de latitude e longitude à tabela service_requests para geolocalização do local do serviço
ALTER TABLE service_requests
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;
