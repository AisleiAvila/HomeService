import { ServiceStatus } from "../models/maintenance.models";
import { StatusMigrationUtil } from "./status-migration.util";

describe("StatusMigrationUtil", () => {
  
  describe("migrateStatus", () => {
    
    it("deve migrar status deprecated em português para novos equivalentes", () => {
      expect(StatusMigrationUtil.migrateStatus("Em análise")).toBe("Solicitado");
      expect(StatusMigrationUtil.migrateStatus("Agendado")).toBe("Data Definida");
      expect(StatusMigrationUtil.migrateStatus("Em execução")).toBe("Em Progresso");
      expect(StatusMigrationUtil.migrateStatus("Finalizado")).toBe("Concluído");
      expect(StatusMigrationUtil.migrateStatus("Aprovado")).toBe("Pagamento Feito");
    });
    
    it("deve migrar status deprecated em inglês para novos equivalentes", () => {
      expect(StatusMigrationUtil.migrateStatus("InAnalysis")).toBe("Solicitado");
      expect(StatusMigrationUtil.migrateStatus("Scheduled")).toBe("Data Definida");
      expect(StatusMigrationUtil.migrateStatus("InProgress")).toBe("Em Progresso");
      expect(StatusMigrationUtil.migrateStatus("Completed")).toBe("Concluído");
    });
    
    it("deve retornar o mesmo status se já for novo", () => {
      expect(StatusMigrationUtil.migrateStatus("Solicitado")).toBe("Solicitado");
      expect(StatusMigrationUtil.migrateStatus("Atribuído")).toBe("Atribuído");
      expect(StatusMigrationUtil.migrateStatus("Em Progresso")).toBe("Em Progresso");
      expect(StatusMigrationUtil.migrateStatus("Concluído")).toBe("Concluído");
    });
    
    it("deve converter status de orçamento para Cancelado", () => {
      expect(StatusMigrationUtil.migrateStatus("Orçamento enviado")).toBe("Cancelado");
      expect(StatusMigrationUtil.migrateStatus("Aguardando aprovação do orçamento")).toBe("Cancelado");
      expect(StatusMigrationUtil.migrateStatus("Orçamento rejeitado")).toBe("Cancelado");
      expect(StatusMigrationUtil.migrateStatus("QuoteSent")).toBe("Cancelado");
    });
    
    it("deve converter 'Orçamento aprovado' para Atribuído (assumir que foi aceito)", () => {
      expect(StatusMigrationUtil.migrateStatus("Orçamento aprovado")).toBe("Atribuído");
      expect(StatusMigrationUtil.migrateStatus("QuoteApproved")).toBe("Atribuído");
    });
    
    it("deve retornar Cancelado para status desconhecido e logar erro", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      
      const result = StatusMigrationUtil.migrateStatus("StatusInvalido" as ServiceStatus);
      
      expect(result).toBe("Cancelado");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Status desconhecido: \"StatusInvalido\"")
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe("migrateMultiple", () => {
    
    it("deve migrar array de status corretamente", () => {
      const oldStatuses: string[] = [
        "Em análise",
        "Agendado",
        "Em execução",
        "Finalizado",
        "Solicitado", // já novo
      ];
      const result = StatusMigrationUtil.migrateMultiple(oldStatuses);
      expect(result).toEqual([
        "Solicitado",
        "Data Definida",
        "Em Progresso",
        "Concluído",
        "Solicitado",
      ]);
    });
    
    it("deve retornar array vazio para entrada vazia", () => {
      expect(StatusMigrationUtil.migrateMultiple([])).toEqual([]);
    });
  });
  
  describe("isNewStatus", () => {
    
    it("deve retornar true para status do novo sistema", () => {
      expect(StatusMigrationUtil.isNewStatus("Solicitado")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Atribuído")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Aguardando Confirmação")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Aceito")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Recusado")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Data Definida")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Em Progresso")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Aguardando Finalização")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Pagamento Feito")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Concluído")).toBe(true);
      expect(StatusMigrationUtil.isNewStatus("Cancelado")).toBe(true);
    });
    
    it("deve retornar false para status deprecated", () => {
      expect(StatusMigrationUtil.isNewStatus("Em análise")).toBe(false);
      expect(StatusMigrationUtil.isNewStatus("Agendado")).toBe(false);
      expect(StatusMigrationUtil.isNewStatus("Em execução")).toBe(false);
      expect(StatusMigrationUtil.isNewStatus("Finalizado")).toBe(false);
      expect(StatusMigrationUtil.isNewStatus("Orçamento enviado")).toBe(false);
    });
  });
  
  describe("isDeprecatedStatus", () => {
    
    it("deve retornar true para status deprecated", () => {
      expect(StatusMigrationUtil.isDeprecatedStatus("Em análise")).toBe(true);
      expect(StatusMigrationUtil.isDeprecatedStatus("Agendado")).toBe(true);
      expect(StatusMigrationUtil.isDeprecatedStatus("Finalizado")).toBe(true);
    });
    
    it("deve retornar false para status novos", () => {
      expect(StatusMigrationUtil.isDeprecatedStatus("Solicitado")).toBe(false);
      expect(StatusMigrationUtil.isDeprecatedStatus("Em Progresso")).toBe(false);
      expect(StatusMigrationUtil.isDeprecatedStatus("Concluído")).toBe(false);
    });
  });
  
  describe("getOldStatusesFor", () => {
    
    it("deve retornar todos os status antigos que mapeiam para 'Solicitado'", () => {
      const oldStatuses = StatusMigrationUtil.getOldStatusesFor("Solicitado");
      
      expect(oldStatuses).toContain("Em análise");
      expect(oldStatuses).toContain("Aguardando esclarecimentos");
      expect(oldStatuses).toContain("Buscando profissional");
      expect(oldStatuses).toContain("InAnalysis");
      expect(oldStatuses).toContain("Requested");
    });
    
    it("deve retornar status antigos que mapeiam para 'Cancelado'", () => {
      const oldStatuses = StatusMigrationUtil.getOldStatusesFor("Cancelado");
      
      expect(oldStatuses).toContain("Orçamento enviado");
      expect(oldStatuses).toContain("Orçamento rejeitado");
      expect(oldStatuses).toContain("Cancelado");
      expect(oldStatuses).toContain("QuoteSent");
    });
    
    it("deve retornar array vazio se nenhum status antigo mapeia para o novo", () => {
      // "Recusado" é um status novo sem mapeamento de antigos
      const oldStatuses = StatusMigrationUtil.getOldStatusesFor("Recusado");
      expect(oldStatuses).toEqual([]);
    });
  });
  
  describe("getMigrationReport", () => {
    
    it("deve gerar relatório correto de migração", () => {
      const statuses: string[] = [
        "Em análise",        // deprecated → Solicitado
        "Em análise",        // deprecated → Solicitado
        "Solicitado",        // já novo
        "Agendado",          // deprecated → Data Definida
        "Em execução",       // deprecated → Em Progresso
        "Finalizado",        // deprecated → Concluído
      ];
      const report = StatusMigrationUtil.getMigrationReport(statuses);
      
      expect(report.total).toBe(6);
      expect(report.alreadyNew).toBe(1);
      expect(report.needsMigration).toBe(5);
      expect(report.byNewStatus["Solicitado"]).toBe(3); // 2 deprecated + 1 já novo
      expect(report.byNewStatus["Data Definida"]).toBe(1);
      expect(report.byNewStatus["Em Progresso"]).toBe(1);
      expect(report.byNewStatus["Concluído"]).toBe(1);
    });
    
    it("deve retornar relatório vazio para array vazio", () => {
      const report = StatusMigrationUtil.getMigrationReport([]);
      
      expect(report.total).toBe(0);
      expect(report.alreadyNew).toBe(0);
      expect(report.needsMigration).toBe(0);
    });
    
    it("deve contar corretamente quando todos são novos", () => {
      const statuses: string[] = [
        "Solicitado",
        "Em Progresso",
        "Concluído",
      ];
      const report = StatusMigrationUtil.getMigrationReport(statuses);
      
      expect(report.total).toBe(3);
      expect(report.alreadyNew).toBe(3);
      expect(report.needsMigration).toBe(0);
    });
  });
  
  describe("isValidStatus", () => {
    
    it("deve retornar true para status novos", () => {
      expect(StatusMigrationUtil.isValidStatus("Solicitado")).toBe(true);
      expect(StatusMigrationUtil.isValidStatus("Em Progresso")).toBe(true);
    });
    
    it("deve retornar true para status deprecated com mapeamento", () => {
      expect(StatusMigrationUtil.isValidStatus("Em análise")).toBe(true);
      expect(StatusMigrationUtil.isValidStatus("Agendado")).toBe(true);
      expect(StatusMigrationUtil.isValidStatus("Orçamento enviado")).toBe(true);
    });
    
    it("deve retornar false para status inválido", () => {
      expect(StatusMigrationUtil.isValidStatus("StatusInvalido")).toBe(false);
      expect(StatusMigrationUtil.isValidStatus("")).toBe(false);
      expect(StatusMigrationUtil.isValidStatus("xyz123")).toBe(false);
    });
  });
  
  describe("getAllDeprecatedStatuses", () => {
    
    it("deve retornar lista de todos os status deprecated", () => {
      const deprecated = StatusMigrationUtil.getAllDeprecatedStatuses();
      
      expect(deprecated).toContain("Em análise");
      expect(deprecated).toContain("Agendado");
      expect(deprecated).toContain("Em execução");
      expect(deprecated).toContain("Finalizado");
      expect(deprecated).toContain("Orçamento enviado");
      expect(deprecated.length).toBeGreaterThan(20); // Pelo menos 20+ status deprecated
    });
    
    it("não deve conter status novos", () => {
      const deprecated = StatusMigrationUtil.getAllDeprecatedStatuses();
      
      expect(deprecated).not.toContain("Solicitado");
      expect(deprecated).not.toContain("Em Progresso");
      expect(deprecated).not.toContain("Concluído");
    });
  });
  
  describe("getAllNewStatuses", () => {
    
    it("deve retornar exatamente 11 status novos", () => {
      const newStatuses = StatusMigrationUtil.getAllNewStatuses();
      expect(newStatuses.length).toBe(11);
    });
    
    it("deve conter todos os status do novo sistema", () => {
      const newStatuses = StatusMigrationUtil.getAllNewStatuses();
      
      expect(newStatuses).toContain("Solicitado");
      expect(newStatuses).toContain("Atribuído");
      expect(newStatuses).toContain("Aguardando Confirmação");
      expect(newStatuses).toContain("Aceito");
      expect(newStatuses).toContain("Recusado");
      expect(newStatuses).toContain("Data Definida");
      expect(newStatuses).toContain("Em Progresso");
      expect(newStatuses).toContain("Aguardando Finalização");
      expect(newStatuses).toContain("Pagamento Feito");
      expect(newStatuses).toContain("Concluído");
      expect(newStatuses).toContain("Cancelado");
    });
  });
  
  describe("getMigrationDescription", () => {
    
    it("deve retornar descrição correta para status deprecated", () => {
      const desc = StatusMigrationUtil.getMigrationDescription("Em análise");
      
      expect(desc).toContain("Em análise");
      expect(desc).toContain("deprecated");
      expect(desc).toContain("Solicitado");
      expect(desc).toContain("novo sistema");
    });
    
    it("deve retornar descrição indicando que já é novo", () => {
      const desc = StatusMigrationUtil.getMigrationDescription("Solicitado");
      
      expect(desc).toContain("Solicitado");
      expect(desc).toContain("já pertence ao novo sistema");
      expect(desc).toContain("11 status");
    });
    
    it("deve gerar descrições diferentes para diferentes status", () => {
      const desc1 = StatusMigrationUtil.getMigrationDescription("Agendado");
      const desc2 = StatusMigrationUtil.getMigrationDescription("Finalizado");
      
      expect(desc1).toContain("Data Definida");
      expect(desc2).toContain("Concluído");
      expect(desc1).not.toEqual(desc2);
    });
  });
  
  describe("Cenários de Integração", () => {
    
    it("deve processar lote completo de status mistos", () => {
      const mixedStatuses: string[] = [
        "Em análise",              // deprecated
        "Solicitado",              // novo
        "Orçamento enviado",       // deprecated
        "Em Progresso",            // novo
        "Agendado",                // deprecated
        "Concluído",               // novo
      ];
      const migrated = StatusMigrationUtil.migrateMultiple(mixedStatuses);
      const report = StatusMigrationUtil.getMigrationReport(mixedStatuses);
      
      expect(migrated).toEqual([
        "Solicitado",
        "Solicitado",
        "Cancelado",
        "Em Progresso",
        "Data Definida",
        "Concluído",
      ]);
      
      expect(report.total).toBe(6);
      expect(report.alreadyNew).toBe(3);
      expect(report.needsMigration).toBe(3);
    });
    
    it("deve identificar corretamente status que precisam de atenção especial", () => {
      // Status de orçamento não têm equivalente direto - vão para Cancelado
      const quoteStatuses = [
        "Orçamento enviado",
        "Aguardando aprovação do orçamento",
        "Orçamento rejeitado",
      ];
      for (const status of quoteStatuses) {
        const migrated = StatusMigrationUtil.migrateStatus(status);
        expect(migrated).toBe("Cancelado");
        expect(StatusMigrationUtil.isDeprecatedStatus(status)).toBe(true);
      }
      
      // Exceto "Orçamento aprovado" que assume que foi aceito
      const approved = StatusMigrationUtil.migrateStatus("Orçamento aprovado");
      expect(approved).toBe("Atribuído");
    });
  });
});
