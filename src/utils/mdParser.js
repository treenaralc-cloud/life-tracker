/**
 * Simple, robust Markdown parser tailored for the AlmostTactical team md files.
 * Parses raw markdown text into structured data.
 */
export function parseMemberMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const result = {
    title: '',
    emoji: '',
    roleId: '',
    roleName: '',
    intro: '',
    sections: [],
    reportingLevel: ''
  };

  let currentSection = null;
  let parsedIntro = false;
  let introLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for H1 Title (e.g. # 👑 บทบาท: AMT Lead...)
    if (line.startsWith('# ')) {
      const titleContent = line.substring(2).trim();
      result.title = titleContent;

      // Try to parse emoji and role
      const emojiMatch = titleContent.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g);
      if (emojiMatch) {
        result.emoji = emojiMatch[0];
      }

      // Try to extract Role ID and Role Name
      const roleMatch = titleContent.match(/บทบาท(?:ของคุณ)?:\s*([A-Za-z0-9_ -]+)\s*\((.*)\)/);
      if (roleMatch) {
        result.roleId = roleMatch[1].trim();
        result.roleName = roleMatch[2].trim();
      } else {
        const fallbackMatch = titleContent.match(/บทบาท(?:ของคุณ)?:\s*(.*)$/);
        if (fallbackMatch) {
          result.roleName = fallbackMatch[1].trim();
          result.roleId = "Executive Assistant";
        }
      }
      continue;
    }

    // Check for Horizontal Rule
    if (line === '---' || line === '***') {
      if (!parsedIntro && introLines.length > 0) {
        result.intro = introLines.join(' ');
        parsedIntro = true;
      }
      continue;
    }

    // Check for H2 Section (##)
    if (line.startsWith('## ')) {
      if (!parsedIntro && introLines.length > 0) {
        result.intro = introLines.join(' ');
        parsedIntro = true;
      }

      const sectionTitle = line.substring(3).trim();
      currentSection = {
        title: sectionTitle,
        type: 'list', // fallback type
        items: []
      };

      if (sectionTitle.includes('ขอบเขตหน้าที่') || sectionTitle.includes('ภารกิจ') || sectionTitle.includes('ขอบเขตความรับผิดชอบ')) {
        currentSection.type = 'numbered';
      }

      result.sections.push(currentSection);
      continue;
    }

    // Check for reporting level at the bottom (e.g., *ระดับการรายงาน: ...*)
    if (line.startsWith('*ระดับการรายงาน:') || line.includes('รายงานตรงต่อ')) {
      // Clean up markdown formatting like *
      result.reportingLevel = line.replace(/\*/g, '').trim();
      continue;
    }

    // Parse content within sections
    if (currentSection) {
      // Bullet list item
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const itemText = line.substring(2).trim();
        // Check for strong bold prefix like **นิสัยถาวร:** text
        const boldMatch = itemText.match(/^\*\*(.*?)\*\*:(.*)$/);
        if (boldMatch) {
          currentSection.items.push({
            type: 'bold-prefix',
            label: boldMatch[1].trim(),
            text: boldMatch[2].trim()
          });
        } else {
          currentSection.items.push({
            type: 'text',
            text: itemText
          });
        }
      }
      // Numbered list item
      else if (line.match(/^\d+\.\s*/)) {
        const itemText = line.replace(/^\d+\.\s*/, '').trim();
        const boldMatch = itemText.match(/^\*\*(.*?)\*\*:(.*)$/);
        if (boldMatch) {
          currentSection.items.push({
            type: 'bold-prefix',
            label: boldMatch[1].trim(),
            text: boldMatch[2].trim()
          });
        } else {
          currentSection.items.push({
            type: 'text',
            text: itemText
          });
        }
      }
      // Sub-bullet indent or extra details
      else if (line.startsWith('*') && line.endsWith('*')) {
        // Just text styling
        currentSection.items.push({
          type: 'text',
          text: line.replace(/\*/g, '').trim()
        });
      }
      else {
        // Normal text line inside section, append to previous item if exists, or add new text
        if (currentSection.items.length > 0) {
          const lastItem = currentSection.items[currentSection.items.length - 1];
          if (lastItem.type === 'text') {
            lastItem.text += ' ' + line;
          } else {
            lastItem.text += ' ' + line;
          }
        } else {
          currentSection.items.push({
            type: 'text',
            text: line
          });
        }
      }
    } else {
      // Collect intro lines
      if (!parsedIntro) {
        introLines.push(line);
      }
    }
  }

  // Clean up remaining intro if no divider was found
  if (!parsedIntro && introLines.length > 0) {
    result.intro = introLines.join(' ');
  }

  return result;
}

/**
 * Parses generic Markdown into structured and safe HTML strings.
 * Built to handle headers, lists, code blocks, alerts, tables, bold, italics and line breaks.
 */
