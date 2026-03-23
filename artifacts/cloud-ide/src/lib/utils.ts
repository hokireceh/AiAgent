import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getLanguageFromFilename = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python',
    'c': 'c', 'cpp': 'cpp', 'cc': 'cpp',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'bash', 'bash': 'bash',
    'r': 'r',
    'swift': 'swift',
    'json': 'json',
    'md': 'markdown',
    'html': 'html',
    'css': 'css'
  };
  return map[ext || ''] || 'plaintext';
};
