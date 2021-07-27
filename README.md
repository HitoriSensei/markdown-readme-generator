<!-- title -->
# @hitorisensei/markdown-readme-generator
<!-- title end -->
<!-- description -->
Fills template blocks within your markdown readme files. With monorepo packages support build-in.
<!-- description end -->

# Usage

Use 
```html
<!-- {blockname} --><!-- {blockname} end -->
```
within your markdown file.

After processing, contents between those comment blocks will be filled.

Look at this <!-- link this -->[README.md](README.md)<!-- link this end --> source for comparison.

## Block supplied by default:
* Fields extracted from `package.json`:
```
<!-- title -->
# @hitorisensei/markdown-readme-generator
<!-- title end -->
```

```
<!-- description -->
Fills template blocks within your markdown readme files. With monorepo packages support build-in.<!-- description end -->
```

* Deep package.json fields and inline rendering
```
`yargs` dependency version: **<!-- dependencies.yargs -->^17.0.1<!-- dependencies.yargs end -->** !
```
gives:

`yargs` dependency version: **<!-- dependencies.yargs -->^17.0.1<!-- dependencies.yargs end -->** !

...etc

* List of monorepo packages (check --packages CLI option)

```
<!-- packages -->
## example


`example-monorepo-package`


A monorepo package example
<!-- packages end -->
```

* Links to packages

```
<!-- link example -->
[example](#example)
<!-- link example end -->
```

* [Custom block definitions](#Custom block definitions)

## CLI Options
<!-- asJsonMD -->
```bash
Options:
      --version    Show version number                                 [boolean]
  -o, --outFile    output file path. Can be relative to project root or absolute
                                               [required] [default: "README.md"]
      --packages   packages directory location            [default: "packages/"]
      --project    root project location
      --dry        do not write output file, print results to stdout instead
                                                                       [boolean]
  -r, --recursive  should also update readme files in packages   [default: true]
      --create     create readme file if one does not exist yet  [default: true]
  -v, --verbose    display verbose output             [boolean] [default: false]
      --custom     load custom block definitions from file (js or json)
      --help       Show help                                           [boolean]

```
<!-- asJsonMD end -->

## Custom block definitions
You can describe your own replacement blocksCustom with either .json file or .js module


### JS
<!-- jsExample -->
```bash
const { execSync } = require('child_process');
const usageContent = execSync('node . --help').toString();

module.exports = {
  // you can use https://www.npmjs.com/package/json2md notation
  asJsonMD: [
    {
      code: {
        language: 'bash',
        content: [usageContent],
      },
    },
  ],

  // or literal markdown
  asLiteralMd: `
    \`\`\`bash
    ${usageContent}
    \`\`\`
  `,
};

```
<!-- jsExample end -->

### JSON
<!-- jsonExample -->
```bash
{
  "asJsonMD": [
    {
      "code": {
        "language": "bash",
        "content": [
          "Options:\n      --version    Show version number                                 [boolean]\n  -o, --outFile    output file path. Can be relative to project root or absolute\n                                               [required] [default: \"README.md\"]\n      --packages   packages directory location            [default: \"packages/\"]\n      --project    root project location\n      --dry        do not write output file, print results to stdout instead\n                                                                       [boolean]\n  -r, --recursive  should also update readme files in packages   [default: true]\n      --create     create readme file if one does not exist yet  [default: true]\n  -v, --verbose    display verbose output             [boolean] [default: false]\n      --custom     load custom block definitions from file (js or json)\n      --help       Show help                                           [boolean]\n"
        ]
      }
    }
  ],
  "asLiteralMd": "\n    ```bash\n    Options:\n      --version    Show version number                                 [boolean]\n  -o, --outFile    output file path. Can be relative to project root or absolute\n                                               [required] [default: \"README.md\"]\n      --packages   packages directory location            [default: \"packages/\"]\n      --project    root project location\n      --dry        do not write output file, print results to stdout instead\n                                                                       [boolean]\n  -r, --recursive  should also update readme files in packages   [default: true]\n      --create     create readme file if one does not exist yet  [default: true]\n  -v, --verbose    display verbose output             [boolean] [default: false]\n      --custom     load custom block definitions from file (js or json)\n      --help       Show help                                           [boolean]\n\n    ```\n  "
}
```
<!-- jsonExample end -->