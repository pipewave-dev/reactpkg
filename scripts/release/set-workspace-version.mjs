import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const rootDir = new URL("../../", import.meta.url);
const packagesDir = new URL("../../packages/", import.meta.url);
const internalPrefix = "@pipewave/";

function parseVersionArg() {
  const version = process.argv[2];

  if (!version) {
    console.error("Usage: pnpm version:set <semver>");
    process.exit(1);
  }

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
    console.error(`Invalid semver: ${version}`);
    process.exit(1);
  }

  return version;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function updateInternalRanges(deps) {
  if (!deps) return deps;

  return Object.fromEntries(
    Object.entries(deps).map(([name, range]) => {
      if (!name.startsWith(internalPrefix)) return [name, range];
      return [name, "workspace:^"];
    }),
  );
}

async function main() {
  const nextVersion = parseVersionArg();
  const rootPackagePath = join(rootDir.pathname, "package.json");
  const rootPackage = await readJson(rootPackagePath);
  rootPackage.version = nextVersion;
  await writeJson(rootPackagePath, rootPackage);

  const packageDirs = await readdir(packagesDir, { withFileTypes: true });

  for (const entry of packageDirs) {
    if (!entry.isDirectory()) continue;

    const packagePath = join(packagesDir.pathname, entry.name, "package.json");
    const pkg = await readJson(packagePath);
    pkg.version = nextVersion;
    pkg.dependencies = updateInternalRanges(pkg.dependencies);
    pkg.devDependencies = updateInternalRanges(pkg.devDependencies);
    pkg.peerDependencies = updateInternalRanges(pkg.peerDependencies);
    pkg.optionalDependencies = updateInternalRanges(pkg.optionalDependencies);
    await writeJson(packagePath, pkg);
  }

  console.log(`Updated workspace packages to version ${nextVersion}`);
  console.log("Next recommended steps:");
  console.log("- pnpm version:check");
  console.log("- pnpm typecheck");
  console.log("- pnpm build");
}

await main();
