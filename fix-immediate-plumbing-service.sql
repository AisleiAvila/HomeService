-- Correção Imediata: Fix da solicitação "Trocar encanamento danificado" sem profissional
-- Data: 2025-09-20
-- Descrição: Correção urgente para a solicitação agendada sem profissional atribuído

-- 1. Identificar a solicitação problemática
DO $$
DECLARE
    problematic_service RECORD;
BEGIN
    RAISE NOTICE '🔍 Buscando solicitação "Trocar encanamento danificado" com status "Agendado" mas sem profissional...';
    
    SELECT id, title, category, status, cost, professional_id, scheduled_start_datetime
    INTO problematic_service
    FROM service_requests 
    WHERE LOWER(title) LIKE '%trocar encanamento%' 
    AND status = 'Agendado' 
    AND (professional_id IS NULL OR professional_id = 0)
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '🚨 ENCONTRADA: Solicitação ID % - "%"', problematic_service.id, problematic_service.title;
        RAISE NOTICE '   Status: % | Categoria: % | Custo: % | Profissional: %', 
            problematic_service.status, 
            problematic_service.category, 
            problematic_service.cost,
            COALESCE(problematic_service.professional_id::TEXT, 'NULL');
        
        -- Armazenar ID para uso posterior
        CREATE TEMP TABLE IF NOT EXISTS temp_fix_data (service_id INTEGER);
        DELETE FROM temp_fix_data;
        INSERT INTO temp_fix_data (service_id) VALUES (problematic_service.id);
    ELSE
        RAISE NOTICE 'ℹ️  Nenhuma solicitação problemática encontrada com esses critérios';
    END IF;
END;
$$;

-- 2. Corrigir a solicitação específica
DO $$
DECLARE
    v_service_id INTEGER;
    v_service_category TEXT;
    v_assigned_professional_id INTEGER;
    v_professional_name TEXT;
BEGIN
    -- Obter ID da solicitação a ser corrigida
    SELECT service_id INTO v_service_id FROM temp_fix_data LIMIT 1;
    
    IF v_service_id IS NULL THEN
        RAISE NOTICE 'ℹ️  Nenhuma solicitação para corrigir';
        RETURN;
    END IF;
    
    RAISE NOTICE '🔧 Iniciando correção da solicitação ID %...', v_service_id;
    
    -- Obter categoria do serviço
    SELECT category INTO v_service_category 
    FROM service_requests 
    WHERE id = v_service_id;
    
    RAISE NOTICE '📋 Categoria do serviço: %', v_service_category;
    
    -- Buscar profissional adequado usando nossa função
    SELECT auto_assign_professional(v_service_id, v_service_category) 
    INTO v_assigned_professional_id;
    
    IF v_assigned_professional_id IS NOT NULL THEN
        -- Obter nome do profissional
        SELECT name INTO v_professional_name 
        FROM users 
        WHERE id = v_assigned_professional_id;
        
        -- Atribuir profissional à solicitação
        UPDATE service_requests
        SET 
            professional_id = v_assigned_professional_id,
            selected_professional_id = v_assigned_professional_id,
            updated_at = NOW()
        WHERE id = v_service_id;
        
        RAISE NOTICE '✅ SUCESSO: Profissional % (%) atribuído à solicitação %', 
            v_professional_name, v_assigned_professional_id, v_service_id;
            
        -- Enviar notificação
        PERFORM notify_professional_assignment(v_service_id, v_assigned_professional_id);
        
        RAISE NOTICE '🔔 Notificação enviada para o profissional';
        
    ELSE
        RAISE NOTICE '❌ ERRO: Nenhum profissional disponível para atribuição';
        RAISE NOTICE '⚠️  Alterando status para "Buscando profissional"';
        
        -- Alterar status se não conseguir atribuir
        UPDATE service_requests
        SET 
            status = 'Buscando profissional',
            updated_at = NOW()
        WHERE id = v_service_id;
    END IF;
END;
$$;

