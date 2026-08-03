'use client';

import { useState, useMemo } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  FolderTree,
  FileCode2,
  Download,
  Copy,
  ChevronRight,
  ChevronDown,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedProjectData {
  files: Record<string, string>;
  projectName: string;
  installCommand: string;
}

function buildFileTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode = { name: '', children: {}, path: '' };

  for (const filePath of Object.keys(files)) {
    const parts = filePath.split('/');
    let node = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!node.children[part]) {
        const isFile = i === parts.length - 1;
        node.children[part] = {
          name: part,
          children: {},
          path: parts.slice(0, i + 1).join('/'),
          isFile,
        };
      }
      node = node.children[part];
    }
  }

  return sortTree(root.children);
}

interface TreeNode {
  name: string;
  children: Record<string, TreeNode>;
  path: string;
  isFile?: boolean;
}

function sortTree(children: Record<string, TreeNode>): TreeNode[] {
  return Object.values(children).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

function getLanguageFromPath(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'tsx';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.mjs')) return 'js';
  return 'text';
}

function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    tsx: 'text-blue-400',
    css: 'text-pink-400',
    json: 'text-yellow-400',
    js: 'text-amber-400',
    text: 'text-muted-foreground',
  };
  return colors[lang] || colors.text;
}

export function GeneratedProjectTab() {
  const generatedProjectContent = useAnalysisStore((s) => s.generatedProjectContent);
  const project = generatedProjectContent as GeneratedProjectData | null;
  const fileTree = useMemo(() => (project ? buildFileTree(project.files) : []), [project]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  if (!generatedProjectContent || !project) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Generated project is not available. Enable the "Reference Pipeline" option before running
        analysis.
      </div>
    );
  }

  const fileCount = Object.keys(project.files).length;

  // Auto-select first file
  if (!selectedFile && fileCount > 0) {
    const firstFile = Object.keys(project.files)[0];
    setSelectedFile(firstFile);
  }

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const handleCopyFile = () => {
    if (!selectedFile || !project.files[selectedFile]) return;
    navigator.clipboard.writeText(project.files[selectedFile]);
    toast.success('File content copied');
  };

  const handleCopyAll = () => {
    const combined = Object.entries(project.files)
      .map(([path, content]) => `// ── ${path} ──\n${content}`)
      .join('\n\n');
    navigator.clipboard.writeText(combined);
    toast.success('All files copied to clipboard');
  };

  const handleDownloadFile = () => {
    if (!selectedFile || !project.files[selectedFile]) return;
    const blob = new Blob([project.files[selectedFile]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Project info bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium">{project.projectName}</span>
          <Badge variant="outline" className="text-xs">
            {fileCount} files
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <code className="text-xs bg-black/30 px-2 py-1 rounded text-muted-foreground">
            {project.installCommand}
          </code>
        </div>
      </div>

      {/* Main content: file tree + code preview */}
      <div className="flex flex-col md:flex-row gap-3 min-h-[400px] max-h-[500px]">
        {/* File tree */}
        <div className="md:w-64 shrink-0 border border-white/10 rounded-lg bg-black/20 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FolderTree className="h-3.5 w-3.5" />
            Files
          </div>
          <ScrollArea className="max-h-[440px]">
            <div className="p-1">
              {fileTree.map((node) => (
                <TreeNodeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedFile={selectedFile}
                  expandedDirs={expandedDirs}
                  onSelect={setSelectedFile}
                  onToggle={toggleDir}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Code preview */}
        <div className="flex-1 border border-white/10 rounded-lg bg-black/20 overflow-hidden flex flex-col min-h-[300px]">
          {selectedFile && project.files[selectedFile] ? (
            <>
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{selectedFile}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${getLanguageColor(getLanguageFromPath(selectedFile))}`}
                  >
                    {getLanguageFromPath(selectedFile)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-1.5 text-muted-foreground"
                    onClick={handleCopyFile}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-1.5 text-muted-foreground"
                    onClick={handleDownloadFile}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 max-h-[440px]">
                <pre className="p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap text-muted-foreground overflow-x-auto">
                  <code>{project.files[selectedFile]}</code>
                </pre>
              </ScrollArea>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
              Select a file to preview
            </div>
          )}
        </div>
      </div>

      {/* Download all button */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyAll}>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copy All Files
        </Button>
      </div>
    </div>
  );
}

function TreeNodeItem({
  node,
  depth,
  selectedFile,
  expandedDirs,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  expandedDirs: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedFile === node.path;
  const children = sortTree(node.children);

  if (node.isFile) {
    return (
      <button
        className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors flex items-center gap-1.5 ${
          isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node.path)}
      >
        <FileCode2 className="h-3 w-3 shrink-0 opacity-60" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors flex items-center gap-1.5 text-muted-foreground"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onToggle(node.path)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
        )}
        <FolderTree className="h-3 w-3 shrink-0 opacity-60" />
        <span className="font-medium">{node.name}</span>
      </button>
      {isExpanded && (
        <div>
          {children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedDirs={expandedDirs}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
