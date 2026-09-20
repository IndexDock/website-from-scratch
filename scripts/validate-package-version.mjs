import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("package-lock.json", root), "utf8"));
const versions = {
  package: packageJson.version,
  lockfile: packageLock.version,
  lockfileRoot: packageLock.packages?.[""]?.version,
};
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const errors = [];

if (!semverPattern.test(versions.package ?? "")) errors.push("package.json version is not valid semantic versioning.");
if (versions.lockfile !== versions.package) errors.push("package-lock.json top-level version does not match package.json.");
if (versions.lockfileRoot !== versions.package) errors.push("package-lock.json root package version does not match package.json.");

if (errors.length) {
  console.error("Package version validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Package manifests agree on version ${versions.package}.`);
