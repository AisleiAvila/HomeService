import { ServiceStatus } from "@/src/models/maintenance.models";

/**
 * Utilitário de Migração de Status
 * 
 * Mapeia status do sistema antigo (23 status com fluxo de cliente e orçamento)
 * para o novo sistema simplificado (11 status - Admin → Professional → Admin)
 * 
 * Contexto da Migração:
 * - Sistema antigo: Cliente criava solicitação → Admin enviava orçamento → Cliente aprovava
 * - Sistema novo: Admin cria solicitação → Atribui profissional → Profissional executa → Admin paga
 * 
 * @see PLANO_MIGRACAO_STATUS.md para detalhes completos da migração
 */
export class StatusMigrationUtil {
  
  /**
   * Mapa completo de conversão: status antigo → status novo
   * 
   * Regras de Negócio:
   * 1. Status de orçamento são eliminados (sem fluxo de aprovação de cliente)
   * 2. Status de análise/aguardando → "Solicitado" (admin ainda não atribuiu)
   * 3. Status de execução → mantém semântica similar
   * 4. Status finais → mapeados para equivalentes administrativos
   */
  private static readonly migrationMap: Record<string, ServiceStatus> = {
    // ========================================================================
    // STATUS EM PORTUGUÊS - Sistema Antigo
    // ========================================================================
    
    // FASE INICIAL: Solicitação e Análise
    "Em análise": "Solicitado",                    // Admin ainda analisando, não atribuiu
    "Aguardando esclarecimentos": "Solicitado",    // Voltou ao estado inicial
    "Buscando profissional": "Solicitado",         // Admin procurando quem fazer
    
    // FASE DE ORÇAMENTO (DEPRECATED - sem equivalente direto)
    "Orçamento enviado": "Cancelado",              // Sem fluxo de orçamento, cancela
    "Aguardando aprovação do orçamento": "Cancelado", // Cliente não aprova mais
    "Orçamento aprovado": "Atribuído",             // Assumir que foi aceito e atribuído
    "Orçamento rejeitado": "Cancelado",            // Projeto não prossegue
    
    // FASE DE ATRIBUIÇÃO
    "Profissional selecionado": "Atribuído",       // Admin escolheu profissional
    "Aguardando confirmação do profissional": "Aguardando Confirmação", // Nome direto
    
    // FASE DE AGENDAMENTO
    "Aguardando data de execução": "Aceito",       // Profissional aceitou, falta agendar
    "Data proposta pelo administrador": "Atribuído", // Admin sugerindo, ainda negociando
    "Aguardando aprovação da data": "Aceito",      // Profissional definindo quando
    "Data aprovada": "Data Definida",              // Data confirmada
    "Data rejeitada": "Aceito",                    // Volta a negociar data
    "Agendado": "Data Definida",                   // Data agendada pelo profissional
    
    // FASE DE EXECUÇÃO
    "Em execução": "Em Progresso",                 // Serviço sendo executado
    
    // FASE DE CONCLUSÃO
    "Concluído - Aguardando aprovação": "Aguardando Finalização", // Profissional terminou
    "Aprovado": "Pagamento Feito",                 // Cliente aprovava → Admin paga agora
    "Rejeitado": "Em Progresso",                   // Volta para execução se rejeitado
    
    // FASE DE PAGAMENTO
    "Pago": "Pagamento Feito",                     // Pagamento ao profissional
    
    // ESTADOS FINAIS
    "Finalizado": "Concluído",                     // Processo completo
    "Cancelado": "Cancelado",                      // Mantém cancelamento
    
    // ========================================================================
    // STATUS EM INGLÊS - Sistema Antigo (se existirem)
    // ========================================================================
    "Requested": "Solicitado",
    "InAnalysis": "Solicitado",
    "AwaitingClarifications": "Solicitado",
    "QuoteSent": "Cancelado",
    "AwaitingQuoteApproval": "Cancelado",
    "QuoteApproved": "Atribuído",
    "QuoteRejected": "Cancelado",
    "AwaitingExecutionDate": "Aceito",
    "DateProposedByAdmin": "Atribuído",
    "AwaitingDateApproval": "Aceito",
    "DateApproved": "Data Definida",
    "DateRejected": "Aceito",
    "SearchingProfessional": "Solicitado",
    "ProfessionalSelected": "Atribuído",
    "AwaitingProfessionalConfirmation": "Aguardando Confirmação",
    "Scheduled": "Data Definida",
    "InProgress": "Em Progresso",
    "CompletedAwaitingApproval": "Aguardando Finalização",
    "Completed": "Concluído",
    "Cancelled": "Cancelado",
    "Paid": "Pagamento Feito",
  };
  
