-- Migration: Adiciona campo para preferência de comunicados por SMS
ALTER TABLE users ADD COLUMN receive_sms_notifications BOOLEAN DEFAULT FALSE;
