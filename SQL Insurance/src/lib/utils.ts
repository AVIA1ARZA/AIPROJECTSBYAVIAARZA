import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSql(sql: string): string {
  if (!sql) return "";
  
  // Keywords to start a new line
  const keywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", 
    "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "JOIN", "UNION", "VALUES", 
    "INSERT INTO", "UPDATE", "SET", "DELETE FROM"
  ];
  
  let formatted = sql.trim();
  
  // Add newline before keywords, but not if it's already at the start
  keywords.forEach(keyword => {
    // Match the keyword as a whole word, case-insensitive
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, (match) => `\n${match.toUpperCase()}`);
  });
  
  // Clean up multiple newlines and trim
  return formatted.split('\n').map(line => line.trim()).filter(line => line).join('\n');
}

export function extractTextFromChildren(children: any): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!children) return '';
  
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  
  if (children.props && children.props.children) {
    return extractTextFromChildren(children.props.children);
  }
  
  return '';
}
