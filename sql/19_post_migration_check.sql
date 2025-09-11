-- ================================================================
-- SCRIPT DE VERIFICAÇÃO PÓS-MIGRAÇÃO
-- Para executar APÓS o script principal de migração
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO PÓS-MIGRAÇÃO ===';
    RAISE NOTICE 'Este script verifica se a migração foi executada com sucesso.';
    RAISE NOTICE '';
END $$;

-- 1. Verificar se as novas colunas foram criadas
DO $$
DECLARE
    col_count INTEGER;
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '1️⃣ VERIFICANDO NOVAS COLUNAS...';
    
    -- Verificar requested_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'requested_datetime';
    
    IF col_count = 0 THEN
        missing_columns := array_append(missing_columns, 'requested_datetime');
    END IF;
    
    -- Verificar scheduled_start_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'scheduled_start_datetime';
    
    IF col_count = 0 THEN
        missing_columns := array_append(missing_columns, 'scheduled_start_datetime');
    END IF;
    
    -- Verificar estimated_duration_minutes
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'estimated_duration_minutes';
    
    IF col_count = 0 THEN
        missing_columns := array_append(missing_columns, 'estimated_duration_minutes');
    END IF;
    
    -- Verificar actual_start_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'actual_start_datetime';
    
    IF col_count = 0 THEN
        missing_columns := array_append(missing_columns, 'actual_start_datetime');
    END IF;
    
    -- Verificar actual_end_datetime
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'actual_end_datetime';
    
    IF col_count = 0 THEN
        missing_columns := array_append(missing_columns, 'actual_end_datetime');
    END IF;
    
    -- Reportar resultado
    IF array_length(missing_columns, 1) IS NULL THEN
        RAISE NOTICE '✅ Todas as 5 novas colunas foram criadas com sucesso!';
    ELSE
        RAISE NOTICE '❌ Colunas em falta: %', array_to_string(missing_columns, ', ');
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 2. Verificar se as funções foram criadas
DO $$
DECLARE
    missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '2️⃣ VERIFICANDO FUNÇÕES...';
    
    -- Verificar calculate_actual_duration_minutes
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_actual_duration_minutes') THEN
        missing_functions := array_append(missing_functions, 'calculate_actual_duration_minutes');
    END IF;
    
    -- Verificar get_scheduling_status
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_scheduling_status') THEN
        missing_functions := array_append(missing_functions, 'get_scheduling_status');
    END IF;
    
    -- Verificar update_service_status_on_time_change
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_service_status_on_time_change') THEN
        missing_functions := array_append(missing_functions, 'update_service_status_on_time_change');
    END IF;
    
    -- Reportar resultado
    IF array_length(missing_functions, 1) IS NULL THEN
        RAISE NOTICE '✅ Todas as funções foram criadas com sucesso!';
    ELSE
        RAISE NOTICE '❌ Funções em falta: %', array_to_string(missing_functions, ', ');
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 3. Verificar se a view foi criada
DO $$
BEGIN
    RAISE NOTICE '3️⃣ VERIFICANDO VIEW...';
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'vw_service_scheduling_report') THEN
        RAISE NOTICE '✅ View vw_service_scheduling_report foi criada com sucesso!';
    ELSE
        RAISE NOTICE '❌ View vw_service_scheduling_report não foi encontrada!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 4. Verificar se o trigger foi criado
DO $$
BEGIN
    RAISE NOTICE '4️⃣ VERIFICANDO TRIGGER...';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'tr_update_service_status_on_time_change'
        AND event_object_table = 'service_requests'
    ) THEN
        RAISE NOTICE '✅ Trigger tr_update_service_status_on_time_change foi criado com sucesso!';
    ELSE
        RAISE NOTICE '❌ Trigger tr_update_service_status_on_time_change não foi encontrado!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 5. Testar as funções
DO $$
DECLARE
    test_duration INTEGER;
    test_status TEXT;
BEGIN
    RAISE NOTICE '5️⃣ TESTANDO FUNÇÕES...';
    
    -- Testar calculate_actual_duration_minutes
    BEGIN
        SELECT calculate_actual_duration_minutes(
            NOW() - INTERVAL '2 hours', 
            NOW()
        ) INTO test_duration;
        
        IF test_duration = 120 THEN
            RAISE NOTICE '✅ Função calculate_actual_duration_minutes funcionando (resultado: % minutos)', test_duration;
        ELSE
            RAISE NOTICE '⚠️ Função calculate_actual_duration_minutes retornou valor inesperado: %', test_duration;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao testar calculate_actual_duration_minutes: %', SQLERRM;
    END;
    
    -- Testar get_scheduling_status
    BEGIN
        SELECT get_scheduling_status(
            NOW() - INTERVAL '1 day',  -- requested
            NOW() + INTERVAL '1 hour', -- scheduled
            NULL,                      -- actual_start
            NULL,                      -- actual_end
            'Scheduled'                -- status
        ) INTO test_status;
        
        RAISE NOTICE '✅ Função get_scheduling_status funcionando (resultado: %)', test_status;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao testar get_scheduling_status: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- 6. Testar a view (só se existir)
DO $$
DECLARE
    view_count INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '6️⃣ TESTANDO VIEW...';
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'vw_service_scheduling_report') THEN
        BEGIN
            -- Contar registros na view
            EXECUTE 'SELECT COUNT(*) FROM vw_service_scheduling_report' INTO view_count;
            RAISE NOTICE '✅ View vw_service_scheduling_report funcionando (% registros encontrados)', view_count;
            
            -- Mostrar amostra se houver dados
            IF view_count > 0 THEN
                RAISE NOTICE 'Amostra dos primeiros registros:';
                FOR rec IN 
                    EXECUTE 'SELECT id, title, status, scheduling_status FROM vw_service_scheduling_report LIMIT 3'
                LOOP
                    RAISE NOTICE '  ID: %, Título: %, Status: %, Scheduling: %', 
                        rec.id, rec.title, rec.status, rec.scheduling_status;
                END LOOP;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro ao testar view: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '❌ View não existe - não é possível testar';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 7. Verificar índices criados
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    RAISE NOTICE '7️⃣ VERIFICANDO ÍNDICES...';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'service_requests' 
    AND indexname IN (
        'idx_service_requests_requested_datetime',
        'idx_service_requests_scheduled_start_datetime',
        'idx_service_requests_actual_start_datetime',
        'idx_service_requests_actual_end_datetime'
    );
    
    RAISE NOTICE '✅ % de 4 índices de performance criados', index_count;
    RAISE NOTICE '';
END $$;

-- 8. Resumo final
DO $$
BEGIN
    RAISE NOTICE '=== RESUMO DA VERIFICAÇÃO ===';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Se todas as verificações acima mostraram sucesso, a migração foi concluída!';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Reinicie a aplicação Angular para carregar as novas funcionalidades';
    RAISE NOTICE '2. Teste a criação de novos pedidos de serviço';
    RAISE NOTICE '3. Teste o agendamento de serviços (admin)';
    RAISE NOTICE '4. Teste o controle de tempo (profissional)';
    RAISE NOTICE '5. Verifique os relatórios de tempo (admin)';
    RAISE NOTICE '';
    RAISE NOTICE '📚 Para mais informações, consulte: AGENDAMENTO_CONTROLE_TEMPO.md';
    RAISE NOTICE '';
END $$;
