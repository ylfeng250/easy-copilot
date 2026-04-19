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

function extractText(el: Element, maxLen = 200): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll("pre, code, svg, img").forEach((n) => n.remove())
  const raw = (clone.textContent || "").replace(/\s+/g, " ").trim()
  return raw.length > maxLen ? raw.slice(0, maxLen) + "…" : raw
}

function Sidebar() {
  const [items, setItems] = useState<NavItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number>(0)
  const [selectorReady, setSelectorReady] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [cardPos, setCardPos] = useState<number>(0)
  const selectorRef = useRef("")
  const observerRef = useRef<MutationObserver | null>(null)
  const cardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
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
    el.style.boxShadow = `0 0 0 2px ${t.colors.success}`
    setTimeout(() => {
      el.style.boxShadow = "none"
    }, 1500)
  }

  const handleMouseEnter = (item: NavItem, index: number) => {
    if (cardTimeoutRef.current) {
      clearTimeout(cardTimeoutRef.current)
    }
    setHoveredId(item.id)
    setHoveredIndex(index)

    // 计算卡片位置
    const el = itemRefs.current.get(item.id)
    if (el) {
      const rect = el.getBoundingClientRect()
      setCardPos(rect.top + rect.height / 2)
    }

    cardTimeoutRef.current = setTimeout(() => {
      setShowCard(true)
    }, 100)
  }

  const handleMouseLeave = () => {
    if (cardTimeoutRef.current) {
      clearTimeout(cardTimeoutRef.current)
    }
    setShowCard(false)
    cardTimeoutRef.current = setTimeout(() => {
      setHoveredId(null)
    }, 100)
  }

  const hoveredItem = hoveredId ? items.find((i) => i.id === hoveredId) : null

  if (!selectorReady) return null

  return (
    <>
      {/* 简洁的时间线指示器 - 只有线条，无背景 */}
      <div
        className="ec-timeline"
        style={{
          position: "fixed",
          top: "50%",
          right: "12px",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "20px",
          zIndex: t.zIndex.sidebar,
          padding: "8px 0"
        }}>
        {items.map((item) => {
          const isActive = activeId === item.id
          const isHovered = hoveredId === item.id
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el)
              }}
              onClick={() => scrollTo(item)}
              onMouseEnter={() => handleMouseEnter(item, item.index)}
              onMouseLeave={handleMouseLeave}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                cursor: "pointer",
                padding: "4px 0",
                transition: `all ${t.transition.fast}`
              }}>
              {/* 水平指示线 - 主题色+绿色系，适配亮暗色 */}
              <div
                style={{
                  width: isActive ? "28px" : isHovered ? "24px" : "20px",
                  height: isActive ? "6px" : "4px",
                  borderRadius: "3px",
                  background: isActive
                    ? "#22c55e" // 绿色-活跃项
                    : isHovered
                      ? "#4ade80" // 浅绿-悬停
                      : "rgba(148, 163, 184, 0.5)", // 灰色半透明-默认
                  boxShadow: isActive
                    ? "0 0 8px rgba(34, 197, 94, 0.6)"
                    : isHovered
                      ? "0 0 6px rgba(74, 222, 128, 0.4)"
                      : "none",
                  transition: `all ${t.transition.fast}`
                }}
              />
            </div>
          )
        })}
      </div>

      {/* 悬停详情卡片 */}
      {hoveredItem && showCard && (
        <div
          className="ec-hover-card"
          onMouseEnter={() => {
            if (cardTimeoutRef.current) {
              clearTimeout(cardTimeoutRef.current)
            }
            setShowCard(true)
          }}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "fixed",
            right: "44px",
            top: Math.max(60, Math.min(cardPos - 40, window.innerHeight - 150)),
            minWidth: "260px",
            maxWidth: "360px",
            padding: "14px 18px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "10px",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            zIndex: t.zIndex.tooltip,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            animation: `ec-card-fade-in 0.15s ease`,
            pointerEvents: "auto",
            backdropFilter: "blur(8px)"
          }}>
          {/* 卡片内容 */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px"
            }}>
            {/* 左侧指示线 */}
            <div
              style={{
                width: "4px",
                height: "40px",
                borderRadius: "2px",
                background:
                  activeId === hoveredItem.id ? "#22c55e" : "#94a3b8",
                flexShrink: 0,
                marginTop: "2px"
              }}
            />

            {/* 文本内容 */}
            <div
              style={{
                fontSize: "13px",
                lineHeight: "1.5",
                color: "#334155",
                wordBreak: "break-word",
                fontWeight: 400
              }}>
              {hoveredItem.text}
            </div>
          </div>

          {/* 箭头指示 */}
          <div
            style={{
              position: "absolute",
              right: "-6px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "0",
              height: "0",
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: "6px solid rgba(255, 255, 255, 0.95)"
            }}
          />
        </div>
      )}

      {/* 全局动画样式 */}
      <style>{`
        @keyframes ec-card-fade-in {
          from {
            opacity: 0;
            transform: translateX(6px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}

export default Sidebar
