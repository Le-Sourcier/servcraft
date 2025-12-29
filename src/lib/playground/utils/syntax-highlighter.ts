/**
 * Syntax highlighter for TypeScript/JavaScript code
 * Uses a tokenization approach to avoid overlapping HTML tags
 */

interface Token {
  type: 'text' | 'comment' | 'string' | 'keyword' | 'type' | 'number' | 'function';
  value: string;
}

const KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'import', 'export', 'from',
  'async', 'await', 'try', 'catch', 'throw', 'new', 'class', 'extends',
  'typeof', 'instanceof', 'this', 'static', 'public', 'private', 'protected', 'readonly'
];

const TYPES = [
  'string', 'number', 'boolean', 'void', 'null', 'undefined', 'any',
  'never', 'unknown', 'interface', 'type', 'enum', 'true', 'false'
];

/**
 * Tokenize a single line of code
 */
function tokenizeLine(line: string): Token[] {
  let remaining = line;
  const tokens: Token[] = [];

  while (remaining.length > 0) {
    let matched = false;

    // Try to match comment
    if (remaining.startsWith('//')) {
      tokens.push({ type: 'comment', value: remaining });
      remaining = '';
      matched = true;
      continue;
    }

    // Try to match strings
    const stringMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/);
    if (stringMatch) {
      tokens.push({ type: 'string', value: stringMatch[0] });
      remaining = remaining.slice(stringMatch[0].length);
      matched = true;
      continue;
    }

    // Try to match numbers
    const numberMatch = remaining.match(/^\d+\.?\d*/);
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] });
      remaining = remaining.slice(numberMatch[0].length);
      matched = true;
      continue;
    }

    // Try to match keywords
    const keywordPattern = new RegExp(`^(${KEYWORDS.join('|')})\\b`);
    const keywordMatch = remaining.match(keywordPattern);
    if (keywordMatch) {
      tokens.push({ type: 'keyword', value: keywordMatch[0] });
      remaining = remaining.slice(keywordMatch[0].length);
      matched = true;
      continue;
    }

    // Try to match types
    const typePattern = new RegExp(`^(${TYPES.join('|')})\\b`);
    const typeMatch = remaining.match(typePattern);
    if (typeMatch) {
      tokens.push({ type: 'type', value: typeMatch[0] });
      remaining = remaining.slice(typeMatch[0].length);
      matched = true;
      continue;
    }

    // Try to match function calls
    const functionMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*(?=\()/);
    if (functionMatch) {
      tokens.push({ type: 'function', value: functionMatch[0] });
      remaining = remaining.slice(functionMatch[0].length);
      matched = true;
      continue;
    }

    // No match, take one character as text
    if (!matched) {
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

/**
 * Convert a token to HTML with appropriate styling
 */
function tokenToHtml(token: Token): string {
  switch (token.type) {
    case 'comment':
      return `<span class="text-muted-foreground">${token.value}</span>`;
    case 'string':
      return `<span class="text-green-400">${token.value}</span>`;
    case 'keyword':
      return `<span class="text-primary font-semibold">${token.value}</span>`;
    case 'type':
      return `<span class="text-cyan-400">${token.value}</span>`;
    case 'number':
      return `<span class="text-orange-400">${token.value}</span>`;
    case 'function':
      return `<span class="text-yellow-300">${token.value}</span>`;
    default:
      return token.value;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Highlight code with syntax coloring
 *
 * @param code - The code to highlight
 * @param language - Programming language (currently only supports TypeScript/JavaScript)
 * @returns HTML string with syntax highlighting
 */
export function highlightCode(code: string, _language: string = 'typescript'): string {
  if (!code) return "";

  // Escape HTML first
  const escaped = escapeHtml(code);
  const lines = escaped.split('\n');
  const result: string[] = [];

  // Process each line
  for (const line of lines) {
    const tokens = tokenizeLine(line);
    const lineHtml = tokens.map(tokenToHtml).join('');
    result.push(lineHtml);
  }

  return result.join('\n');
}