  /**
   * Lista de todos os status do novo sistema (11 status)
   * Usado para validação rápida
   */
  private static readonly newStatuses: ServiceStatus[] = [
    "Solicitado",
    "Atribuído",
    "Aguardando Confirmação",
    "Aceito",
    "Recusado",
    "Data Definida",
    "Em Progresso",
    "Aguardando Finalização",
    "Pagamento Feito",
    "Concluído",
    "Cancelado",
  ];
  
  /**
   * Converte status do sistema antigo para o novo sistema simplificado
   * 
   * @param oldStatus - Status do sistema antigo (deprecated) ou novo
   * @returns Status equivalente no novo sistema de 11 status
   * 
   * @example
   * ```typescript
   * StatusMigrationUtil.migrateStatus("Em análise")      // → "Solicitado"
   * StatusMigrationUtil.migrateStatus("Agendado")        // → "Data Definida"
   * StatusMigrationUtil.migrateStatus("Em execução")     // → "Em Progresso"
   * StatusMigrationUtil.migrateStatus("Solicitado")      // → "Solicitado" (já é novo)
   * ```
   */
  static migrateStatus(oldStatus: string): ServiceStatus {
    // Se já é um status novo, retorna direto
    if (this.isNewStatus(oldStatus)) {
      return oldStatus;
    }
    // Busca no mapa de conversão
    const newStatus = this.migrationMap[oldStatus];
    if (newStatus) {
      return newStatus;
    }
    // Fallback: status desconhecido
    console.error(
      `[StatusMigrationUtil] Status desconhecido: "${oldStatus}". ` +
      `Usando "Cancelado" como fallback. Verifique o mapeamento.`
    );
    return "Cancelado";
  }
  
  /**
   * Converte múltiplos status de uma vez
   * Útil para migração em lote
   * 
   * @param statuses - Array de status antigos
   * @returns Array de status novos correspondentes
   * 
   * @example
   * ```typescript
   * StatusMigrationUtil.migrateMultiple([
   *   "Em análise", 
   *   "Agendado", 
   *   "Finalizado"
   * ]) 
   * // → ["Solicitado", "Data Definida", "Concluído"]
   * ```
   */
  static migrateMultiple(statuses: string[]): ServiceStatus[] {
    return statuses.map(status => this.migrateStatus(status));
  }
  
  /**
   * Verifica se um status pertence ao novo sistema (11 status)
   * 
   * @param status - Status a verificar
   * @returns true se for um status novo, false se deprecated
   * 
   * @example
   * ```typescript
   * StatusMigrationUtil.isNewStatus("Solicitado")     // → true
   * StatusMigrationUtil.isNewStatus("Em análise")     // → false
   * StatusMigrationUtil.isNewStatus("Agendado")       // → false
   * ```
   */
  static isNewStatus(status: string): status is ServiceStatus {
    return this.newStatuses.includes(status as ServiceStatus);
  }
  
  /**
   * Verifica se um status é deprecated (do sistema antigo)
   * 
   * @param status - Status a verificar
   * @returns true se for deprecated, false se for novo
   * 
   * @example
   * ```typescript
   * StatusMigrationUtil.isDeprecatedStatus("Em análise")  // → true
   * StatusMigrationUtil.isDeprecatedStatus("Solicitado")  // → false
   * ```
   */
  static isDeprecatedStatus(status: string): boolean {
    return !this.isNewStatus(status);
  }
  
