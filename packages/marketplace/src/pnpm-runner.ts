/**
 * pnpm runner: spawns pnpm inside the active profile directory.
 * Windows uses pnpm.cmd via shell; output tail is captured for error surfacing.
 */
import { spawn } from "node:child_process";

export interface PnpmResult {
  ok: boolean;
  exitCode: number | null;
  outputTail: string;
}

export function runPnpm(profileDir: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<PnpmResult> {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    let out = "";
    let settled = false;
    const settle = (r: PnpmResult) => { if (!settled) { settled = true; resolve(r); } };
    let child;
    try {
      child = spawn(cmd, args, { cwd: profileDir, shell: process.platform === "win32", windowsHide: true });
    } catch (e) {
      settle({ ok: false, exitCode: null, outputTail: String(e) });
      return;
    }
    child.stdout?.on("data", (d: Buffer) => { out = (out + d.toString()).slice(-16000); });
    child.stderr?.on("data", (d: Buffer) => { out = (out + d.toString()).slice(-16000); });
    const timer = setTimeout(() => { try { child.kill(); } catch { /* already gone */ } }, opts.timeoutMs ?? 120000);
    child.on("close", (code) => { clearTimeout(timer); settle({ ok: code === 0, exitCode: code, outputTail: out.slice(-2000) }); });
    child.on("error", (e) => { clearTimeout(timer); settle({ ok: false, exitCode: null, outputTail: String(e) }); });
  });
}