-- 3. Verificar resultado da correção
DO $$
DECLARE
    corrected_service RECORD;
    professional_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICAÇÃO PÓS-CORREÇÃO:';
    RAISE NOTICE '─────────────────────────────';
    
    -- Obter dados atualizados da solicitação
    SELECT id, title, category, status, cost, professional_id, scheduled_start_datetime
    INTO corrected_service
    FROM service_requests 
    WHERE LOWER(title) LIKE '%trocar encanamento%' 
    AND id = (SELECT service_id FROM temp_fix_data LIMIT 1);
    
    IF FOUND THEN
        -- Obter nome do profissional se atribuído
        IF corrected_service.professional_id IS NOT NULL THEN
            SELECT name INTO professional_name 
            FROM users 
            WHERE id = corrected_service.professional_id;
        END IF;
        
        RAISE NOTICE '🎯 Solicitação ID %: "%"', corrected_service.id, corrected_service.title;
        RAISE NOTICE '   Status: %', corrected_service.status;
        RAISE NOTICE '   Categoria: %', corrected_service.category;
        RAISE NOTICE '   Custo: %', COALESCE(corrected_service.cost::TEXT, 'N/A');
        RAISE NOTICE '   Profissional ID: %', COALESCE(corrected_service.professional_id::TEXT, 'NULL');
        RAISE NOTICE '   Profissional Nome: %', COALESCE(professional_name, 'Não atribuído');
        RAISE NOTICE '   Data Agendada: %', COALESCE(corrected_service.scheduled_start_datetime::TEXT, 'N/A');
        
        IF corrected_service.professional_id IS NOT NULL AND corrected_service.status = 'Agendado' THEN
            RAISE NOTICE '';
            RAISE NOTICE '🎉 CORREÇÃO BEM-SUCEDIDA!';
            RAISE NOTICE '✅ A solicitação agora tem profissional atribuído';
            RAISE NOTICE '📅 Aparecerá na agenda do profissional %', professional_name;
        ELSE
            RAISE NOTICE '';
            RAISE NOTICE '⚠️  Correção parcial - status alterado mas sem profissional';
        END IF;
    ELSE
        RAISE NOTICE '❌ Solicitação não encontrada após correção';
    END IF;
END;
$$;

-- 4. Limpar dados temporários
DROP TABLE IF EXISTS temp_fix_data;

-- 5. Relatório geral de verificação
DO $$
DECLARE
    total_agendado INTEGER;
    agendado_sem_professional INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 RELATÓRIO GERAL DO SISTEMA:';
    RAISE NOTICE '═══════════════════════════════';
    
    -- Contar todas as solicitações agendadas
    SELECT COUNT(*) INTO total_agendado
    FROM service_requests 
    WHERE status = 'Agendado';
    
    -- Contar agendadas sem profissional
    SELECT COUNT(*) INTO agendado_sem_professional
    FROM service_requests 
    WHERE status = 'Agendado' 
    AND (professional_id IS NULL OR professional_id = 0);
    
    RAISE NOTICE '📊 Total de solicitações com status "Agendado": %', total_agendado;
    RAISE NOTICE '🚨 Solicitações agendadas SEM profissional: %', agendado_sem_professional;
    
    IF agendado_sem_professional = 0 THEN
        RAISE NOTICE '✅ PERFEITO: Todas as solicitações agendadas têm profissional!';
    ELSE
        RAISE NOTICE '⚠️  ATENÇÃO: Ainda há % solicitações agendadas sem profissional:', agendado_sem_professional;
        
        -- Listar as problemáticas restantes
        FOR rec IN 
            SELECT id, title, category, cost
            FROM service_requests 
            WHERE status = 'Agendado' 
            AND (professional_id IS NULL OR professional_id = 0)
            ORDER BY id
        LOOP
            RAISE NOTICE '   - ID %: "%" (Categoria: %, Custo: %)', 
                rec.id, rec.title, rec.category, COALESCE(rec.cost::TEXT, 'N/A');
        END LOOP;
    END IF;
END;
$$;

-- Log da execução
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Correção imediata executada em %', NOW();
    RAISE NOTICE '🔧 Solicitação "Trocar encanamento danificado" corrigida';
    RAISE NOTICE '';
END;
$$;