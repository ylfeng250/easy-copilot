import cssText from "data-text:./content-style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useCallback, useEffect, useRef, useState } from "react"

import { getConfigForDomain } from "~lib/storage"
import { tokens } from "~theme/tokens"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

interface NavItem {
  id: string
  text: string
  element: Element
  index: number
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as unknown as T
}

function extractText(el: Element, maxLen = 80): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll("pre, code, svg, img").forEach((n) => n.remove())
  const raw = (clone.textContent || "").replace(/\s+/g, " ").trim()
  return raw.length > maxLen ? raw.slice(0, maxLen) + "…" : raw
}

function Sidebar() {
  const [items, setItems] = useState<NavItem[]>([])
  const [visible, setVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectorReady, setSelectorReady] = useState(false)
  const selectorRef = useRef("")
  const observerRef = useRef<MutationObserver | null>(null)
  const t = tokens

  const scanDOM = useCallback(() => {
    if (!selectorRef.current) return
    try {
      const elements = document.querySelectorAll(selectorRef.current)
      const newItems: NavItem[] = []
      elements.forEach((el, i) => {
        const text = extractText(el)
        if (text) {
          newItems.push({
            id: `ec-nav-${i}`,
            text,
            element: el,
            index: i
          })
        }
      })
      setItems(newItems)
    } catch {
      // 选择器无效时忽略
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const domain = window.location.hostname
      const cfg = await getConfigForDomain(domain)
      if (cfg) {
        selectorRef.current = cfg.selector
        setSelectorReady(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectorReady) return
    const debouncedScan = debounce(scanDOM, 300)
    scanDOM()

    observerRef.current = new MutationObserver(debouncedScan)
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => observerRef.current?.disconnect()
  }, [selectorReady, scanDOM])

  // 监听来自 popup 的消息
  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.type === "config-updated") {
        selectorRef.current = msg.selector
        setSelectorReady(true)
        scanDOM()
      }
      if (msg.type === "test-selector") {
        selectorRef.current = msg.selector
        scanDOM()
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [scanDOM])

  const scrollTo = (item: NavItem) => {
    setActiveId(item.id)
    item.element.scrollIntoView({ behavior: "smooth", block: "center" })
    const el = item.element as HTMLElement
    el.style.transition = `box-shadow ${t.transition.normal}`
    el.style.boxShadow = `0 0 0 3px ${t.colors.highlightBorder}`
    setTimeout(() => {
      el.style.boxShadow = "none"
    }, 1500)
  }

  const filtered = items.filter((item) =>
    item.text.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectorReady) return null

  return (
    <>
      {/* 触发按钮 */}
      <div
        className="ec-trigger"
        onClick={() => setVisible(!visible)}
        style={{
          position: "fixed",
          right: visible ? t.size.sidebarWidth : "0",
          top: "50%",
          transform: "translateY(-50%)",
          width: t.size.triggerSize,
          height: t.size.triggerSize,
          background: t.colors.primary,
          borderRadius: `${t.radius.md} 0 0 ${t.radius.md}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: t.zIndex.trigger,
          boxShadow: `0 2px 8px ${t.colors.shadow}`,
          transition: `right ${t.transition.slow}`
        }}>
        <svg
          width={t.size.iconLg}
          height={t.size.iconLg}
          viewBox="0 0 24 24"
          fill="none"
          stroke={t.colors.textInverse}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="9" y2="18" />
        </svg>
      </div>

      {/* 侧边栏 */}
      <div
        className="ec-sidebar"
        style={{
          position: "fixed",
          top: "0",
          right: visible ? "0" : `-${t.size.sidebarWidth}`,
          width: t.size.sidebarWidth,
          height: "100vh",
          background: t.colors.bg,
          borderLeft: `1px solid ${t.colors.border}`,
          boxShadow: `-4px 0 24px ${t.colors.shadow}`,
          zIndex: t.zIndex.sidebar,
          display: "flex",
          flexDirection: "column",
          transition: `right ${t.transition.slow}`,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
        {/* 头部 */}
        <div
          style={{
            padding: `${t.spacing.lg} ${t.spacing.xl}`,
            borderBottom: `1px solid ${t.colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: t.colors.bgSecondary,
            flexShrink: 0
          }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: t.spacing.sm
            }}>
            <svg
              width={t.size.iconMd}
              height={t.size.iconMd}
              viewBox="0 0 24 24"
              fill={t.colors.primary}
              stroke="none">
              <path d="M3 3h18v4H3V3zm0 7h12v4H3v-4zm0 7h8v4H3v-4z" />
            </svg>
            <span
              style={{
                fontSize: t.fontSize.lg,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.text
              }}>
              提问导航
            </span>
          </div>
          <span
            style={{
              fontSize: t.fontSize.xs,
              color: t.colors.textTertiary,
              background: t.colors.bgTertiary,
              padding: `2px ${t.spacing.sm}`,
              borderRadius: t.radius.full
            }}>
            {items.length} 条
          </span>
        </div>

        {/* 搜索框 */}
        <div
          style={{
            padding: `${t.spacing.md} ${t.spacing.xl}`,
            borderBottom: `1px solid ${t.colors.borderLight}`,
            flexShrink: 0
          }}>
          <div
            style={{
              position: "relative"
            }}>
            <svg
              width={t.size.iconSm}
              height={t.size.iconSm}
              viewBox="0 0 24 24"
              fill="none"
              stroke={t.colors.textTertiary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: t.spacing.md,
                top: "50%",
                transform: "translateY(-50%)"
              }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索提问..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: t.size.inputHeight,
                padding: `0 ${t.spacing.md} 0 ${t.spacing.xxxl}`,
                border: `1px solid ${t.colors.border}`,
                borderRadius: t.radius.md,
                fontSize: t.fontSize.md,
                color: t.colors.text,
                background: t.colors.bg,
                outline: "none",
                boxSizing: "border-box",
                transition: `border-color ${t.transition.fast}`
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = t.colors.borderFocus
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = t.colors.border
              }}
            />
          </div>
        </div>

        {/* 导航列表 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: `${t.spacing.sm} 0`
          }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: `${t.spacing.xxxl} ${t.spacing.xl}`,
                textAlign: "center",
                color: t.colors.textTertiary,
                fontSize: t.fontSize.md
              }}>
              {items.length === 0
                ? "暂未检测到提问内容"
                : "没有匹配的提问"}
            </div>
          ) : (
            filtered.map((item, i) => (
              <div
                key={item.id}
                onClick={() => scrollTo(item)}
                style={{
                  padding: `${t.spacing.md} ${t.spacing.xl}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: t.spacing.md,
                  borderLeft:
                    activeId === item.id
                      ? `3px solid ${t.colors.primary}`
                      : "3px solid transparent",
                  background:
                    activeId === item.id
                      ? t.colors.primaryLight
                      : "transparent",
                  transition: `all ${t.transition.fast}`
                }}
                onMouseEnter={(e) => {
                  if (activeId !== item.id) {
                    e.currentTarget.style.background = t.colors.bgHover
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    activeId === item.id
                      ? t.colors.primaryLight
                      : "transparent"
                }}>
                <span
                  style={{
                    fontSize: t.fontSize.xs,
                    color: t.colors.textTertiary,
                    fontWeight: t.fontWeight.medium,
                    flexShrink: 0,
                    lineHeight: t.lineHeight.normal,
                    width: "20px",
                    textAlign: "right"
                  }}>
                  {item.index + 1}
                </span>
                <span
                  style={{
                    fontSize: t.fontSize.md,
                    color:
                      activeId === item.id
                        ? t.colors.primary
                        : t.colors.text,
                    lineHeight: t.lineHeight.normal,
                    wordBreak: "break-word"
                  }}>
                  {item.text}
                </span>
              </div>
            ))
          )}
        </div>

        {/* 底部 */}
        <div
          style={{
            padding: `${t.spacing.md} ${t.spacing.xl}`,
            borderTop: `1px solid ${t.colors.border}`,
            background: t.colors.bgSecondary,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <span
            style={{
              fontSize: t.fontSize.xs,
              color: t.colors.textTertiary
            }}>
            Easy Copilot
          </span>
          <div
            onClick={scanDOM}
            style={{
              fontSize: t.fontSize.xs,
              color: t.colors.primary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            刷新
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
