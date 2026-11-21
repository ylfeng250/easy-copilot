import cssText from "data-text:./content-style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getConfigForDomain, resolveSelector } from "~lib/storage"
import type { SiteConfig } from "~lib/storage"

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

type Theme = "light" | "dark"

const ROW_PITCH = 30 // 行高 20 + 间距 10，和 DeepSeek 原生一致
const CARD_PAD_Y = 15
const HIGHLIGHT = "0 0 0 2px rgba(57, 100, 254, 0.5)"

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as unknown as T
}

function extractText(el: Element, maxLen = 400): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone
    .querySelectorAll(
      'pre, code, svg, img, [aria-hidden="true"], .sr-only, [class*="visually-hidden"], [class*="screen-reader"]'
    )
    .forEach((n) => n.remove())
  const raw = (clone.textContent || "").replace(/\s+/g, " ").trim()
  return raw.length > maxLen ? raw.slice(0, maxLen) + "…" : raw
}

/** 读取页面实际背景亮度，判断亮/暗主题 */
function readBackgroundTheme(): Theme {
  let el: HTMLElement | null = document.body
  while (el) {
    const bg = getComputedStyle(el).backgroundColor
    const m = bg.match(
      /rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)/
    )
    if (m) {
      const alpha = m[4] === undefined ? 1 : parseFloat(m[4])
      if (alpha > 0.5) {
        const lum =
          (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255
        return lum > 0.5 ? "light" : "dark"
      }
    }
    el = el.parentElement
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/** 跟随宿主页面的亮/暗主题（DeepSeek 在 body 上打 light / dark 类名，其它站点看背景色） */
function useHostTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const read = () => {
      const cls = document.body.classList
      if (cls.contains("dark")) setTheme("dark")
      else if (cls.contains("light")) setTheme("light")
      else setTheme(readBackgroundTheme())
    }
    read()

    const observer = new MutationObserver(read)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"]
    })

    const mq = matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener?.("change", read)

    return () => {
      observer.disconnect()
      mq.removeEventListener?.("change", read)
    }
  }, [])

  return theme
}

/**
 * DeepSeek 等站点自带同类「提问导航」，两套指示条会重叠。
 * 这里只隐藏右侧边缘、成组出现的小指示条本身，不动其它 UI。
 */
function suppressNativeRail() {
  const W = window.innerWidth
  const found: HTMLElement[] = []

  document.querySelectorAll<HTMLElement>("div").forEach((el) => {
    if (el.dataset.ecSuppressed) return
    const r = el.getBoundingClientRect()
    if (r.width < 10 || r.width > 28 || r.height < 14 || r.height > 28) return
    // 只处理贴着视口右缘的窄条
    if (r.right < W - 60 || r.right > W - 4) return

    const inner = el.firstElementChild as HTMLElement | null
    if (!inner) return
    const ir = inner.getBoundingClientRect()
    if (ir.width < 4 || ir.width > 14 || ir.height < 1 || ir.height > 5) return
    if (parseFloat(getComputedStyle(inner).borderRadius) < 3) return

    found.push(el)
  })

  // 至少两根竖向排列才算同类导航，避免误伤单个装饰元素
  if (found.length < 2) return

  // 找到承载这些指示条的窄容器（宽 <= 64、高 >= 100），整块隐藏
  let rail: HTMLElement | null = found[0].parentElement
  for (let i = 0; i < 3 && rail; i++) {
    const cr = rail.getBoundingClientRect()
    if (cr.width <= 64 && cr.height >= 100) break
    rail = rail.parentElement
  }

  const targets = rail ? [rail] : found
  targets.forEach((el) => {
    el.dataset.ecSuppressed = "1"
    el.style.setProperty("display", "none", "important")
  })
}

