const whitelineMultiRegex = /^(\s+)?$/gm;
const whitelineRegex = /^(\s+)?$/;

export class InlineEditor {
  private readonly parse: (md: string) => string;
  private readonly originalMarkdown: string;
  private readonly target: Element | ShadowRoot;
  private readonly lines: string[];
  private activeItem?: number;

  public get changesMade(): boolean {
    return this.markdown !== this.originalMarkdown;
  }

  public get markdown() {
    let str = "";
    for (const line of this.lines)
      str = str + (str === "" ? "" : "\n\n") + line;
    return str;
  }

  public cleanup(save = false) {
    if (typeof this.activeItem === "number") this.saveChanges();
    this.target.innerHTML = this.parse(
      this.parse(save ? this.markdown : this.originalMarkdown)
    );
  }

  public constructor({
    target,
    markdown,
    parse,
    clickOutside = document,
  }: {
    target: HTMLElement | Element | Document | ShadowRoot;
    markdown: string;
    parse: (md: string) => string;
    /** @default document */
    clickOutside?: HTMLElement | Element | Document | ShadowRoot;
  }) {
    this.parse = parse;
    this.originalMarkdown = markdown;
    this.lines = markdown
      .split(whitelineMultiRegex)
      .filter((line) => line && !whitelineRegex.test(line))
      .map((line) => line.trim());

    this.target = normalizeElement(target);
    this.target.innerHTML = this.parse(markdown);

    clickOutside.addEventListener("click", () => {
      if (typeof this.activeItem === "number") this.saveChanges();
    });

    if (this.target.children.length !== this.lines.length) {
      throw new Error(
        "Faield to create edtior: Child elements dont match markdown lines length."
      );
    }

    for (let i = 0; i < this.target.children.length; i++) {
      this.target.children
        .item(i)
        .addEventListener("click", (ev: MouseEvent) => this.handleClick(ev));
    }

    (this.target as HTMLElement).classList?.add("mdie");
  }

  private handleClick(ev: MouseEvent) {
    ev.stopPropagation();

    const el = findOrigin(ev.target as HTMLElement, this.target);
    const index = getIndex(el, this.target as HTMLElement);

    if (typeof this.activeItem === "number") {
      if (index === this.activeItem) return;
      this.saveChanges();
    }

    if (isPaddingClick(el, ev.offsetX, ev.offsetY)) {
      const newEl = document.createElement("p");
      newEl.addEventListener("click", (ev) => ev.stopPropagation());
      this.spliceElements(index + 1, newEl);
      this.enableEditor(
        this.target.children.item(index + 1) as HTMLElement,
        index + 1
      );
      this.activeItem = index + 1;
      return;
    }

    this.enableEditor(el, index);
    this.activeItem = index;
  }

  private spliceElements(index: number, ...elemets: Element[]) {
    if (index === this.target.children.length) {
      for (const el of elemets) {
        this.target.appendChild(el);
        this.lines.push("");
      }
    } else {
      const children = new Set<Element>();
      for (let i = 0; i < this.target.children.length; i++) {
        if (i == index) {
          for (const el of elemets) children.add(el);
        }
        children.add(this.target.children.item(i));
      }

      this.target.replaceChildren(...children);
      this.lines.splice(index, 0, ...Array(elemets.length).map(() => ""));
    }

    if (this.lines.length !== this.target.children.length) {
      throw new Error("Failed to splice new element.");
    }
  }

  private enableEditor(el: HTMLElement, index = getIndex(el)) {
    el.removeEventListener("click", (ev: MouseEvent) => this.handleClick(ev));
    el.innerText = this.lines[index] || "";
    el.setAttribute("role", "textbox");
    el.contentEditable = "true";
    el.style.whiteSpace = "pre-wrap";
    el.focus();
  }

  private saveChanges(index: number = this.activeItem) {
    if (typeof index !== "number") return;

    const el = this.target.children.item(index) as HTMLElement;
    const rawContent = el.innerText;
    const content = this.parse(rawContent);

    if (whitelineRegex.test(content)) {
      this.lines.splice(index, 1);
      this.target.removeChild(el);
      this.activeItem = undefined;
      return;
    }

    const template = new DOMParser().parseFromString(content, "text/html").body;

    for (let i = 0; i < template.children.length; i++) {
      template.children
        .item(i)
        .addEventListener("click", (ev: MouseEvent) => this.handleClick(ev));
    }

    this.target.replaceChild(template.children.item(0), el); // this removes child from template!

    if (template.children.length <= 0) this.lines[index] = rawContent;
    else {
      if (!whitelineMultiRegex.test(rawContent)) {
        throw new Error("Failed sync multiple elements with markdown content.");
      }

      const lines = rawContent
        .split(whitelineMultiRegex)
        .filter((line) => line && !whitelineRegex.test(line))
        .map((line) => line.trim());

      if (lines.length !== template.children.length + 1) {
        throw new Error("Failed sync multiple elements with markdown content.");
      }

      this.spliceElements(index + 1, ...template.children);
      for (let i = 0; i < lines.length; i++) {
        this.lines[index + i] = lines[i];
      }
    }

    this.activeItem = undefined;
  }
}

function normalizeElement(el: HTMLElement | Element | Document | ShadowRoot) {
  return el instanceof HTMLElement ||
    el instanceof Element ||
    el instanceof ShadowRoot
    ? el
    : el instanceof Document
    ? el.body
    : undefined;
}

function isPaddingClick(el: HTMLElement, offsetX: number, offsetY: number) {
  const style = window.getComputedStyle(el, null);
  const pTop = parseInt(style.getPropertyValue("padding-top"));
  const pRight = parseFloat(style.getPropertyValue("padding-right"));
  const pLeft = parseFloat(style.getPropertyValue("padding-left"));
  const pBottom = parseFloat(style.getPropertyValue("padding-bottom"));
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const x = parseFloat(String(offsetX));
  const y = parseFloat(String(offsetY));

  return !(x > pLeft && x < width - pRight && y > pTop && y < height - pBottom);
}

function findOrigin(
  child: HTMLElement,
  parent: Element | ShadowRoot
): HTMLElement | undefined {
  if (Array.from(parent.children).includes(child)) return child;
  if (!child.parentElement) return undefined;
  return findOrigin(child.parentElement, parent);
}

function getIndex(el: Element, parentEl = el.parentElement) {
  return Array.from(parentEl.children).indexOf(el);
}
