/* eslint-disable no-console */

const fs = require("node:fs");
const path = require("node:path");

function main() {
  const repoRoot = process.cwd();
  const packageJsonPath = path.join(repoRoot, "package.json");
  const versionTsPath = path.join(repoRoot, "src", "version.ts");

  const pkgRaw = fs.readFileSync(packageJsonPath, "utf8");
  const pkg = JSON.parse(pkgRaw);

  const version = String(pkg.version || "0.0.0");

  const content =
    "// Arquivo gerado automaticamente a partir do package.json\n" +
    "// Não edite manualmente. Use `npm version patch|minor|major`.\n" +
    `export const APP_VERSION = "${version}";\n`;

  fs.writeFileSync(versionTsPath, content, "utf8");
  console.log(`[sync-version] Atualizado src/version.ts => ${version}`);
}

main();
