// 🧪 TESTE RÁPIDO: Verificar Bucket Avatars
// Cole este código no console do navegador em https://localhost:4200

console.log("🧪 Testando configuração do bucket avatars...");

async function testarBucketAvatars() {
  try {
    // Criar um arquivo de teste pequeno
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");

    // Desenhar algo simples
    ctx.fillStyle = "#4299e1";
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Test", 30, 60);

    // Converter para blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.8);
    });

    const testFile = new File([blob], "test-avatar.jpg", {
      type: "image/jpeg",
    });

    console.log(
      "📁 Arquivo de teste criado:",
      testFile.name,
      testFile.size + " bytes"
    );

    // Configurar cliente Supabase (simular)
    const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
    const supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

    // Teste 1: Verificar se bucket existe
    console.log("🔍 1. Verificando se bucket existe...");
    const bucketsResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
    });

    if (bucketsResponse.ok) {
      const buckets = await bucketsResponse.json();
      const avatarsBucket = buckets.find((b) => b.name === "avatars");

      if (avatarsBucket) {
        console.log('✅ Bucket "avatars" encontrado!', avatarsBucket);
      } else {
        console.log('❌ Bucket "avatars" não encontrado');
        console.log(
          "📋 Buckets disponíveis:",
          buckets.map((b) => b.name)
        );
        return;
      }
    } else {
      console.log("❌ Erro ao listar buckets:", bucketsResponse.status);
      return;
    }

    // Teste 2: Tentar upload
    console.log("📤 2. Testando upload...");
    const formData = new FormData();
    formData.append("", testFile);

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/avatars/test-${Date.now()}.jpg`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: formData,
      }
    );

    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log("🎉 Upload realizado com sucesso!", uploadResult);

      // Teste 3: Verificar URL pública
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${uploadResult.Key}`;
      console.log("🔗 URL pública gerada:", publicUrl);

      // Testar se a URL é acessível
      const imgTest = new Image();
      imgTest.onload = () => {
        console.log("✅ Imagem acessível publicamente!");
        console.log("🎯 RESULTADO: Bucket configurado corretamente!");
      };
      imgTest.onerror = () => {
        console.log(
          "❌ Erro: Imagem não acessível. Verificar configuração de bucket público."
        );
      };
      imgTest.src = publicUrl;
    } else {
      const error = await uploadResponse.text();
      console.log("❌ Erro no upload:", uploadResponse.status, error);

      if (uploadResponse.status === 400) {
        console.log(
          "💡 Possível causa: Bucket existe mas não está público ou há problema de permissões"
        );
      } else if (uploadResponse.status === 404) {
        console.log("💡 Possível causa: Bucket não existe ou nome incorreto");
      }
    }
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

// Executar teste
testarBucketAvatars();
