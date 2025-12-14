# Guia de Implementação: Sistema de Imagens para Solicitações de Serviço

## 📋 Visão Geral

Sistema completo para permitir que profissionais façam upload de imagens antes e depois da execução de serviços.

## 🗄️ Configuração da Base de Dados

### 1. Executar Script SQL

Execute o script [`add_service_images_table.sql`](../scripts/add_service_images_table.sql) no Supabase para criar:

- Tabela `service_request_images` com todos os campos necessários
- Índices para otimização de consultas
- Políticas RLS (Row Level Security) para controle de acesso
- Comentários de documentação

### 2. Criar Bucket de Storage

No painel do Supabase, crie um bucket de storage:

1. Acesse **Storage** no menu lateral
2. Clique em **New Bucket**
3. Nome: `service-images`
4. Tipo: **Public** (para URLs públicas)
5. Clique em **Create bucket**

Ou execute via SQL:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true);
```

### 3. Configurar Políticas de Storage

Adicione políticas para o bucket `service-images`:

```sql
-- Política: Profissionais podem fazer upload
CREATE POLICY "Profissionais podem fazer upload de imagens"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'service-images' AND
    auth.role() = 'authenticated'
  );

-- Política: Todos autenticados podem visualizar
CREATE POLICY "Usuários autenticados podem visualizar imagens"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'service-images');

-- Política: Profissionais podem deletar suas imagens
CREATE POLICY "Profissionais podem deletar suas imagens"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-images');
```

## 🔧 Componentes TypeScript

### Serviços Criados

1. **ServiceImageService** ([service-image.service.ts](../src/services/service-image.service.ts))

   - Gerenciamento completo de uploads
   - Validação de arquivos (tamanho, tipo MIME)
   - Integração com Supabase Storage
   - CRUD de registros de imagens

2. **WorkflowServiceSimplified** (atualizado)
   - Métodos integrados para upload de imagens
   - Validação de permissões por status
   - Auditoria de operações com imagens

### Tipos TypeScript

Adicionados em [`maintenance.models.ts`](../src/models/maintenance.models.ts):

```typescript
export interface ServiceRequestImage {
  id: number;
  service_request_id: number;
  uploaded_by: number;
  image_url: string;
  image_type: "before" | "after";
  description?: string | null;
  uploaded_at: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
}

export interface ServiceRequestImageUpload {
  service_request_id: number;
  image_type: "before" | "after";
  description?: string;
}
```

## 🎯 Fluxo de Uso

### Workflow de Imagens

```
┌─────────────────────────────────────────────────────┐
│  ANTES DO SERVIÇO (before)                          │
├─────────────────────────────────────────────────────┤
│  Status permitidos:                                 │
│  • Aguardando Confirmação                           │
│  • Aceito                                           │
│  • Data Definida                                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  DEPOIS DO SERVIÇO (after)                          │
├─────────────────────────────────────────────────────┤
│  Status permitidos:                                 │
│  • Em Progresso                                     │
│  • Aguardando Finalização                           │
│  • Pagamento Feito                                  │
│  • Concluído                                        │
└─────────────────────────────────────────────────────┘
```

## 💻 Exemplos de Uso

### 1. Upload de Imagem

```typescript
// No componente do profissional
async uploadImage(event: Event, imageType: 'before' | 'after') {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  const result = await this.workflowService.uploadServiceImage(
    file,
    this.requestId(),
    imageType,
    'Descrição opcional da imagem'
  );

  if (result) {
    console.log('Imagem enviada com sucesso:', result);
    await this.loadImages(); // Recarregar lista de imagens
  }
}
```

### 2. Listar Imagens

```typescript
// Buscar todas as imagens
const allImages = await this.workflowService.getServiceImages(requestId);

// Buscar apenas imagens "antes"
const beforeImages = await this.workflowService.getServiceImages(
  requestId,
  "before"
);

// Buscar apenas imagens "depois"
const afterImages = await this.workflowService.getServiceImages(
  requestId,
  "after"
);
```

### 3. Deletar Imagem

```typescript
async deleteImage(imageId: number) {
  const confirmed = confirm('Deseja realmente deletar esta imagem?');
  if (!confirmed) return;

  const success = await this.workflowService.deleteServiceImage(imageId);
  if (success) {
    await this.loadImages(); // Recarregar lista
  }
}
```

### 4. Atualizar Descrição

```typescript
async updateDescription(imageId: number, newDescription: string) {
  const success = await this.workflowService.updateImageDescription(
    imageId,
    newDescription
  );
}
```

### 5. Contar Imagens

```typescript
const count = await this.workflowService.getImageCount(requestId);
console.log(
  `Antes: ${count.before}, Depois: ${count.after}, Total: ${count.total}`
);
```

## 🎨 Exemplo de Componente Angular

```typescript
import { Component, input, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WorkflowServiceSimplified } from "../../services/workflow-simplified.service";
import { ServiceRequestImage } from "../../models/maintenance.models";