  /**
   * Retorna o status antigo correspondente a um status novo
   * Útil para exibir mensagens de migração
   * 
   * @param newStatus - Status do novo sistema
   * @returns Array de status antigos que mapeiam para este novo status
   * 
   * @example
   * ```typescript
   * StatusMigrationUtil.getOldStatusesFor("Solicitado")
   * // → ["Em análise", "Aguardando esclarecimentos", "Buscando profissional", ...]
   * ```
   */
  static getOldStatusesFor(newStatus: string): string[] {
    const oldStatuses: string[] = [];
    for (const [oldStatus, mappedStatus] of Object.entries(this.migrationMap)) {
      if (mappedStatus === newStatus) {
        oldStatuses.push(oldStatus);
      }
    }
    return oldStatuses;
  }
  
  /**
   * Gera relatório de migração mostrando quantos status de cada tipo seriam convertidos
   * Útil para análise antes de executar migração real
   * 
   * @param statuses - Array de status a serem analisados
   * @returns Objeto com estatísticas de migração
   * 
   * @example
   * ```typescript
   * const report = StatusMigrationUtil.getMigrationReport(allStatuses);
   * console.log(report);
   * // {
   * //   total: 100,
   * //   alreadyNew: 20,
   * //   needsMigration: 80,
   * //   byNewStatus: {
   * //     "Solicitado": 30,
   * //     "Data Definida": 25,
   * //     ...
   * //   }
   * // }
   * ```
   */
  static getMigrationReport(statuses: string[]): {
    total: number;
    alreadyNew: number;
    needsMigration: number;
    byNewStatus: Record<ServiceStatus, number>;
  } {
    const report = {
      total: statuses.length,
      alreadyNew: 0,
      needsMigration: 0,
      byNewStatus: {} as Record<ServiceStatus, number>,
    };
    // Inicializar contadores
    for (const status of this.newStatuses) {
      report.byNewStatus[status] = 0;
    }
    // Contar cada status
    for (const status of statuses) {
      if (this.isNewStatus(status)) {
        report.alreadyNew++;
      } else {
        report.needsMigration++;
      }
      const newStatus = this.migrateStatus(status);
      report.byNewStatus[newStatus]++;
    }
    return report;
  }
  
  /**
   * Valida se um status é válido (novo ou deprecated com mapeamento)
   * 
   * @param status - Status a validar
   * @returns true se válido, false caso contrário
   * 
   * @example
   * ```typescript
   * StatusMigrationUtil.isValidStatus("Solicitado")    // → true
   * StatusMigrationUtil.isValidStatus("Em análise")    // → true
   * StatusMigrationUtil.isValidStatus("InvalidStatus") // → false
   * ```
   */
  static isValidStatus(status: string): boolean {
    return this.isNewStatus(status) || status in this.migrationMap;
  }
  
  /**
   * Retorna uma lista de todos os status deprecated conhecidos
   * Útil para gerar documentação ou relatórios
   * 
   * @returns Array com todos os status deprecated
   */
  static getAllDeprecatedStatuses(): string[] {
    return Object.keys(this.migrationMap);
  }
  
  /**
   * Retorna uma lista de todos os status do novo sistema
   * 
   * @returns Array com os 11 status novos
   */
  static getAllNewStatuses(): ServiceStatus[] {
    return [...this.newStatuses];
  }
  
  /**
   * Gera descrição explicativa da migração para um status específico
   * Útil para logs, auditoria ou exibir ao usuário
   * 
   * @param oldStatus - Status antigo
   * @returns Descrição da conversão
   * 
   * @example
   * ```typescript
   * StatusMigrationUtil.getMigrationDescription("Em análise")
   * // → "Status 'Em análise' (deprecated) migrado para 'Solicitado' (novo sistema)"
   * ```
   */
  static getMigrationDescription(oldStatus: string): string {
    if (this.isNewStatus(oldStatus)) {
      return `Status '${oldStatus}' já pertence ao novo sistema (11 status)`;
    }
    const newStatus = this.migrateStatus(oldStatus);
    return `Status '${oldStatus}' (deprecated) migrado para '${newStatus}' (novo sistema)`;
  }
}
