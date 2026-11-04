/**
 * formatMarkdown - Converts markdown text to clean, human-designed HTML.
 * Includes full support for:
 *  - H1, H2, H3 headers with professional subtle borders
 *  - Responsive HTML <table> generation from markdown tables
 *  - Mermaid.js diagram containers (<div class="mermaid">)
 *  - Clean blockquotes with accent left borders
 *  - Pre/code blocks with syntax styling
 *  - Ordered and unordered lists
 *  - Strong, emphasis, inline code, and horizontal rules
 *  - High-contrast typography for both Dark and Light themes
 */

export function formatMarkdown(text: string): string {
  if (!text) return '';

  // 1. Extract Mermaid blocks first so standard pre/code processing doesn't mangle them
  const mermaidBlocks: string[] = [];
  let processed = text.replace(/```mermaid\s*\n([\s\S]*?)```/gi, (_match, code) => {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push(code.trim());
    return `__MERMAID_BLOCK_${idx}__`;
  });

  // 2. Extract standard code blocks
  const codeBlocks: string[] = [];
  processed = processed.replace(/```(\w+)?\s*\n([\s\S]*?)```/g, (_match, lang, code) => {
    const idx = codeBlocks.length;
    const language = lang || 'text';
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(
      `<div class="my-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-space-950/80 backdrop-blur-md overflow-hidden shadow-sm dark:shadow-lg">
        <div class="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-accent-violet"></span>${language}</span>
        </div>
        <pre class="p-4 overflow-x-auto text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono leading-relaxed"><code>${escaped}</code></pre>
      </div>`
    );
    return `__CODE_BLOCK_${idx}__`;
  });

  // 3. Process tables line-by-line
  const rawLines = processed.split('\n');
  const stage1Lines: string[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    // Check if line looks like table row: | a | b |
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        let htmlTable = '<div class="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg bg-white dark:bg-space-900/40 backdrop-blur-md"><table class="w-full text-left text-sm border-collapse">';
        let hasHeader = false;

        for (let rowIdx = 0; rowIdx < tableLines.length; rowIdx++) {
          const row = tableLines[rowIdx];
          const cells = row
            .slice(1, -1)
            .split('|')
            .map(c => c.trim());

          // Separator row e.g. |---|---|
          if (cells.every(c => /^:?-+:?$/.test(c))) {
            hasHeader = true;
            continue;
          }

          if (rowIdx === 0 || !hasHeader) {
            htmlTable += '<thead class="bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-white/10 font-semibold"><tr>';
            for (const cell of cells) {
              htmlTable += `<th class="px-4 py-3 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">${formatInline(cell)}</th>`;
            }
            htmlTable += '</tr></thead><tbody class="divide-y divide-slate-200 dark:divide-white/5">';
          } else {
            htmlTable += '<tr class="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">';
            for (const cell of cells) {
              htmlTable += `<td class="px-4 py-3 text-slate-800 dark:text-slate-300 text-sm align-top leading-relaxed">${formatInline(cell)}</td>`;
            }
            htmlTable += '</tr>';
          }
        }

        htmlTable += '</tbody></table></div>';
        stage1Lines.push(htmlTable);
        continue;
      } else {
        stage1Lines.push(tableLines[0]);
        continue;
      }
    }

    stage1Lines.push(rawLines[i]);
    i++;
  }

  // 4. Process blockquotes, headers, lists, paragraphs
  const output: string[] = [];
  let inList = false;
  let inOrderedList = false;

  for (let idx = 0; idx < stage1Lines.length; idx++) {
    const rawLine = stage1Lines[idx];
    const line = rawLine.trim();

    // Reinsert Code or Table placeholders directly
    if (line.startsWith('__CODE_BLOCK_') || line.startsWith('__MERMAID_BLOCK_') || line.startsWith('<div class="overflow-x-auto')) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
      output.push(line);
      continue;
    }

    // Empty line
    if (!line) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
      continue;
    }

    // Horizontal Rule
    if (/^={3,}$|^-{3,}$|^_{3,}$/.test(line)) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
      output.push('<hr class="border-t border-slate-200 dark:border-white/10 my-5" />');
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
      const text = formatInline(line.slice(4).trim());
      output.push(`<h3 class="text-slate-900 dark:text-slate-200 font-semibold text-base sm:text-lg mt-5 mb-2 font-display">${text}</h3>`);
      continue;
    }

    if (line.startsWith('## ')) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
      const text = formatInline(line.slice(3).trim());
      output.push(`<h2 class="text-slate-900 dark:text-slate-100 font-bold text-lg sm:text-xl mt-6 mb-3 pb-1 border-b border-slate-200 dark:border-white/10 font-display">${text}</h2>`);
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
      const text = formatInline(line.slice(2).trim());
      output.push(`<h1 class="text-slate-950 dark:text-white font-extrabold text-xl sm:text-2xl mt-7 mb-4 pb-2 border-b border-slate-300 dark:border-white/15 font-display tracking-tight">${text}</h1>`);
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
      const text = formatInline(line.slice(2).trim());
      output.push(`<blockquote class="border-l-3 border-indigo-500 bg-indigo-50/70 dark:bg-accent-cyan/5 px-4 py-3 my-3 rounded-r-xl text-slate-800 dark:text-slate-300 text-sm leading-relaxed border-y border-r border-indigo-100 dark:border-white/5">${text}</blockquote>`);
      continue;
    }

    // Unordered list (- or *)
    if (/^[\*\-]\s+(.+)/.test(line)) {
      const content = line.replace(/^[\*\-]\s+/, '');
      if (!inList) {
        if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }
        output.push('<ul class="list-disc list-outside space-y-1.5 ml-5 my-2.5 text-slate-800 dark:text-slate-300">');
        inList = true;
      }
      output.push(`<li class="leading-relaxed pl-1">${formatInline(content)}</li>`);
      continue;
    }

    // Ordered list (1. 2.)
    if (/^\d+\.\s+(.+)/.test(line)) {
      const content = line.replace(/^\d+\.\s+/, '');
      if (!inOrderedList) {
        if (inList) { output.push('</ul>'); inList = false; }
        output.push('<ol class="list-decimal list-outside space-y-1.5 ml-5 my-2.5 text-slate-800 dark:text-slate-300">');
        inOrderedList = true;
      }
      output.push(`<li class="leading-relaxed pl-1">${formatInline(content)}</li>`);
      continue;
    }

    // Close any open lists
    if (inList) { output.push('</ul>'); inList = false; }
    if (inOrderedList) { output.push('</ol>'); inOrderedList = false; }

    // Regular paragraph
    output.push(`<p class="text-slate-800 dark:text-slate-300 leading-relaxed mb-3 text-sm sm:text-base">${formatInline(line)}</p>`);
  }

  if (inList) output.push('</ul>');
  if (inOrderedList) output.push('</ol>');

  let finalHtml = output.join('\n');

  // 5. Restore Code Blocks
  codeBlocks.forEach((block, idx) => {
    finalHtml = finalHtml.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  // 6. Restore Mermaid Blocks
  mermaidBlocks.forEach((code, idx) => {
    const mermaidContainer = `
      <div class="my-5 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-space-950/80 backdrop-blur-md shadow-sm dark:shadow-xl">
        <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          <span class="flex items-center gap-1.5 text-indigo-600 dark:text-accent-cyan">
            <svg class="w-4 h-4 text-indigo-600 dark:text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            System Architecture Diagram
          </span>
        </div>
        <div class="mermaid flex justify-center overflow-x-auto py-2 text-slate-900 dark:text-slate-100">${escapeHtml(code)}</div>
      </div>
    `;
    finalHtml = finalHtml.replace(`__MERMAID_BLOCK_${idx}__`, mermaidContainer);
  });

  return finalHtml;
}

/**
 * Format inline elements like bold, italic, code, links
 */
function formatInline(str: string): string {
  return str
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-indigo-50 dark:bg-white/10 text-indigo-700 dark:text-accent-cyan px-1.5 py-0.5 rounded text-xs font-mono border border-indigo-200 dark:border-white/10">$1</code>')
    // Bold italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="text-slate-950 dark:text-white font-bold italic">$1</strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-slate-100 font-bold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="text-slate-700 dark:text-slate-300 italic">$1</em>');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
