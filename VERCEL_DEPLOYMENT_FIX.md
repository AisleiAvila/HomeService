# Vercel Deployment Fix - CommonJS Dependencies Warning

## Problemas Resolvidos

### 1. **CommonJS Dependencies Warning**

Durante o deploy no Vercel, aparecia o seguinte warning:

```
▲ [WARNING] Module 'ws' used by 'node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js' is not ESM
  CommonJS or AMD dependencies can cause optimization bailouts.
```

### 2. **Vercel.json Schema Validation Error**

Durante o build no Vercel, aparecia o seguinte erro:

```
The `vercel.json` schema validation failed with the following message: `functions` should NOT have fewer than 1 properties
```

## Soluções Implementadas

### 1. Configuração do Angular (`angular.json`)

Adicionada a propriedade `allowedCommonJsDependencies` na configuração de build:

```json
{
  "allowedCommonJsDependencies": [
    "ws",
    "@supabase/realtime-js",
    "@supabase/postgrest-js",
    "@supabase/storage-js",
    "@supabase/gotrue-js",
    "@supabase/functions-js",
    "@supabase/node-fetch",
    "@supabase/supabase-js",
    "buffer",
    "cross-fetch"
  ]
}
```

### 2. Configuração do Vercel (`vercel.json`)

Criado arquivo de configuração específico para o Vercel (removida propriedade `functions` vazia para evitar erro de schema):

```json
{
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist",
  "framework": null,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Nota:** Removida a propriedade `functions: {}` que causava erro de validação do schema do Vercel.

### 3. Script de Build Específico (`package.json`)

Adicionado script específico para o Vercel:

```json
{
  "scripts": {
    "build:vercel": "ng build --configuration=production"
  }
}
```

### 4. Arquivo `.vercelignore`

Criado para otimizar o processo de build excluindo arquivos desnecessários.

## Resultado

- ✅ Build executado sem warnings de CommonJS
- ✅ Schema do vercel.json validado corretamente
- ✅ Aplicação funcional no Vercel
- ✅ Todos os módulos do Supabase funcionando corretamente

## Comandos de Teste

```bash
# Testar build local
npm run build

# Testar build específico para Vercel
npm run build:vercel
```

## Observações

- O módulo 'ws' é usado pelo Supabase Realtime em ambiente Node.js
- Em ambiente browser, esses módulos são automaticamente substituídos por polyfills
- A configuração `allowedCommonJsDependencies` informa ao Angular que é seguro incluir esses módulos
