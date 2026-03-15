// Hook installer — registers CCD hook scripts in ~/.claude/settings.json

import { existsSync, readFileSync, writeFileSync, copyFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths, config, ensureCcdDir } from './config.js';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface HookCommand {
  type: string;
  command: string;
  timeout: number;
}

interface HookEntry {
  matcher?: string;
  hooks: HookCommand[];
}

interface Settings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

// --- Hook script definitions ---

const HOOK_SCRIPTS = [
  { name: 'stop.sh', target: 'stop.sh' },
  { name: 'notification.sh', target: 'notification.sh' },
  { name: 'session-start.sh', target: 'session-start.sh' },
  { name: 'pretooluse.sh', target: 'pretooluse.sh' },
  { name: 'permission.sh', target: 'permission.sh' },
] as const;

const HOOK_ENTRIES: Array<{ event: string; script: string; timeout: number; matcher?: string }> = [
  { event: 'Stop', script: 'stop.sh', timeout: 10 },
  { event: 'Notification', script: 'notification.sh', timeout: 5 },
  { event: 'SessionStart', script: 'session-start.sh', timeout: 5 },
  { event: 'PreToolUse', script: 'pretooluse.sh', timeout: 5, matcher: 'AskUserQuestion' },
  { event: 'PermissionRequest', script: 'permission.sh', timeout: 5 },
];

// --- Helpers ---

function readSettings(): Settings {
  if (!existsSync(paths.claudeSettings)) return {};
  try {
    return JSON.parse(readFileSync(paths.claudeSettings, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(settings: Settings): void {
  const dir = dirname(paths.claudeSettings);
  if (!existsSync(dir)) {
    throw new Error(`Claude config directory not found: ${dir}`);
  }
  writeFileSync(paths.claudeSettings, JSON.stringify(settings, null, 2));
}

function isCcdHook(entry: HookEntry): boolean {
  return entry.hooks?.some(
    (h) => typeof h.command === 'string' && h.command.includes(config.hookMarker),
  ) ?? false;
}

// --- Public API ---

/** Check if CCD hooks are already installed */
export function isInstalled(): boolean {
  try {
    const settings = readSettings();
    if (!settings.hooks) return false;
    return HOOK_ENTRIES.every((def) => {
      const entries = settings.hooks?.[def.event] ?? [];
      return entries.some(isCcdHook);
    });
  } catch {
    return false;
  }
}

/** Copy hook scripts to ~/.ccd/hooks/ */
function copyHookScripts(): void {
  ensureCcdDir();

  // Copy common library
  const libSource = join(__dirname, 'hooks', 'lib', 'common.sh');
  const libTarget = join(paths.hooksLibDir, 'common.sh');
  copyFileSync(libSource, libTarget);
  chmodSync(libTarget, 0o755);

  // Copy individual hook scripts
  for (const script of HOOK_SCRIPTS) {
    const source = join(__dirname, 'hooks', script.name);
    const target = join(paths.hooksDir, script.target);
    copyFileSync(source, target);
    chmodSync(target, 0o755);
  }

  logger.info('Hook scripts copied to ~/.ccd/hooks/');
}

/** Install CCD hooks into ~/.claude/settings.json */
export function install(): void {
  // First uninstall any existing CCD hooks
  uninstall();

  // Copy scripts
  copyHookScripts();

  // Update settings.json
  const settings = readSettings();
  if (!settings.hooks) settings.hooks = {};

  for (const def of HOOK_ENTRIES) {
    const existing = settings.hooks[def.event] ?? [];
    const entry: HookEntry = {
      hooks: [{
        type: 'command',
        command: join(paths.hooksDir, def.script),
        timeout: def.timeout,
      }],
    };
    if (def.matcher) {
      entry.matcher = def.matcher;
    }
    settings.hooks[def.event] = [...existing, entry];
  }

  writeSettings(settings);
  logger.info('CCD hooks installed in ~/.claude/settings.json');
}

/** Remove CCD hooks from ~/.claude/settings.json */
export function uninstall(): void {
  const settings = readSettings();
  if (!settings.hooks) return;

  for (const eventType of Object.keys(settings.hooks)) {
    const entries = settings.hooks[eventType];
    if (!Array.isArray(entries)) continue;

    const filtered = entries.filter((entry) => !isCcdHook(entry));
    if (filtered.length === 0) {
      delete settings.hooks[eventType];
    } else {
      settings.hooks[eventType] = filtered;
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeSettings(settings);
  logger.info('CCD hooks removed from settings.json');
}
