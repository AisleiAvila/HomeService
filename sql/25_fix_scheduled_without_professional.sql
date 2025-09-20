-- Migration 25: Fix Scheduled Services Without Professional Assignment
-- Data: 2025-09-20
-- Descrição: Corrige solicitações com status "Agendado" mas sem profissional atribuído

-- 1. Detectar e listar inconsistências
DO $$
DECLARE
    inconsistent_count INTEGER;
    rec RECORD;
BEGIN
    -- Contar solicitações inconsistentes
    SELECT COUNT(*) INTO inconsistent_count
    FROM service_requests 
    WHERE status = 'Agendado' 
    AND (professional_id IS NULL OR professional_id = 0);
    
    RAISE NOTICE '🔍 Found % service requests with status "Agendado" but no professional assigned', inconsistent_count;
    
    -- Listar detalhes das solicitações inconsistentes
    IF inconsistent_count > 0 THEN
        RAISE NOTICE '📋 Listing inconsistent service requests:';
        FOR rec IN 
            SELECT id, title, category, status, cost, professional_id, scheduled_start_datetime
            FROM service_requests 
            WHERE status = 'Agendado' 
            AND (professional_id IS NULL OR professional_id = 0)
            ORDER BY id
        LOOP
            RAISE NOTICE '  - ID: % | Title: "%" | Category: % | Cost: % | Professional: % | Scheduled: %', 
                rec.id, rec.title, rec.category, rec.cost, 
                COALESCE(rec.professional_id::TEXT, 'NULL'), 
                COALESCE(rec.scheduled_start_datetime::TEXT, 'NULL');
        END LOOP;
    END IF;
END;
$$;

-- 2. Função para corrigir solicitações inconsistentes
CREATE OR REPLACE FUNCTION fix_scheduled_without_professional()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    v_assigned_professional_id INTEGER;
    v_fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 Starting automatic fix for scheduled services without professional...';
    
    -- Processar cada solicitação inconsistente
    FOR rec IN 
        SELECT id, title, category, cost, scheduled_start_datetime
        FROM service_requests 
        WHERE status = 'Agendado' 
        AND (professional_id IS NULL OR professional_id = 0)
        ORDER BY id
    LOOP
        RAISE NOTICE '⚙️  Processing service request ID: % - "%"', rec.id, rec.title;
        
        -- Tentar atribuir profissional automaticamente
        SELECT auto_assign_professional(rec.id, rec.category) 
        INTO v_assigned_professional_id;
        
        IF v_assigned_professional_id IS NOT NULL THEN
            -- Atribuir profissional
            UPDATE service_requests
            SET 
                professional_id = v_assigned_professional_id,
                selected_professional_id = v_assigned_professional_id,
                updated_at = NOW()
            WHERE id = rec.id;
            
            -- Enviar notificação
            PERFORM notify_professional_assignment(rec.id, v_assigned_professional_id);
            
            v_fixed_count := v_fixed_count + 1;
            RAISE NOTICE '✅ Fixed: Service % assigned to professional %', rec.id, v_assigned_professional_id;
        ELSE
            -- Se não conseguir atribuir, mudar status para "Buscando profissional"
            UPDATE service_requests
            SET 
                status = 'Buscando profissional',
                updated_at = NOW()
            WHERE id = rec.id;
            
            RAISE NOTICE '⚠️  Could not assign professional for service %. Status changed to "Buscando profissional"', rec.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎯 Fixed % service requests', v_fixed_count;
    RETURN v_fixed_count;
END;
$$;

-- 3. Executar correção automática
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    SELECT fix_scheduled_without_professional() INTO fixed_count;
    
    IF fixed_count > 0 THEN
        RAISE NOTICE '✅ Successfully fixed % service requests', fixed_count;
    ELSE
        RAISE NOTICE 'ℹ️  No service requests needed fixing';
    END IF;
END;
$$;

-- 4. Verificar resultado após correção
DO $$
DECLARE
    remaining_count INTEGER;
    rec RECORD;
BEGIN
    -- Contar solicitações ainda inconsistentes
    SELECT COUNT(*) INTO remaining_count
    FROM service_requests 
    WHERE status = 'Agendado' 
    AND (professional_id IS NULL OR professional_id = 0);
    
    IF remaining_count = 0 THEN
        RAISE NOTICE '🎉 SUCCESS: All scheduled services now have professional assigned!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % service requests still without professional', remaining_count;
        
        -- Listar as que ainda estão inconsistentes
        FOR rec IN 
            SELECT id, title, category, status
            FROM service_requests 
            WHERE status = 'Agendado' 
            AND (professional_id IS NULL OR professional_id = 0)
        LOOP
            RAISE NOTICE '  - Remaining issue: ID % - "%"', rec.id, rec.title;
        END LOOP;
    END IF;
END;
$$;

-- 5. Criar trigger para prevenir futuras inconsistências
CREATE OR REPLACE FUNCTION prevent_scheduled_without_professional()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Se está mudando status para "Agendado" mas não tem profissional
    IF NEW.status = 'Agendado' AND (NEW.professional_id IS NULL OR NEW.professional_id = 0) THEN
        RAISE NOTICE '🚨 WARNING: Attempting to set status to "Agendado" without professional_id for service %', NEW.id;
        
        -- Tentar atribuir profissional automaticamente
        NEW.professional_id := auto_assign_professional(NEW.id, NEW.category);
        NEW.selected_professional_id := NEW.professional_id;
        
        IF NEW.professional_id IS NOT NULL THEN
            RAISE NOTICE '✅ Auto-assigned professional % to service %', NEW.professional_id, NEW.id;
            -- Enviar notificação
            PERFORM notify_professional_assignment(NEW.id, NEW.professional_id);
        ELSE
            -- Se não conseguir atribuir, não permitir status "Agendado"
            NEW.status := 'Buscando profissional';
            RAISE NOTICE '⚠️  Changed status to "Buscando profissional" for service % (no available professionals)', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_prevent_scheduled_without_professional ON service_requests;
CREATE TRIGGER trigger_prevent_scheduled_without_professional
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_scheduled_without_professional();

-- 6. Relatório final de verificação
DO $$
DECLARE
    total_agendado INTEGER;
    total_with_professional INTEGER;
    total_without_professional INTEGER;
BEGIN
    -- Estatísticas finais
    SELECT COUNT(*) INTO total_agendado
    FROM service_requests 
    WHERE status = 'Agendado';
    
    SELECT COUNT(*) INTO total_with_professional
    FROM service_requests 
    WHERE status = 'Agendado' 
    AND professional_id IS NOT NULL 
    AND professional_id > 0;
    
    SELECT COUNT(*) INTO total_without_professional
    FROM service_requests 
    WHERE status = 'Agendado' 
    AND (professional_id IS NULL OR professional_id = 0);
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 FINAL REPORT:';
    RAISE NOTICE '  - Total services with status "Agendado": %', total_agendado;
    RAISE NOTICE '  - Services with professional assigned: %', total_with_professional;
    RAISE NOTICE '  - Services without professional: %', total_without_professional;
    
    IF total_without_professional = 0 THEN
        RAISE NOTICE '✅ All scheduled services now have professionals assigned!';
    ELSE
        RAISE NOTICE '❌ % services still need professional assignment', total_without_professional;
    END IF;
END;
$$;

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Migration 25 completed successfully at %', NOW();
    RAISE NOTICE '🔧 Fixed scheduled services without professional assignment';
    RAISE NOTICE '🛡️  Added prevention trigger for future inconsistencies';
    RAISE NOTICE '';
END;
$$;