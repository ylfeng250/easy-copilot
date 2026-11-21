import { Storage } from "@plasmohq/storage"

import aiNavConfig from "./default-ai-nav-config.json"

export interface SiteConfig {
  domain: string
  selector: string
  /** 主选择器失效时依次尝试的备选选择器 */
  fallbacks?: string[]
  enabled: boolean
}

export interface AppConfig {
  configs: SiteConfig[]
}

const storage = new Storage({ area: "local" })

const CONFIG_KEY = "easy-copilot-configs"
const VERSION_KEY = "easy-copilot-config-version"

/** 默认配置版本：选择器规则变更时 +1，老数据会自动迁移 */
const CONFIG_VERSION: number = aiNavConfig.version ?? 1

function cloneConfigs(configs: SiteConfig[]): SiteConfig[] {
  return configs.map((c) => ({ ...c, fallbacks: c.fallbacks ? [...c.fallbacks] : [] }))
}

export const defaultConfigs: SiteConfig[] = cloneConfigs(aiNavConfig.configs)

/** 历史版本里用过的默认选择器：命中说明用户没改过，可以安全替换 */
const LEGACY_SELECTORS: Record<string, string[]> = {
  "chatgpt.com": ["div[data-message-author-role='user']"],
  "claude.ai": [
    "[data-is-streaming] .font-user-message, div.font-user-message",
    "div.font-user-message"
  ],
  "kimi.com": [".segment-user"],
  "doubao.com": ["div[data-message-id].justify-end"]
}

/** 统一主机名：去端口、去 www、转小写 */
export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "")
}

/** 主机名是否属于某站点（精确或子域匹配，避免 example-chatgpt.com 误命中） */
export function hostMatches(host: string, domain: string): boolean {
  const h = normalizeHost(host)
  const d = normalizeHost(domain)
  if (!d) return false
  return h === d || h.endsWith("." + d)
}

function migrateConfigs(stored: SiteConfig[]): SiteConfig[] {
  const byDomain = new Map(defaultConfigs.map((c) => [normalizeHost(c.domain), c]))

  const migrated = stored.map((cfg) => {
    const domain = normalizeHost(cfg.domain)
    const def = byDomain.get(domain)
    if (!def) return { ...cfg, domain }

    const legacy = LEGACY_SELECTORS[domain] || []
    const untouched = cfg.selector === def.selector || legacy.includes(cfg.selector)
    if (!untouched) {
      // 用户自定义过选择器，只补上域名规范化和缺失的 fallbacks
      return { ...cfg, domain, fallbacks: cfg.fallbacks ?? def.fallbacks ?? [] }
    }
    return {
      ...cfg,
      domain,
      selector: def.selector,
      fallbacks: def.fallbacks ?? []
    }
  })

  // 域名规范化后可能重复，保留第一个
  const seen = new Set<string>()
  return migrated.filter((c) => {
    if (seen.has(c.domain)) return false
    seen.add(c.domain)
    return true
  })
}

export async function getConfigs(): Promise<SiteConfig[]> {
  const stored = await storage.get<SiteConfig[]>(CONFIG_KEY)
  const version = (await storage.get<number>(VERSION_KEY)) ?? 1

  if (!stored || stored.length === 0) {
    const defaults = cloneConfigs(defaultConfigs)
    await storage.set(CONFIG_KEY, defaults)
    await storage.set(VERSION_KEY, CONFIG_VERSION)
    return defaults
  }

  if (version >= CONFIG_VERSION) return stored

  const migrated = migrateConfigs(stored)
  await storage.set(CONFIG_KEY, migrated)
  await storage.set(VERSION_KEY, CONFIG_VERSION)
  return migrated
}

export async function saveConfigs(configs: SiteConfig[]): Promise<void> {
  await storage.set(CONFIG_KEY, configs)
}

export async function getConfigForDomain(
  host: string
): Promise<SiteConfig | undefined> {
  const configs = await getConfigs()
  return configs
    .filter((c) => c.enabled && hostMatches(host, c.domain))
    .sort((a, b) => normalizeHost(b.domain).length - normalizeHost(a.domain).length)[0]
}

/** 依次尝试主选择器和备选选择器，返回第一个能匹配到元素的 */
export function resolveSelector(cfg: SiteConfig): string {
  const candidates = [cfg.selector, ...(cfg.fallbacks || [])]
  for (const sel of candidates) {
    try {
      if (document.querySelectorAll(sel).length > 0) return sel
    } catch {
      // 非法选择器忽略
    }
  }
  return cfg.selector
}

export async function upsertConfig(config: SiteConfig): Promise<void> {
  const configs = await getConfigs()
  const domain = normalizeHost(config.domain)
  const idx = configs.findIndex((c) => normalizeHost(c.domain) === domain)
  if (idx >= 0) {
    configs[idx] = { ...config, domain }
  } else {
    configs.push({ ...config, domain })
  }
  await saveConfigs(configs)
}

export async function removeConfig(domain: string): Promise<void> {
  const configs = await getConfigs()
  await saveConfigs(
    configs.filter((c) => normalizeHost(c.domain) !== normalizeHost(domain))
  )
}

export function exportConfigs(configs: SiteConfig[]): string {
  return JSON.stringify({ version: CONFIG_VERSION, configs }, null, 2)
}

export function importConfigs(json: string): SiteConfig[] {
  const parsed = JSON.parse(json)
  if (parsed.configs && Array.isArray(parsed.configs)) {
    return parsed.configs
  }
  throw new Error("无效的配置文件格式")
}
