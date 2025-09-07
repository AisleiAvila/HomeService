# Vercel Deployment Fix - CommonJS Dependencies Warning

## Problema Original

Durante o deploy no Vercel, aparecia o seguinte warning:

```
▲ [WARNING] Module 'ws' used by 'node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js' is not ESM
  CommonJS or AMD dependencies can cause optimization bailouts.
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

Criado arquivo de configuração específico para o Vercel:

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

- ✅ Build executado sem warnings
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
