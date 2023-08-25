const whitelineMultiRegex = /^(\s+)?$/gm
const whitelineRegex = /^(\s+)?$/

export default class Mdie extends EventTarget {
  private readonly parse: (md: string) => string
  private readonly target: Element | ShadowRoot
  private readonly lines: string[] = []
  private activeItem?: number

  /** Index of active item. */
  public get active(): number | undefined {
    return this.activeItem
  }
  /** Updated markdown. */
  public get markdown() {
    let str = ''
    for (const line of this.lines) str = str + (str === '' ? '' : '\n\n') + line
    return str
  }

  public constructor({
    target,
    markdown,
    parse,
    clickOutside = document
  }: {
    /** DOM target. */
    target: HTMLElement | Element | Document | ShadowRoot
    /** The markdown to edit. If unset you have to call `mdie.init`. */
    markdown?: string
    /** Parse markdown to html. */
    parse: (md: string) => string
    /** @default document */
    clickOutside?: HTMLElement | Element | Document | ShadowRoot
  }) {
    super()

    this.target = normalizeElement(target)
    this.parse = parse

    clickOutside.addEventListener('click', () => this.save())
    ;(this.target as HTMLElement).classList?.add('mdie')

    if (markdown) this.init(markdown)
  }

  /** Set markdown content. Can be called multiple times. */
  public init(markdown: string) {
    this.target.innerHTML = this.parse(markdown)
    this.lines.splice(
      0,
      this.lines.length,
      ...markdown
        .split(whitelineMultiRegex)
        .filter((line) => line && !whitelineRegex.test(line))
        .map((line) => line.trim())
    )

    if (this.target.children.length !== this.lines.length) {
      throw new Error('Child elements dont match markdown blocks length.')
    }

    for (let i = 0; i < this.target.children.length; i++) {
      this.target.children
        .item(i)
        .addEventListener('click', (ev: MouseEvent) => this.handleClick(ev))
    }
  }

  /** Enable editing on specified element. */
  public enableEditing(el: HTMLElement, index = getIndex(el)) {
    this.save()
    el.removeEventListener('click', (ev: MouseEvent) => this.handleClick(ev))
    el.addEventListener('focusout', () => this.save())
    el.innerText = this.lines[index] || ''
    el.setAttribute('role', 'textbox')
    el.contentEditable = 'true'
    el.style.whiteSpace = 'pre-wrap'
    el.focus()
  }

  /** Disable editing on active item & save changes. */
  public save() {
    if (typeof this.activeItem !== 'number') return
    this.dispatchEvent(new Event('unfocus'))

    const el = this.target.children.item(this.activeItem) as HTMLElement
    const { innerText } = el

    if (whitelineRegex.test(el.innerText)) {
      this.lines.splice(this.activeItem, 1)
      this.target.removeChild(el)
      this.activeItem = undefined
      return
    }

    const template = new DOMParser().parseFromString(this.parse(innerText), 'text/html').body

    if (template.children.length <= 0) throw new Error('Expected template children.')

    for (let i = 0; i < template.children.length; i++) {
      template.children.item(i).addEventListener('click', (ev: MouseEvent) => this.handleClick(ev))
    }

    this.lines[this.activeItem] = innerText
    this.target.replaceChild(template.children.item(0), el)

    if (template.children.length > 0) {
      const lines = innerText
        .split(whitelineMultiRegex)
        .filter((line) => line && !whitelineRegex.test(line))
        .map((line) => line.trim())

      if (lines.length !== template.children.length + 1) {
        throw new Error('Template elements dont match markdown blocks length..')
      }

      this.spliceElements(this.activeItem + 1, ...template.children)

      for (let i = 0; i < lines.length; i++) {
        this.lines[this.activeItem + i] = lines[i]
      }
    }

    this.activeItem = undefined
  }

  /** Close editor. This will break the editor instance. */
  public cleanup() {
    this.save()
    this.target.innerHTML = this.parse(this.parse(this.markdown))
    ;(this.target as HTMLElement).classList?.remove('mdie')
  }

  private handleClick(ev: MouseEvent) {
    ev.stopPropagation()

    const el = findOrigin(ev.target as HTMLElement, this.target)
    const index = getIndex(el, this.target as HTMLElement)

    if (typeof this.activeItem === 'number') {
      if (index === this.activeItem) return
      this.save()
    }

    this.dispatchEvent(new Event('focus'))

    if (isPaddingClick(el, ev.offsetX, ev.offsetY)) {
      const newEl = document.createElement('p')
      newEl.addEventListener('click', (ev) => ev.stopPropagation())
      this.spliceElements(index + 1, newEl)
      this.enableEditing(this.target.children.item(index + 1) as HTMLElement, index + 1)
      this.activeItem = index + 1
      return
    }

    this.enableEditing(el, index)
    this.activeItem = index
  }

  private spliceElements(index: number, ...elemets: Element[]) {
    if (index === this.target.children.length) {
      for (const el of elemets) {
        this.target.appendChild(el)
        this.lines.push('')
      }
    } else {
      const children = new Set<Element>()
      for (let i = 0; i < this.target.children.length; i++) {
        if (i == index) {
          for (const el of elemets) children.add(el)
        }
        children.add(this.target.children.item(i))
      }

      this.target.replaceChildren(...children)
      this.lines.splice(index, 0, ...Array(elemets.length).map(() => ''))
    }

    if (this.lines.length !== this.target.children.length) {
      throw new Error('Failed to splice new element.')
    }
  }
}

function normalizeElement(el: HTMLElement | Element | Document | ShadowRoot) {
  return el instanceof HTMLElement || el instanceof Element || el instanceof ShadowRoot
    ? el
    : el instanceof Document
    ? el.body
    : undefined
}

function isPaddingClick(el: HTMLElement, offsetX: number, offsetY: number) {
  const style = window.getComputedStyle(el, null)
  const pTop = parseInt(style.getPropertyValue('padding-top'))
  const pRight = parseFloat(style.getPropertyValue('padding-right'))
  const pLeft = parseFloat(style.getPropertyValue('padding-left'))
  const pBottom = parseFloat(style.getPropertyValue('padding-bottom'))
  const width = el.offsetWidth
  const height = el.offsetHeight
  const x = parseFloat(String(offsetX))
  const y = parseFloat(String(offsetY))

  return !(x > pLeft && x < width - pRight && y > pTop && y < height - pBottom)
}

function findOrigin(child: HTMLElement, parent: Element | ShadowRoot): HTMLElement | undefined {
  if (Array.from(parent.children).includes(child)) return child
  if (!child.parentElement) return undefined
  return findOrigin(child.parentElement, parent)
}

function getIndex(el: Element, parentEl = el.parentElement) {
  return Array.from(parentEl.children).indexOf(el)
}
