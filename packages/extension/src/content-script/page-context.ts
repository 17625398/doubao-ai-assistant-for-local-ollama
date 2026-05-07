import type { DoubaoPageContext, DoubaoPageImage, DoubaoPageLink } from '../shared/protocol'

const MAX_TEXT_LENGTH = 16000
const MAX_LINKS = 24
const MAX_IMAGES = 18
const MAX_HEADINGS = 24

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function getMeta(name: string): string | undefined {
  const selector = `meta[name="${name}"], meta[property="${name}"]`
  return cleanText(document.querySelector<HTMLMetaElement>(selector)?.content) || undefined
}

function collectHeadings(): string[] {
  return Array.from(document.querySelectorAll('h1,h2,h3'))
    .map(node => cleanText(node.textContent))
    .filter(Boolean)
    .slice(0, MAX_HEADINGS)
}

function collectLinks(): DoubaoPageLink[] {
  const seen = new Set<string>()
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map(anchor => ({ text: cleanText(anchor.textContent) || anchor.href, href: anchor.href }))
    .filter(link => {
      if (!link.href || seen.has(link.href)) return false
      seen.add(link.href)
      return true
    })
    .slice(0, MAX_LINKS)
}

function collectImages(): DoubaoPageImage[] {
  const seen = new Set<string>()
  return Array.from(document.querySelectorAll<HTMLImageElement>('img[src]'))
    .map(image => ({ alt: cleanText(image.alt) || '未命名图片', src: image.currentSrc || image.src }))
    .filter(image => {
      if (!image.src || seen.has(image.src)) return false
      seen.add(image.src)
      return true
    })
    .slice(0, MAX_IMAGES)
}

function collectMainText(): string {
  const candidates = [
    document.querySelector('article'),
    document.querySelector('main'),
    document.querySelector('[role="main"]'),
    document.body,
  ].filter(Boolean) as HTMLElement[]

  const best = candidates
    .map(element => cleanText(element.innerText || element.textContent))
    .sort((a, b) => b.length - a.length)[0]

  return (best || cleanText(document.body?.innerText)).slice(0, MAX_TEXT_LENGTH)
}

export function capturePageContext(selectedText = window.getSelection()?.toString() ?? ''): DoubaoPageContext {
  const mainText = collectMainText()
  const headings = collectHeadings()
  const links = collectLinks()
  const images = collectImages()
  const words = mainText.match(/[\p{L}\p{N}_-]+/gu)?.length ?? 0

  return {
    title: document.title || location.hostname,
    url: location.href,
    origin: location.origin,
    description: getMeta('description') || getMeta('og:description'),
    language: document.documentElement.lang || navigator.language,
    selectedText: cleanText(selectedText) || undefined,
    mainText,
    headings,
    links,
    images,
    capturedAt: new Date().toISOString(),
    stats: {
      characters: mainText.length,
      words,
      headings: headings.length,
      links: links.length,
      images: images.length,
    },
  }
}
