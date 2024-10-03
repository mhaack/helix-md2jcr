# Helix Markdown to Word

> A library that converts markdown to Word documents.

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-md2docx.svg)](https://codecov.io/gh/adobe/helix-md2docx)
[![CircleCI](https://circleci.com/gh/adobe/helix-md2docx.svg?style=svg)](https://circleci.com/gh/adobe/helix-md2docx)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-md2docx.svg)](https://github.com/adobe/helix-md2docx/blob/main/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-md2docx.svg)](https://github.com/adobe/helix-md2docx/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-md2docx.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-md2docx)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

## Usage

```bash
npm install @adobe/helix-md2docx
```

## Converting Markdown to Docx

just run:

```
node ./src/cli/convert2docx.js <file>
```

Where `file` can either be a single file or directory.

The converter will produce a `.docx` and also a `.docx.md`, which is the generated document converted
back to markdown. this can be used to check for potential content changes due to conversion.

