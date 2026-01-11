// 🔬 DIAGNÓSTICO COMPLETO DA CÂMERA - Natan General Service
// Cole este código no console do navegador (F12 → Console)

console.log("🔬 Iniciando diagnóstico completo da câmera...");
console.log("📍 URL atual:", location.href);
console.log("🔒 Protocolo:", location.protocol);

async function diagnosticoCompleto() {
  const resultados = {
    ambiente: {},
    suporte: {},
    permissoes: {},
    camera: {},
    solucoes: [],
  };

  // 1. Verificar ambiente
  console.log("\n1️⃣ VERIFICANDO AMBIENTE...");
  resultados.ambiente.isHTTPS = location.protocol === "https:";
  resultados.ambiente.isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  resultados.ambiente.url = location.href;

  console.log("✅ HTTPS:", resultados.ambiente.isHTTPS ? "SIM" : "NÃO");
  console.log("✅ Localhost:", resultados.ambiente.isLocalhost ? "SIM" : "NÃO");

  if (!resultados.ambiente.isHTTPS && !resultados.ambiente.isLocalhost) {
    console.log("❌ PROBLEMA: HTTP em domínio externo não permite câmera");
    resultados.solucoes.push("Use HTTPS ou localhost");
  }

  // 2. Verificar suporte às APIs
  console.log("\n2️⃣ VERIFICANDO SUPORTE ÀS APIS...");
  resultados.suporte.mediaDevices = !!navigator.mediaDevices;
  resultados.suporte.getUserMedia = !!(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  );
  resultados.suporte.enumerateDevices = !!(
    navigator.mediaDevices && navigator.mediaDevices.enumerateDevices
  );

  console.log(
    "✅ navigator.mediaDevices:",
    resultados.suporte.mediaDevices ? "SIM" : "NÃO"
  );
  console.log(
    "✅ getUserMedia:",
    resultados.suporte.getUserMedia ? "SIM" : "NÃO"
  );
  console.log(
    "✅ enumerateDevices:",
    resultados.suporte.enumerateDevices ? "SIM" : "NÃO"
  );

  if (!resultados.suporte.getUserMedia) {
    console.log("❌ PROBLEMA: getUserMedia não disponível");
    resultados.solucoes.push("Atualize seu navegador ou use HTTPS");
    return resultados;
  }

  // 3. Verificar permissões
  console.log("\n3️⃣ VERIFICANDO PERMISSÕES...");
  try {
    if ("permissions" in navigator) {
      const permission = await navigator.permissions.query({ name: "camera" });
      resultados.permissoes.estado = permission.state;
      console.log("✅ Permissão da câmera:", permission.state);

      if (permission.state === "denied") {
        console.log("❌ PROBLEMA: Permissão negada");
        resultados.solucoes.push(
          "Clique no cadeado na barra de endereços e permita câmera"
        );
      }
    } else {
      console.log("⚠️ API de permissões não disponível");
      resultados.permissoes.estado = "desconhecido";
    }
  } catch (error) {
    console.log("⚠️ Erro ao verificar permissões:", error.message);
    resultados.permissoes.erro = error.message;
  }

  // 4. Listar dispositivos de câmera
  console.log("\n4️⃣ LISTANDO CÂMERAS...");
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    resultados.camera.quantidade = cameras.length;
    resultados.camera.dispositivos = cameras.map((cam) => ({
      id: cam.deviceId,
      label: cam.label || "Dispositivo sem nome",
    }));

    console.log("✅ Câmeras encontradas:", cameras.length);
    cameras.forEach((cam, index) => {
      console.log(`   Câmera ${index + 1}: ${cam.label || "Dispositivo"}`);
    });

    if (cameras.length === 0) {
      console.log("❌ PROBLEMA: Nenhuma câmera encontrada");
      resultados.solucoes.push("Conecte uma câmera ao dispositivo");
    }
  } catch (error) {
    console.log("❌ Erro ao listar dispositivos:", error.message);
    resultados.camera.erro = error.message;
  }

  // 5. Teste real da câmera
  console.log("\n5️⃣ TESTANDO ACESSO À CÂMERA...");
  try {
    console.log("📹 Solicitando acesso à câmera...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
    });

    resultados.camera.funcionando = true;
    resultados.camera.resolucao = {
      width: stream.getVideoTracks()[0].getSettings().width,
      height: stream.getVideoTracks()[0].getSettings().height,
    };

    console.log("🎉 SUCESSO! Câmera funcionando perfeitamente!");
    console.log(
      "✅ Resolução:",
      resultados.camera.resolucao.width +
        "x" +
        resultados.camera.resolucao.height
    );

    // Parar stream
    stream.getTracks().forEach((track) => track.stop());
    console.log("✅ Stream parada");
  } catch (error) {
    resultados.camera.funcionando = false;
    resultados.camera.erro = {
      nome: error.name,
      mensagem: error.message,
    };

    console.log("❌ ERRO ao acessar câmera:", error.name);
    console.log("📝 Mensagem:", error.message);

    // Soluções específicas por tipo de erro
    switch (error.name) {
      case "NotAllowedError":
        resultados.solucoes.push("Permita o acesso à câmera quando solicitado");
        resultados.solucoes.push(
          "Verifique configurações do site (cadeado na barra)"
        );
        break;
      case "NotFoundError":
        resultados.solucoes.push("Conecte uma câmera ao dispositivo");
        resultados.solucoes.push(
          "Verifique se a câmera está funcionando em outros apps"
        );
        break;
      case "NotReadableError":
        resultados.solucoes.push(
          "Feche outros apps que podem estar usando a câmera"
        );
        resultados.solucoes.push("Reinicie o navegador");
        break;
      case "OverconstrainedError":
        resultados.solucoes.push(
          "A câmera não suporta as configurações solicitadas"
        );
        break;
      default:
        resultados.solucoes.push("Verifique configurações do navegador");
        resultados.solucoes.push("Tente recarregar a página");
    }
  }

  // 6. Resumo final
  console.log("\n📊 RESUMO DO DIAGNÓSTICO:");
  console.log("===============================");

  if (resultados.camera.funcionando) {
    console.log("✅ RESULTADO: Câmera funcionando! ✅");
    console.log("🎯 A funcionalidade deve funcionar na aplicação Natan General Service");
  } else {
    console.log("❌ RESULTADO: Problema com a câmera ❌");
    console.log("🔧 SOLUÇÕES SUGERIDAS:");
    resultados.solucoes.forEach((solucao, index) => {
      console.log(`   ${index + 1}. ${solucao}`);
    });
  }

  console.log("\n📋 DADOS COMPLETOS:", resultados);

  return resultados;
}

// Executar diagnóstico
diagnosticoCompleto()
  .then((resultado) => {
    console.log("\n🏁 Diagnóstico concluído!");
    console.log(
      "💡 Se a câmera funcionar aqui mas não na aplicação, pode ser um problema específico do código Angular."
    );
  })
  .catch((error) => {
    console.log("❌ Erro durante diagnóstico:", error);
  });

// Função auxiliar para teste rápido
window.testeRapidoCamera = async function () {
  try {
    console.log("🚀 Teste rápido da câmera...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("✅ Câmera OK!");
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.log("❌ Erro:", error.name, error.message);
    return false;
  }
};

console.log("\n💡 Para um teste rápido, digite: testeRapidoCamera()");
