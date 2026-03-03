import { useEffect, useRef, useState } from "react"

import {
  exportConfigs,
  getConfigs,
  importConfigs,
  removeConfig,
  saveConfigs,
  upsertConfig,
  type SiteConfig
} from "~lib/storage"
import { tokens } from "~theme/tokens"

const t = tokens

function IndexPopup() {
  const [configs, setConfigs] = useState<SiteConfig[]>([])
  const [currentDomain, setCurrentDomain] = useState("")
  const [editDomain, setEditDomain] = useState("")
  const [editSelector, setEditSelector] = useState("")
  const [editEnabled, setEditEnabled] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [testCount, setTestCount] = useState<number | null>(null)
  const [message, setMessage] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConfigs()
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url)
        setCurrentDomain(url.hostname)
      }
    })
  }, [])

  const loadConfigs = async () => {
    const c = await getConfigs()
    setConfigs(c)
  }

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 2000)
  }

  const startEdit = (config?: SiteConfig) => {
    if (config) {
      setEditDomain(config.domain)
      setEditSelector(config.selector)
      setEditEnabled(config.enabled)
    } else {
      setEditDomain(currentDomain)
      setEditSelector("")
      setEditEnabled(true)
    }
    setIsEditing(true)
    setTestCount(null)
  }

  const handleSave = async () => {
    if (!editDomain || !editSelector) {
      showMessage("域名和选择器不能为空", "error")
      return
    }
    await upsertConfig({
      domain: editDomain,
      selector: editSelector,
      enabled: editEnabled
    })
    await loadConfigs()
    setIsEditing(false)
    showMessage("保存成功", "success")

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "config-updated",
          selector: editSelector
        })
      }
    })
  }

  const handleTest = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "test-selector", selector: editSelector },
          (response) => {
            if (chrome.runtime.lastError) {
              showMessage("无法连接到页面，请刷新后重试", "error")
              return
            }
          }
        )
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: (selector: string) => {
              try {
                return document.querySelectorAll(selector).length
              } catch {
                return -1
              }
            },
            args: [editSelector]
          },
          (results) => {
            if (results?.[0]?.result !== undefined) {
              const count = results[0].result as number
              if (count === -1) {
                showMessage("选择器语法错误", "error")
              } else {
                setTestCount(count)
              }
            }
          }
        )
      }
    })
  }

  const handleDelete = async (domain: string) => {
    await removeConfig(domain)
    await loadConfigs()
    showMessage("已删除", "success")
  }

  const handleToggle = async (config: SiteConfig) => {
    await upsertConfig({ ...config, enabled: !config.enabled })
    await loadConfigs()
  }

  const handleExport = () => {
    const json = exportConfigs(configs)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "easy-copilot-config.json"
    a.click()
    URL.revokeObjectURL(url)
    showMessage("配置已导出", "success")
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const imported = importConfigs(text)
      await saveConfigs(imported)
      await loadConfigs()
      showMessage(`成功导入 ${imported.length} 条配置`, "success")
    } catch {
      showMessage("导入失败：文件格式无效", "error")
    }
    e.target.value = ""
  }
  console.log("configs", configs);
  console.log("currentDomain", currentDomain);

  const matchedConfig = configs.find(
    (c) => currentDomain.includes(c.domain) && c.enabled
  )

  const btnStyle = (
    variant: "primary" | "secondary" | "danger" = "secondary"
  ): React.CSSProperties => ({
    height: t.size.buttonHeight,
    padding: `0 ${t.spacing.lg}`,
    borderRadius: t.radius.md,
    border:
      variant === "primary"
        ? "none"
        : `1px solid ${variant === "danger" ? t.colors.error : t.colors.border}`,
    background:
      variant === "primary"
        ? t.colors.primary
        : variant === "danger"
          ? t.colors.errorBg
          : t.colors.bg,
    color:
      variant === "primary"
        ? t.colors.textInverse
        : variant === "danger"
          ? t.colors.error
          : t.colors.text,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.medium,
    cursor: "pointer",
    transition: `all ${t.transition.fast}`,
    display: "inline-flex",
    alignItems: "center",
    gap: t.spacing.xs
  })

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: t.size.inputHeight,
    padding: `0 ${t.spacing.md}`,
    border: `1px solid ${t.colors.border}`,
    borderRadius: t.radius.md,
    fontSize: t.fontSize.md,
    color: t.colors.text,
    background: t.colors.bg,
    outline: "none",
    boxSizing: "border-box"
  }

  return (
    <div
      style={{
        width: "380px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: t.colors.text,
        background: t.colors.bg
      }}>
      {/* 头部 */}
      <div
        style={{
          padding: `${t.spacing.lg} ${t.spacing.xl}`,
          borderBottom: `1px solid ${t.colors.border}`,
          background: t.colors.bgSecondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.spacing.sm
          }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={t.colors.primary}
            stroke="none">
            <path d="M3 3h18v4H3V3zm0 7h12v4H3v-4zm0 7h8v4H3v-4z" />
          </svg>
          <span
            style={{
              fontSize: t.fontSize.xl,
              fontWeight: t.fontWeight.bold,
              color: t.colors.text
            }}>
            Easy Copilot
          </span>
        </div>
        <span
          style={{
            fontSize: t.fontSize.xs,
            color: t.colors.textTertiary
          }}>
          v0.0.1
        </span>
      </div>

      {/* 当前域名状态 */}
      <div
        style={{
          padding: `${t.spacing.md} ${t.spacing.xl}`,
          borderBottom: `1px solid ${t.colors.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.spacing.sm
          }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: t.radius.full,
              background: matchedConfig
                ? t.colors.success
                : t.colors.textTertiary
            }}
          />
          <span
            style={{
              fontSize: t.fontSize.md,
              color: t.colors.textSecondary,
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
            {currentDomain || "未知域名"}
          </span>
        </div>
        <span
          style={{
            fontSize: t.fontSize.xs,
            color: matchedConfig ? t.colors.success : t.colors.textTertiary
          }}>
          {matchedConfig ? "已匹配" : "未匹配"}
        </span>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          style={{
            margin: `${t.spacing.md} ${t.spacing.xl} 0`,
            padding: `${t.spacing.sm} ${t.spacing.md}`,
            borderRadius: t.radius.md,
            background:
              message.type === "success"
                ? t.colors.successBg
                : t.colors.errorBg,
            color:
              message.type === "success" ? t.colors.success : t.colors.error,
            fontSize: t.fontSize.sm
          }}>
          {message.text}
        </div>
      )}

      {/* 编辑面板 */}
      {isEditing ? (
        <div style={{ padding: t.spacing.xl }}>
          <div style={{ marginBottom: t.spacing.md }}>
            <label
              style={{
                fontSize: t.fontSize.sm,
                color: t.colors.textSecondary,
                marginBottom: t.spacing.xs,
                display: "block"
              }}>
              域名
            </label>
            <input
              style={inputStyle}
              value={editDomain}
              onChange={(e) => setEditDomain(e.target.value)}
              placeholder="例如：chatgpt.com"
            />
          </div>
          <div style={{ marginBottom: t.spacing.md }}>
            <label
              style={{
                fontSize: t.fontSize.sm,
                color: t.colors.textSecondary,
                marginBottom: t.spacing.xs,
                display: "block"
              }}>
              CSS 选择器
            </label>
            <input
              style={inputStyle}
              value={editSelector}
              onChange={(e) => setEditSelector(e.target.value)}
              placeholder="例如：div[data-role='user']"
            />
            {testCount !== null && (
              <div
                style={{
                  marginTop: t.spacing.xs,
                  fontSize: t.fontSize.xs,
                  color:
                    testCount > 0 ? t.colors.success : t.colors.warning
                }}>
                找到 {testCount} 个匹配元素
              </div>
            )}
          </div>
          <div
            style={{
              marginBottom: t.spacing.lg,
              display: "flex",
              alignItems: "center",
              gap: t.spacing.sm
            }}>
            <input
              type="checkbox"
              checked={editEnabled}
              onChange={(e) => setEditEnabled(e.target.checked)}
              style={{ accentColor: t.colors.primary }}
            />
            <span
              style={{
                fontSize: t.fontSize.sm,
                color: t.colors.textSecondary
              }}>
              启用此规则
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: t.spacing.sm
            }}>
            <button style={btnStyle("primary")} onClick={handleSave}>
              保存
            </button>
            <button style={btnStyle("secondary")} onClick={handleTest}>
              测试选择器
            </button>
            <button
              style={btnStyle("secondary")}
              onClick={() => setIsEditing(false)}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 配置列表 */}
          <div
            style={{
              maxHeight: "280px",
              overflowY: "auto"
            }}>
            {configs.map((cfg) => (
              <div
                key={cfg.domain}
                style={{
                  padding: `${t.spacing.md} ${t.spacing.xl}`,
                  borderBottom: `1px solid ${t.colors.borderLight}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: t.spacing.sm,
                    flex: 1,
                    minWidth: 0
                  }}>
                  <div
                    onClick={() => handleToggle(cfg)}
                    style={{
                      width: "32px",
                      height: "18px",
                      borderRadius: t.radius.full,
                      background: cfg.enabled
                        ? t.colors.primary
                        : t.colors.bgActive,
                      position: "relative",
                      cursor: "pointer",
                      transition: `background ${t.transition.fast}`,
                      flexShrink: 0
                    }}>
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: t.radius.full,
                        background: t.colors.bg,
                        position: "absolute",
                        top: "2px",
                        left: cfg.enabled ? "16px" : "2px",
                        transition: `left ${t.transition.fast}`,
                        boxShadow: `0 1px 2px ${t.colors.shadow}`
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: t.fontSize.md,
                        fontWeight: t.fontWeight.medium,
                        color: cfg.enabled
                          ? t.colors.text
                          : t.colors.textTertiary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                      {cfg.domain}
                    </div>
                    <div
                      style={{
                        fontSize: t.fontSize.xs,
                        color: t.colors.textTertiary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                      {cfg.selector}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: t.spacing.xs,
                    flexShrink: 0,
                    marginLeft: t.spacing.sm
                  }}>
                  <div
                    onClick={() => startEdit(cfg)}
                    style={{
                      padding: t.spacing.xs,
                      cursor: "pointer",
                      color: t.colors.textTertiary,
                      borderRadius: t.radius.sm
                    }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <div
                    onClick={() => handleDelete(cfg.domain)}
                    style={{
                      padding: t.spacing.xs,
                      cursor: "pointer",
                      color: t.colors.textTertiary,
                      borderRadius: t.radius.sm
                    }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 底部操作 */}
          <div
            style={{
              padding: t.spacing.xl,
              borderTop: `1px solid ${t.colors.border}`,
              display: "flex",
              gap: t.spacing.sm,
              flexWrap: "wrap"
            }}>
            <button style={btnStyle("primary")} onClick={() => startEdit()}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加规则
            </button>
            <button style={btnStyle("secondary")} onClick={handleExport}>
              导出
            </button>
            <button style={btnStyle("secondary")} onClick={handleImport}>
              导入
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default IndexPopup
