require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = process.env.BUCKET_NAME

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Lista recursivamente todos os arquivos de uma pasta (e subpastas) do bucket.
 * Itens sem metadata (id === null) são tratados como pastas.
 */
async function listAllFiles(prefix = '') {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    })

  if (error) throw error
  if (!data || data.length === 0) return []

  const filePaths = []

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name

    if (item.id === null) {
      // É uma pasta — listar recursivamente
      console.log(`  Entrando na pasta: ${fullPath}`)
      const nested = await listAllFiles(fullPath)
      filePaths.push(...nested)
    } else {
      filePaths.push(fullPath)
    }
  }

  return filePaths
}

async function cleanBucket() {
  console.log(`Buscando arquivos no bucket "${BUCKET}"...`)

  let allPaths
  try {
    allPaths = await listAllFiles('')
  } catch (err) {
    console.error('Erro ao listar arquivos:', err)
    return
  }

  if (allPaths.length === 0) {
    console.log('Nenhum arquivo encontrado.')
    return
  }

  console.log(`Total de arquivos encontrados: ${allPaths.length}`)

  // Processar em lotes de 20
  for (let i = 0; i < allPaths.length; i += 20) {
    const batch = allPaths.slice(i, i + 20)

    console.log(`Apagando lote ${i + 1}–${i + batch.length}...`)

    const { error: deleteError } = await supabase
      .storage
      .from(BUCKET)
      .remove(batch)

    if (deleteError) {
      console.error('Erro ao deletar lote:', deleteError)
      break
    }

    // evitar bloqueio da API
    await sleep(1500)
  }

  console.log('Limpeza concluída!')
}

cleanBucket()