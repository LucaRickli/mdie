# MDIE (WIP)

Markdown inline editor.

### [Demo](https://lucarickli.github.io/mdie/)

### Install

```sh
npm i -S @lucarickli/mdie
```

### CSS

> **Note**
> A new line can be created by clicking onto the padding of a target child.
> Without this padding you wont be able to directly create new lines.

The editor itself does not come with any css, instead it adds the class tag `mdie` to the target.
Here is a snippet to include in your app for a basic working example.

```css
.mdie > * {
  padding-bottom: 8px;
}
```

### API

```ts
declare class InlineEditor {
  constructor({
    target,
    markdown,
    parse
  }: {
    target: HTMLElement | Element | Document | ShadowRoot
    markdown: string
    parse: (md: string) => string
  })

  get changesMade(): boolean

  get markdown(): string

  cleanup(save?: boolean): void
}
```

### Example

```ts
import { InlineEditor } from '@lucarickli/mdie'

const editor = new InlineEditor({
  target: document.body,
  markdown: `# Hello world`,
  parse: (md) => marked.parse(md) // 3rd party library
})
```