function Sidebar() {
  const [items, setItems] = useState<NavItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectorReady, setSelectorReady] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const selectorRef = useRef("")
  const configRef = useRef<SiteConfig | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const detailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const theme = useHostTheme()

  const scanDOM = useCallback(() => {
    if (!selectorRef.current) return
    try {
      let elements = document.querySelectorAll(selectorRef.current)

      // 选择器失效时（站点改版 / 内容后加载）自动切换到备选选择器
      if (elements.length === 0 && configRef.current) {
        const next = resolveSelector(configRef.current)
        if (next !== selectorRef.current) {
          selectorRef.current = next
          elements = document.querySelectorAll(next)
        }
      }

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

  const suppress = useMemo(() => debounce(suppressNativeRail, 400), [])

  useEffect(() => {
    const init = async () => {
      const domain = window.location.hostname
      const cfg = await getConfigForDomain(domain)
      if (cfg) {
        configRef.current = cfg
        selectorRef.current = resolveSelector(cfg)
        setSelectorReady(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectorReady) return
    const debouncedScan = debounce(() => {
      scanDOM()
      suppress()
    }, 300)
    scanDOM()
    suppress()

    observerRef.current = new MutationObserver(debouncedScan)
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => observerRef.current?.disconnect()
  }, [selectorReady, scanDOM, suppress])

  // 根据滚动位置实时更新当前所在的提问（和原生导航一致）
  useEffect(() => {
    if (!selectorReady || items.length === 0) return
    let raf = 0

    const compute = () => {
      raf = 0
      const probe = window.innerHeight / 2
      let current = items[0].id
      for (const item of items) {
        if (item.element.getBoundingClientRect().top <= probe) current = item.id
      }
      setActiveId(current)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }

    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true
    })
    window.addEventListener("resize", onScroll)
    compute()

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [selectorReady, items])

  // 监听来自 popup 的消息
  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.type === "config-updated") {
        selectorRef.current = msg.selector || ""
        getConfigForDomain(window.location.hostname).then((cfg) => {
          configRef.current = cfg ?? null
          if (cfg) selectorRef.current = msg.selector || resolveSelector(cfg)
          setSelectorReady(!!cfg)
          scanDOM()
        })
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
    el.style.transition = "box-shadow 0.2s ease"
    el.style.boxShadow = HIGHLIGHT
    setTimeout(() => {
      el.style.boxShadow = "none"
      el.style.transition = ""
    }, 1400)
  }

  const scheduleDetail = (index: number) => {
    if (detailTimeoutRef.current) clearTimeout(detailTimeoutRef.current)
    detailTimeoutRef.current = setTimeout(() => setDetailIndex(index), 150)
  }

  const clearDetail = () => {
    if (detailTimeoutRef.current) clearTimeout(detailTimeoutRef.current)
    setDetailIndex(null)
  }

  /** 悬停指示条：展开卡片并高亮对应行，稍后弹出完整内容 */
  const handleBarEnter = (index: number) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current)
    scheduleDetail(index)
    openTimeoutRef.current = setTimeout(() => setShowCard(true), 80)
  }

  /** 离开导航区域：延迟关闭，给移入卡片留出时间 */
  const scheduleClose = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current)
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setShowCard(false)
      clearDetail()
    }, 160)
  }

  const cancelClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
  }

  // 卡片的行高与指示条间距一致（30px），所以卡片居中即可让每一行对齐右侧指示条
  const cardHeight = Math.min(
    items.length * ROW_PITCH + 2 * CARD_PAD_Y,
    window.innerHeight * 0.56
  )
  const cardTop = Math.round(
    Math.max(
      16,
      Math.min(
        window.innerHeight / 2 - cardHeight / 2,
        window.innerHeight - cardHeight - 16
      )
    )
  )
  const detailTop =
    detailIndex === null
      ? 0
      : cardTop + CARD_PAD_Y + detailIndex * ROW_PITCH + 10

  if (!selectorReady) return null

  return (
    <div className="ec-root" data-theme={theme}>
      <nav className="ec-rail" aria-label="提问导航">
        {items.map((item, i) => {
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`ec-rail-item${isActive ? " is-active" : ""}`}
              aria-label={`第 ${i + 1} 个提问：${item.text.slice(0, 40)}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => scrollTo(item)}
              onMouseEnter={() => handleBarEnter(i)}
              onMouseLeave={scheduleClose}>
              <span className="ec-rail-bar" />
            </button>
          )
        })}
      </nav>

      {showCard && items.length > 0 && (
        <div
          className="ec-tip"
          style={{ top: cardTop }}
          role="listbox"
          aria-label="提问列表"
          onMouseEnter={() => {
            cancelClose()
            setShowCard(true)
          }}
          onMouseLeave={scheduleClose}>
          {items.map((item, i) => {
            const isActive = activeId === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`ec-tip-row${isActive ? " is-active" : ""}`}
                role="option"
                aria-selected={isActive}
                onClick={() => scrollTo(item)}
                onMouseEnter={() => {
                  scheduleDetail(i)
                }}
                onMouseLeave={clearDetail}>
                <span>{item.text}</span>
              </button>
            )
          })}
        </div>
      )}

      {showCard && detailIndex !== null && items[detailIndex] && (
        <div className="ec-detail" style={{ top: detailTop }} role="tooltip">
          {items[detailIndex].text}
        </div>
      )}

    </div>
  )
}

export default Sidebar