@Component({
  selector: "app-service-images",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Upload de imagens ANTES -->
      @if (canUploadBefore()) {
      <div class="border rounded-lg p-4">
        <h3 class="font-semibold mb-2">Imagens Antes do Serviço</h3>
        <input
          type="file"
          accept="image/*"
          (change)="uploadImage($event, 'before')"
          class="mb-2"
        />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          @for (image of beforeImages(); track image.id) {
          <div class="relative">
            <img
              [src]="image.image_url"
              [alt]="image.description || 'Imagem antes'"
              class="w-full h-32 object-cover rounded"
            />
            <button
              (click)="deleteImage(image.id)"
              class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
            >
              ×
            </button>
          </div>
          }
        </div>
      </div>
      }

      <!-- Upload de imagens DEPOIS -->
      @if (canUploadAfter()) {
      <div class="border rounded-lg p-4">
        <h3 class="font-semibold mb-2">Imagens Depois do Serviço</h3>
        <input
          type="file"
          accept="image/*"
          (change)="uploadImage($event, 'after')"
          class="mb-2"
        />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          @for (image of afterImages(); track image.id) {
          <div class="relative">
            <img
              [src]="image.image_url"
              [alt]="image.description || 'Imagem depois'"
              class="w-full h-32 object-cover rounded"
            />
            <button
              (click)="deleteImage(image.id)"
              class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
            >
              ×
            </button>
          </div>
          }
        </div>
      </div>
      }
    </div>
  `,
})
export class ServiceImagesComponent {
  requestId = input.required<number>();
  requestStatus = input.required<string>();

  private workflowService = inject(WorkflowServiceSimplified);

  private allImages = signal<ServiceRequestImage[]>([]);

  beforeImages = computed(() =>
    this.allImages().filter((img) => img.image_type === "before")
  );

  afterImages = computed(() =>
    this.allImages().filter((img) => img.image_type === "after")
  );

  canUploadBefore = computed(() => {
    const status = this.requestStatus();
    return ["Aguardando Confirmação", "Aceito", "Data Definida"].includes(
      status
    );
  });

  canUploadAfter = computed(() => {
    const status = this.requestStatus();
    return [
      "Em Progresso",
      "In Progress",
      "Aguardando Finalização",
      "Pagamento Feito",
      "Concluído",
    ].includes(status);
  });

  async ngOnInit() {
    await this.loadImages();
  }

  async loadImages() {
    const images = await this.workflowService.getServiceImages(
      this.requestId()
    );
    this.allImages.set(images);
  }

  async uploadImage(event: Event, imageType: "before" | "after") {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const result = await this.workflowService.uploadServiceImage(
      file,
      this.requestId(),
      imageType
    );

    if (result) {
      await this.loadImages();
    }

    // Limpar input
    input.value = "";
  }

  async deleteImage(imageId: number) {
    if (!confirm("Deseja realmente deletar esta imagem?")) return;

    const success = await this.workflowService.deleteServiceImage(imageId);
    if (success) {
      await this.loadImages();
    }
  }
}
```

## 🔒 Segurança e Validações

### Validações Implementadas

1. **Tamanho do arquivo**: Máximo 5MB
2. **Tipos permitidos**: JPEG, JPG, PNG, WebP
3. **Permissões**: Apenas profissional atribuído ou admin
4. **Status do serviço**:
   - "before" → antes de iniciar
   - "after" → após iniciar execução

### Políticas RLS

- ✅ Profissionais só podem fazer upload em suas solicitações
- ✅ Admins podem visualizar e deletar todas as imagens
- ✅ Clientes podem visualizar imagens de suas solicitações
- ✅ Profissionais podem deletar suas próprias imagens

## 📱 Responsividade

O componente de exemplo usa TailwindCSS com:

- Grid responsivo: 2 colunas no mobile, 4 no desktop
- Classes: `grid-cols-2 md:grid-cols-4`
- Images com `object-cover` para manter proporção

## 🌍 Internacionalização

Adicione as seguintes chaves ao arquivo de traduções:

```typescript
// pt-PT
{
  "imageUploadedSuccessfully": "Imagem enviada com sucesso",
  "errorUploadingImage": "Erro ao enviar imagem",
  "imageDeletedSuccessfully": "Imagem eliminada com sucesso",
  "errorDeletingImage": "Erro ao eliminar imagem",
  "imageDescriptionUpdated": "Descrição atualizada com sucesso",
  "errorUpdatingDescription": "Erro ao atualizar descrição"
}

// en-US
{
  "imageUploadedSuccessfully": "Image uploaded successfully",
  "errorUploadingImage": "Error uploading image",
  "imageDeletedSuccessfully": "Image deleted successfully",
  "errorDeletingImage": "Error deleting image",
  "imageDescriptionUpdated": "Description updated successfully",
  "errorUpdatingDescription": "Error updating description"
}
```

## ✅ Checklist de Implementação

- [x] Script SQL criado
- [x] Tipos TypeScript definidos
- [x] ServiceImageService implementado
- [x] WorkflowServiceSimplified atualizado
- [ ] Criar bucket `service-images` no Supabase
- [ ] Executar script SQL no Supabase
- [ ] Configurar políticas de storage
- [ ] Criar componente de UI para upload
- [ ] Adicionar traduções i18n
- [ ] Testar upload de imagens
- [ ] Testar permissões RLS
- [ ] Testar validações de status

## 🚀 Próximos Passos

1. Execute o script SQL no Supabase
2. Crie o bucket de storage
3. Configure as políticas de storage
4. Crie um componente de UI conforme o exemplo
5. Adicione as traduções necessárias
6. Teste todas as funcionalidades

## 📞 Suporte

Para dúvidas ou problemas, verifique:

- Logs do console do navegador
- Logs do Supabase
- Políticas RLS configuradas corretamente
- Bucket de storage criado e público
