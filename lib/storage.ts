import { Storage } from "@plasmohq/storage"
import aiNavConfig from "./default-ai-nav-config.json"

export interface SiteConfig {
  domain: string
  selector: string
  enabled: boolean
}

export interface AppConfig {
  configs: SiteConfig[]
}

const storage = new Storage({ area: "local" })

const CONFIG_KEY = "easy-copilot-configs"
const defaultConfigs = aiNavConfig.configs

// export const defaultConfigs: SiteConfig[] = [
//   {
//     domain: "chatgpt.com",
//     selector: "div[data-message-author-role='user']",
//     enabled: true
//   },
//   {
//     domain: "gemini.google.com",
//     selector: "user-query",
//     enabled: true
//   },
//   {
//     domain: "claude.ai",
//     selector: "[data-is-streaming] .font-user-message, div.font-user-message",
//     enabled: true
//   },
//   {
//     domain: "chat.deepseek.com",
//     selector: ".fbb737a4",
//     enabled: true
//   },
//   {
//     domain: "yuanbao.tencent.com",
//     selector: ".agent-chat__conv--human",
//     enabled: true
//   }
// ]

export async function getConfigs(): Promise<SiteConfig[]> {
  const stored = await storage.get<SiteConfig[]>(CONFIG_KEY)
  if (!stored || stored.length === 0) {
    await storage.set(CONFIG_KEY, defaultConfigs)
    return defaultConfigs
  }
  return stored
}

export async function saveConfigs(configs: SiteConfig[]): Promise<void> {
  await storage.set(CONFIG_KEY, configs)
}

export async function getConfigForDomain(
  domain: string
): Promise<SiteConfig | undefined> {
  const configs = await getConfigs()
  return configs.find((c) => domain.includes(c.domain) && c.enabled)
}

export async function upsertConfig(config: SiteConfig): Promise<void> {
  const configs = await getConfigs()
  const idx = configs.findIndex((c) => c.domain === config.domain)
  if (idx >= 0) {
    configs[idx] = config
  } else {
    configs.push(config)
  }
  await saveConfigs(configs)
}

export async function removeConfig(domain: string): Promise<void> {
  const configs = await getConfigs()
  await saveConfigs(configs.filter((c) => c.domain !== domain))
}

export function exportConfigs(configs: SiteConfig[]): string {
  return JSON.stringify({ configs }, null, 2)
}

export function importConfigs(json: string): SiteConfig[] {
  const parsed = JSON.parse(json)
  if (parsed.configs && Array.isArray(parsed.configs)) {
    return parsed.configs
  }
  throw new Error("无效的配置文件格式")
}
