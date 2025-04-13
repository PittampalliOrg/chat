"use client"

import { CodeViewer } from "@/components/code-viewer"
import type { FileNode } from "@/types/code-viewer"

// Sample file structure
const sampleFiles: FileNode[] = [
  {
    id: "1",
    name: "src",
    path: "src",
    type: "directory",
    children: [
      {
        id: "2",
        name: "components",
        path: "src/components",
        type: "directory",
        children: [
          {
            id: "3",
            name: "Button.tsx",
            path: "src/components/Button.tsx",
            type: "file",
            language: "typescript",
            content: `import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={\`btn btn-\${variant} btn-\${size} \${className}\`}
      {...props}
    />
  );
}`,
          },
          {
            id: "4",
            name: "Card.tsx",
            path: "src/components/Card.tsx",
            type: "file",
            language: "typescript",
            content: `import * as React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <div className="card-body">{children}</div>
    </div>
  );
}`,
          },
          {
            id: "10",
            name: "CodeViewer.tsx",
            path: "src/components/CodeViewer.tsx",
            type: "file",
            language: "typescript",
            content: `import * as React from "react";
import Editor from "@monaco-editor/react";

interface CodeViewerProps {
  code: string;
  language: string;
}

export function CodeViewer({ code, language }: CodeViewerProps) {
  return (
    <div className="code-viewer">
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: true },
          fontSize: 14,
        }}
      />
    </div>
  );
}`,
          },
        ],
      },
      {
        id: "5",
        name: "utils",
        path: "src/utils",
        type: "directory",
        children: [
          {
            id: "6",
            name: "helpers.ts",
            path: "src/utils/helpers.ts",
            type: "file",
            language: "typescript",
            content: `export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function classNames(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}`,
          },
          {
            id: "11",
            name: "theme.ts",
            path: "src/utils/theme.ts",
            type: "file",
            language: "typescript",
            content: `import { createContext, useContext } from "react";

export type Theme = "light" | "dark" | "system";

export const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "system",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);`,
          },
        ],
      },
      {
        id: "7",
        name: "App.tsx",
        path: "src/App.tsx",
        type: "file",
        language: "typescript",
        content: `import * as React from "react";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { formatDate } from "./utils/helpers";
import { CodeViewer } from "./components/CodeViewer";

const sampleCode = \`function hello() {
  console.log("Hello, world!");
}\`;

export default function App() {
  const [count, setCount] = React.useState(0);
  const date = new Date();

  return (
    <div className="app">
      <Card title="Counter Example">
        <p>Count: {count}</p>
        <p>Date: {formatDate(date)}</p>
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
      </Card>
      <div style={{ height: "300px", marginTop: "20px" }}>
        <CodeViewer code={sampleCode} language="javascript" />
      </div>
    </div>
  );
}`,
      },
      {
        id: "12",
        name: "styles",
        path: "src/styles",
        type: "directory",
        children: [
          {
            id: "13",
            name: "globals.css",
            path: "src/styles/globals.css",
            type: "file",
            language: "css",
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}

.card {
  @apply rounded-lg border shadow-sm;
}

.card-header {
  @apply border-b p-4 font-medium;
}

.card-body {
  @apply p-4;
}`,
          },
        ],
      },
    ],
  },
  {
    id: "8",
    name: "package.json",
    path: "package.json",
    type: "file",
    language: "json",
    content: `{
  "name": "example-project",
  "version": "1.0.0",
  "dependencies": {
    "@monaco-editor/react": "^4.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^13.4.0",
    "next-themes": "^0.2.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}`,
  },
  {
    id: "9",
    name: "README.md",
    path: "README.md",
    type: "file",
    language: "markdown",
    content: `# Code Viewer Example

This project demonstrates a code viewer component with Monaco Editor integration.

## Features

- File tree navigation with collapsible directories
- Monaco Editor integration (same as VS Code)
- Syntax highlighting for multiple languages
- Light and dark theme support
- Responsive design for mobile and desktop

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`
   npm run dev
   \`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser.`,
  },
]

export default function CodeViewerDemo() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Code Viewer with Monaco Editor</h1>
      <div className="h-[700px]">
        <CodeViewer initialFiles={sampleFiles} />
      </div>
    </div>
  )
}
