---
title: 'Swiss Cross - Technical Documentation'
description: '🇨🇭 A lightweight React component for rendering the Swiss cross symbol with customizable size, colors, and border radius. TypeScript support, and dual CommonJS/ESM distribution.'
lastUpdated: '2025-09-03'
author: 'Fx64b'
status: 'published'
projectSlug: 'swiss-cross'
version: '1.0.3 (2025/09/05)'
readTime: '3 mins'
---

# Swiss Cross NPM Package

## Overview

The Swiss Cross NPM package is a lightweight React component for rendering a Swiss Cross Flag with customizable size, colors and border radius.
It is built with TypeScript and supports both CommonJS and ESM module formats, making it versatile for various JavaScript environments.

## Motivation

I created this package to learn how to build and publish an NPM package while also creating a component that I can use in my personal and my developer portfolios.
I wanted a simple and reusable way to display the Swiss cross symbol in my projects, and this package serves that purpose while also helping me understand the NPM ecosystem better.

See [the package on NPM](https://www.npmjs.com/package/swiss-cross) and [the source code on GitHub](https://github.com/Fx64b/swiss-cross)

You can find the package live in action on my [personal portfolio](https://fabio-maffucci.ch) and [this site](https://fx64b.dev).

## Installation

```bash
npm install swiss-cross
# or
pnpm add swiss-cross
# or
yarn add swiss-cross
```

## Usage

```jsx
import { SwissCross } from 'swiss-cross'

function App() {
    return (
        <div>
            {/* Basic usage */}
            <SwissCross />

            {/* Custom size */}
            <SwissCross size={40} />

            {/* Custom colors */}
            <SwissCross backgroundColor="#CC0000" crossColor="#FFFFFF" />

            {/* With border radius */}
            <SwissCross
                size={60}
                borderRadius="round"
                backgroundColor="#FF0000"
            />

            {/* With custom CSS class */}
            <SwissCross className="my-swiss-cross" size="3rem" />
        </div>
    )
}
```

**This will render:**

![Swiss Cross Examples](/projects/swiss-cross_example.png)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
See the [CONTRIBUTING](https://github.com/Fx64b/swiss-cross/blob/main/CONTRIBUTING.md) file for details.

### Local Development

To run the project locally, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/Fx64b/swiss-cross.git
    cd swiss-cross
    ```
2. Install dependencies:
    ```bash
    pnpm install
    ```
3. Start the development mode:
    ```bash
    pnpm dev
    ```
4. Run Tests:
    ```bash
    pnpm test:watch
    ```
5. Test Coverage:
    ```bash
    pnpm test:coverage
    ```
6. Build the package:
    ```bash
    pnpm build
    ```

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Fx64b/swiss-cross/blob/main/LICENSE) file for details.
