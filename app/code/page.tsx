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
            language: "tsx",
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
            language: "tsx",
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
        ],
      },
      {
        id: "7",
        name: "App.tsx",
        path: "src/App.tsx",
        type: "file",
        language: "tsx",
        content: `import * as React from "react";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { formatDate } from "./utils/helpers";

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
    </div>
  );
}`,
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
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}`,
  },
  {
    id: "9",
    name: "README.md",
    path: "README.md",
    type: "file",
    language: "markdown",
    content: `# Example Project

This is an example project to demonstrate the code viewer component.

## Features

- File tree navigation
- Syntax highlighting
- Responsive design`,
  },
]

export default function CodeViewerDemo() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Code Viewer Component</h1>
      <div className="h-[600px]">
        <CodeViewer initialFiles={sampleFiles} />
      </div>
    </div>
  )
}
