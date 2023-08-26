# MDIE

Markdown inline editor.

![workflow](https://img.shields.io/github/actions/workflow/status/lucarickli/mdie/pages.yml)
![npm](https://img.shields.io/npm/v/%40lucarickli%2Fmdie)
![size](https://img.shields.io/bundlejs/size/%40lucarickli%2Fmdie%400.0.3)


- [Demo](https://lucarickli.github.io/mdie/)
- [Documentation](https://lucarickli.github.io/mdie/docs)

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

### Example

```ts
import Mdie from '@lucarickli/mdie'
import marked from 'marked'

const editor = new Mdie({
  target: document.body,
  markdown: `# Hello world`,
  parse: (md) => marked.parse(md) // 3rd party library
})
```
