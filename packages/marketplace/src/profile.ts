/**
 * DSH home and active profile directory resolution.
 * Mirrors @deepseek-ai/dsh-app-boot semantics without depending on it.
 */
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function dshHome(): string {
  return process.env.DSH_HOME || join(homedir(), ".dsh");
}
export function profileDir(profileName = "web"): string {
  if (profileName === "" || profileName.includes("/") || profileName.includes("\\") ||
      profileName === "." || profileName === ".." || profileName === "node_modules") {
    throw new Error(`invalid profile name '${profileName}'`);
  }
  return resolve(dshHome(), "profiles", profileName);
}
