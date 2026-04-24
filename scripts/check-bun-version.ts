import { semver } from "bun";

const pkg = await Bun.file("package.json").json();
const expected = pkg.packageManager?.split("@")[1];
if (!expected) throw new Error("packageManager not found");

if (!semver.satisfies(process.versions.bun, `^${expected}`)) {
  throw new Error(`Requires bun@^${expected}, using ${process.versions.bun}`);
}
