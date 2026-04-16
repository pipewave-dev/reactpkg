import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const rootDir = new URL("../../", import.meta.url);
const packagesDir = new URL("../../packages/", import.meta.url);
const internalPrefix = "@pipewave/";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function validateInternalRanges(pkg, sectionName, deps, errors) {
  if (!deps) return;

  for (const [name, range] of Object.entries(deps)) {
    if (!name.startsWith(internalPrefix)) continue;
    if (range !== "workspace:^") {
      errors.push(
        `${pkg.name} has ${sectionName}.${name}=${range}; expected workspace:^`,
      );
    }
  }
}

async function main() {
  const rootPackagePath = join(rootDir.pathname, "package.json");
  const rootPackage = await readJson(rootPackagePath);
  const packageDirs = await readdir(packagesDir, { withFileTypes: true });
  const errors = [];

  for (const entry of packageDirs) {
    if (!entry.isDirectory()) continue;

    const packagePath = join(packagesDir.pathname, entry.name, "package.json");
    const pkg = await readJson(packagePath);

    if (pkg.version !== rootPackage.version) {
      errors.push(
        `${pkg.name} has version ${pkg.version}; expected ${rootPackage.version}`,
      );
    }

    validateInternalRanges(pkg, "dependencies", pkg.dependencies, errors);
    validateInternalRanges(
      pkg,
      "optionalDependencies",
      pkg.optionalDependencies,
      errors,
    );
    validateInternalRanges(pkg, "peerDependencies", pkg.peerDependencies, errors);
    validateInternalRanges(
      pkg,
      "devDependencies",
      pkg.devDependencies,
      errors,
    );
  }

  if (errors.length > 0) {
    console.error("Workspace version check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Workspace versions are aligned at ${rootPackage.version} and internal ranges use workspace:^`,
  );
}

await main();
