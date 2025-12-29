import {
  Folder,
  FolderOpen,
  Code2,
  FileJson,
  FileText,
  Database,
  Settings,
  Palette,
  Globe,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type IconName =
  | "folder"
  | "folder-open"
  | "code"
  | "json"
  | "file-text"
  | "database"
  | "settings"
  | "palette"
  | "globe"
  | "file-code";

interface FileIconProps {
  name: IconName;
  className?: string;
  size?: number;
}

/**
 * Icon component that renders the appropriate Lucide icon with colors
 */
export function FileIcon({ name, className, size = 14 }: FileIconProps) {
  const iconProps = { size };

  switch (name) {
    case "folder":
      return <Folder {...iconProps} className={cn("text-yellow-400", className)} />;
    case "folder-open":
      return <FolderOpen {...iconProps} className={cn("text-yellow-400", className)} />;
    case "code":
      return <Code2 {...iconProps} className={cn("text-blue-400", className)} />;
    case "json":
      return <FileJson {...iconProps} className={cn("text-yellow-300", className)} />;
    case "file-text":
      return <FileText {...iconProps} className={cn("text-gray-400", className)} />;
    case "database":
      return <Database {...iconProps} className={cn("text-purple-400", className)} />;
    case "settings":
      return <Settings {...iconProps} className={cn("text-gray-400", className)} />;
    case "palette":
      return <Palette {...iconProps} className={cn("text-pink-400", className)} />;
    case "globe":
      return <Globe {...iconProps} className={cn("text-cyan-400", className)} />;
    case "file-code":
      return <FileCode {...iconProps} className={cn("text-blue-400", className)} />;
    default:
      return <FileCode {...iconProps} className={cn("text-blue-400", className)} />;
  }
}

/**
 * Get the appropriate icon name for a file
 */
export function getFileIconName(filename: string, isFolder = false, isExpanded = false): IconName {
  if (isFolder) return isExpanded ? "folder-open" : "folder";

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const iconMap: Record<string, IconName> = {
    ts: "code",
    tsx: "code",
    js: "code",
    jsx: "code",
    json: "json",
    prisma: "database",
    env: "settings",
    md: "file-text",
    css: "palette",
    html: "globe",
    yml: "settings",
    yaml: "settings",
  };

  return iconMap[ext] || "file-code";
}
