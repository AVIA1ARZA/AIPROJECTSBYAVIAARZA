/**
 * Utility to extract CTEs (Common Table Expressions) from SQL strings
 * for autocomplete purposes.
 */

export interface CTEInfo {
  name: string;
  columns: string[];
}

export function extractCTEs(sql: string): Record<string, string[]> {
  const ctes: Record<string, string[]> = {};
  
  // Clean comments and normalize whitespace
  const cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');

  // Look for WITH ... AS (...) patterns
  // This is a simplified regex-based parser
  const withMatch = cleanSql.match(/WITH\s+(.+?)\s+AS\s*\(/i);
  if (!withMatch) return ctes;

  // Split multiple CTEs (separated by commas)
  // Example: WITH cte1 AS (...), cte2 AS (...)
  // We need to be careful with nested parentheses
  const fullWithClause = cleanSql.substring(withMatch.index! + 5);
  
  // Find the top-level CTE definitions
  let depth = 0;
  let currentPos = 0;
  let currentCteName = '';
  let inNameZone = true;

  // Simplified extraction logic:
  // Regex to find CTE names and their first SELECT columns
  const cteRegex = /([a-z0-9_]+)\s*(?:\(([^)]+)\))?\s+AS\s*\(\s*SELECT\s+(.+?)\s+FROM/gi;
  let match;

  while ((match = cteRegex.exec(cleanSql)) !== null) {
    const name = match[1];
    const explicitCols = match[2];
    const selectCols = match[3];

    let columns: string[] = [];

    if (explicitCols) {
      // Case: WITH cte(col1, col2) AS ...
      columns = explicitCols.split(',').map(c => c.trim().split(/\s+/)[0]);
    } else if (selectCols) {
      // Case: WITH cte AS (SELECT col1, col2 as alias2 FROM ...)
      // We take a simple approach: split by comma, then take the last word (alias or column name)
      columns = selectCols.split(',').map(c => {
        const parts = c.trim().split(/\s+/);
        return parts[parts.length - 1].replace(/['"`]/g, '');
      }).filter(c => c && !c.includes('(') && !c.includes(')')); // Basic filter to avoid complex expressions
    }

    if (name && columns.length > 0) {
      ctes[name] = columns;
    }
  }

  return ctes;
}