export function parseGenericMarkdown(text) {
  if (!text) return '';

  // Escape HTML characters to prevent XSS/rendering issues with unescaped markup
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = html.split('\n');
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let inTable = false;
  let inBlockquote = false;
  let blockquoteType = ''; // NOTE, TIP, IMPORTANT, WARNING, CAUTION

  let processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // Code block
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        processedLines.push('</code></pre></div>');
        inCodeBlock = false;
      } else {
        const lang = trimmed.substring(3).trim() || 'text';
        processedLines.push(`<div class="code-block-wrapper"><div class="code-block-header">${lang}</div><pre><code class="language-${lang}">`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      processedLines.push(line);
      continue;
    }

    // Table parsing
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Check if it's separator line (e.g. | :---: | :--- |)
      const isSeparator = trimmed.replace(/[\s|:-]/g, '') === '';
      
      const cells = trimmed.split('|')
        .slice(1, -1)
        .map(c => c.trim());

      if (isSeparator) {
        // Skip separator line
        continue;
      }

      if (!inTable) {
        inTable = true;
        processedLines.push('<div class="table-wrapper"><table><thead><tr>');
        cells.forEach(cell => {
          processedLines.push(`<th>${parseInlineMarkdown(cell)}</th>`);
        });
        processedLines.push('</tr></thead><tbody>');
      } else {
        processedLines.push('<tr>');
        cells.forEach(cell => {
          processedLines.push(`<td>${parseInlineMarkdown(cell)}</td>`);
        });
        processedLines.push('</tr>');
      }
      continue;
    } else {
      if (inTable) {
        processedLines.push('</tbody></table></div>');
        inTable = false;
      }
    }

    // Blockquote & Alerts
    if (trimmed.startsWith('&gt;')) {
      let content = trimmed.substring(4).trim();

      if (!inBlockquote) {
        inBlockquote = true;
        // Check for alert flags e.g., [!NOTE], [!IMPORTANT], etc.
        const alertMatch = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
        if (alertMatch) {
          blockquoteType = alertMatch[1].toUpperCase();
          content = content.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
          processedLines.push(`<div class="alert-box alert-${blockquoteType.toLowerCase()}"><div class="alert-title">${getAlertEmoji(blockquoteType)} ${blockquoteType}</div><div class="alert-content">`);
        } else {
          blockquoteType = '';
          processedLines.push('<blockquote>');
          processedLines.push(parseInlineMarkdown(content));
        }
      } else {
        if (blockquoteType) {
          processedLines.push(parseInlineMarkdown(content));
        } else {
          processedLines.push('<br/>' + parseInlineMarkdown(content));
        }
      }
      continue;
    } else {
      if (inBlockquote) {
        if (blockquoteType) {
          processedLines.push('</div></div>');
        } else {
          processedLines.push('</blockquote>');
        }
        inBlockquote = false;
        blockquoteType = '';
      }
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      processedLines.push(`<h1 class="md-h1">${parseInlineMarkdown(trimmed.substring(2))}</h1>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      processedLines.push(`<h2 class="md-h2">${parseInlineMarkdown(trimmed.substring(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      processedLines.push(`<h3 class="md-h3">${parseInlineMarkdown(trimmed.substring(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      processedLines.push(`<h4 class="md-h4">${parseInlineMarkdown(trimmed.substring(5))}</h4>`);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      processedLines.push('<hr class="md-hr"/>');
      continue;
    }

    // List processing (unordered)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      if (!inList) {
        processedLines.push('<ul class="md-ul">');
        inList = true;
      }
      processedLines.push(`<li class="md-li">${parseInlineMarkdown(trimmed.substring(2))}</li>`);
      continue;
    }

    // List processing (ordered)
    const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
    if (orderedMatch) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (!inOrderedList) {
        processedLines.push('<ol class="md-ol">');
        inOrderedList = true;
      }
      processedLines.push(`<li class="md-li">${parseInlineMarkdown(orderedMatch[2])}</li>`);
      continue;
    }

    // Close list if not in a list line
    if (inList && !trimmed.startsWith('* ') && !trimmed.startsWith('- ')) {
      processedLines.push('</ul>');
      inList = false;
    }
    if (inOrderedList && !orderedMatch) {
      processedLines.push('</ol>');
      inOrderedList = false;
    }

    // Standard paragraph or empty line
    if (trimmed === '') {
      processedLines.push('<div class="md-spacing"></div>');
    } else {
      processedLines.push(`<p class="md-p">${parseInlineMarkdown(trimmed)}</p>`);
    }
  }

  // Close any open elements
  if (inCodeBlock) processedLines.push('</code></pre></div>');
  if (inTable) processedLines.push('</tbody></table></div>');
  if (inBlockquote) {
    if (blockquoteType) processedLines.push('</div></div>');
    else processedLines.push('</blockquote>');
  }
  if (inList) processedLines.push('</ul>');
  if (inOrderedList) processedLines.push('</ol>');

  return processedLines.join('\n');
}

function getAlertEmoji(type) {
  switch (type) {
    case 'NOTE': return '💡';
    case 'TIP': return '⚡';
    case 'IMPORTANT': return '⚠️';
    case 'WARNING': return '🔥';
    case 'CAUTION': return '🚨';
    default: return '📢';
  }
}

function parseInlineMarkdown(text) {
  if (!text) return '';
  let parsed = text;

  // Bold **text**
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code `code`
  parsed = parsed.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

  // Custom links: [text](url) -> convert file urls nicely or standard links
  parsed = parsed.replace(/\[(.*?)\]\((file:\/\/\/.*?)\)/g, '<a href="$2" class="file-link" target="_blank" rel="noopener noreferrer">📂 $1</a>');
  parsed = parsed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="file-link-external" target="_blank" rel="noopener noreferrer">$1</a>');

  return parsed;
}

