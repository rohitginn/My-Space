import type { RichTextDocument, RichTextNode } from './types';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}

export function plainTextToRichText(value: string): RichTextDocument {
  const lines = value.split(/\r?\n/);
  return {
    type: 'doc',
    content: lines.map<RichTextNode>((line) => line.length === 0
      ? { type: 'paragraph', content: [{ type: 'hardBreak' }] }
      : { type: 'paragraph', content: [{ type: 'text', text: line }] }),
  };
}

export function richTextToPlainText(document?: RichTextDocument): string {
  if (!document) return '';
  return document.content.map((block) => flatten(block)).join('\n');
}

export function richTextToHtml(document?: RichTextDocument): string {
  if (!document) return '';
  return document.content.map(renderHtmlNode).join('');
}

function renderHtmlNode(node: RichTextNode): string {
  if (node.type === 'text') {
    let html = escapeHtml(node.text ?? '');
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') html = `<strong>${html}</strong>`;
      if (mark.type === 'italic') html = `<em>${html}</em>`;
      if (mark.type === 'code') html = `<code>${html}</code>`;
      if (mark.type === 'highlight') html = `<mark>${html}</mark>`;
      if (mark.type === 'link') html = `<a href="${escapeHtml(mark.attrs?.href ?? '')}">${html}</a>`;
    }
    return html;
  }
  if (node.type === 'hardBreak') return '<br />';
  const content = (node.content ?? []).map(renderHtmlNode).join('');
  if (node.type === 'bulletList') return `<ul>${content}</ul>`;
  if (node.type === 'orderedList') return `<ol>${content}</ol>`;
  if (node.type === 'listItem') return `<li>${content}</li>`;
  return `<div>${content || '<br />'}</div>`;
}

export function htmlToRichText(html: string): RichTextDocument {
  if (typeof DOMParser === 'undefined') return parseHtmlFallback(html);
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  const blocks = Array.from(root.childNodes).flatMap(parseBlocks);
  if (blocks.length === 0) return plainTextToRichText(root.textContent ?? '');
  return { type: 'doc', content: blocks };
}

type FallbackHtmlNode = { tag: string; attrs: string; children: Array<FallbackHtmlNode | string> };

function parseHtmlFallback(html: string): RichTextDocument {
  const root: FallbackHtmlNode = { tag: 'root', attrs: '', children: [] };
  const stack: FallbackHtmlNode[] = [root];
  const tokens = /<!--[\s\S]*?-->|<\/?([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(html))) {
    const full = match[0];
    if (full.startsWith('<!--')) continue;
    const tag = match[1]?.toLowerCase();
    if (!tag) {
      if (match[3]) stack[stack.length - 1].children.push(match[3]);
      continue;
    }
    if (full.startsWith('</')) {
      const index = stack.map((node) => node.tag).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const node: FallbackHtmlNode = { tag, attrs: match[2] ?? '', children: [] };
    stack[stack.length - 1].children.push(node);
    if (!/\/\s*>$/.test(full) && !['br', 'img', 'hr', 'input'].includes(tag)) stack.push(node);
  }
  const blocks = root.children.flatMap((node) => typeof node === 'string' ? [] : fallbackBlocks(node));
  return { type: 'doc', content: blocks.length ? blocks : plainTextToRichText(decodeHtml(html.replace(/<[^>]+>/g, ''))).content };
}

function fallbackBlocks(node: FallbackHtmlNode): RichTextNode[] {
  if (node.tag === 'ul' || node.tag === 'ol') {
    return [{
      type: node.tag === 'ul' ? 'bulletList' : 'orderedList',
      content: node.children.filter((child): child is FallbackHtmlNode => typeof child !== 'string' && child.tag === 'li').map((child) => ({ type: 'listItem', content: fallbackInline(child) })),
    }];
  }
  if (node.tag === 'div' || node.tag === 'body' || node.tag === 'root') {
    const nested = node.children.flatMap((child) => typeof child === 'string' ? [] : ['ul', 'ol', 'p', 'div'].includes(child.tag) ? fallbackBlocks(child) : []);
    const inline = fallbackInline(node, new Set(['ul', 'ol', 'p', 'div']));
    return inline.length ? [{ type: 'paragraph', content: inline }, ...nested] : nested;
  }
  return [{ type: node.tag === 'li' ? 'listItem' : 'paragraph', content: fallbackInline(node) }];
}

function fallbackInline(node: FallbackHtmlNode, blockTags = new Set<string>(), marks: RichTextNode['marks'] = []): RichTextNode[] {
  const output: RichTextNode[] = [];
  const nextMarks = [...marks];
  if (node.tag === 'strong' || node.tag === 'b') nextMarks.push({ type: 'bold' });
  if (node.tag === 'em' || node.tag === 'i') nextMarks.push({ type: 'italic' });
  if (node.tag === 'code') nextMarks.push({ type: 'code' });
  if (node.tag === 'mark') nextMarks.push({ type: 'highlight' });
  if (node.tag === 'a') nextMarks.push({ type: 'link', attrs: { href: node.attrs.match(/href\s*=\s*["']([^"']*)["']/i)?.[1] ?? '' } });
  node.children.forEach((child) => {
    if (typeof child === 'string') {
      const text = decodeHtml(child);
      if (text) output.push({ type: 'text', text, marks: nextMarks.length ? nextMarks : undefined });
      return;
    }
    if (child.tag === 'br') output.push({ type: 'hardBreak' });
    else if (!blockTags.has(child.tag)) output.push(...fallbackInline(child, blockTags, nextMarks));
  });
  return output;
}

function decodeHtml(value: string) {
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
}

function parseBlocks(node: Node): RichTextNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.trim() ? [{ type: 'paragraph', content: [{ type: 'text', text: node.textContent }] }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (tag !== 'div') return [parseBlock(element)];

  // Browsers commonly wrap execCommand list output in a div. Preserve the
  // nested list instead of treating the whole wrapper as one paragraph.
  const childBlocks = Array.from(element.childNodes).flatMap((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childTag = (child as Element).tagName.toLowerCase();
      if (childTag === 'ul' || childTag === 'ol' || childTag === 'p' || childTag === 'div') return parseBlocks(child);
    }
    return [];
  });
  if (childBlocks.length > 0) {
    const inline: RichTextNode[] = [];
    collectInlineNodes(element, [], inline, new Set(['ul', 'ol', 'p', 'div']));
    return inline.length > 0 ? [{ type: 'paragraph', content: inline }, ...childBlocks] : childBlocks;
  }
  return [parseBlock(element)];
}

function parseBlock(element: Element): RichTextNode {
  const tag = element.tagName.toLowerCase();
  if (tag === 'ul' || tag === 'ol') {
    return {
      type: tag === 'ul' ? 'bulletList' : 'orderedList',
      content: Array.from(element.children).filter((child) => child.tagName.toLowerCase() === 'li').map((child) => parseBlock(child)),
    };
  }
  const content: RichTextNode[] = [];
  collectInlineNodes(element, [], content);
  return { type: tag === 'li' ? 'listItem' : 'paragraph', content: content.length > 0 ? content : [{ type: 'hardBreak' }] };
}

function collectInlineNodes(node: Node, marks: RichTextNode['marks'], output: RichTextNode[], blockTags = new Set<string>()) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) output.push({ type: 'text', text: node.textContent, marks: marks?.length ? marks : undefined });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const element = node as HTMLElement;
  if (element.tagName === 'BR') {
    output.push({ type: 'hardBreak' });
    return;
  }
  if (blockTags.has(element.tagName.toLowerCase())) return;
  const nextMarks = [...(marks ?? [])];
  const tag = element.tagName.toLowerCase();
  if (tag === 'strong' || tag === 'b') nextMarks.push({ type: 'bold' });
  if (tag === 'em' || tag === 'i') nextMarks.push({ type: 'italic' });
  if (tag === 'code') nextMarks.push({ type: 'code' });
  if (tag === 'mark') nextMarks.push({ type: 'highlight' });
  if (tag === 'a') nextMarks.push({ type: 'link', attrs: { href: element.getAttribute('href') ?? '' } });
  node.childNodes.forEach((child) => collectInlineNodes(child, nextMarks, output, blockTags));
}

function flatten(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '';
  return (node.content ?? []).map(flatten).join('');
}

export function toggleTextMark(document: RichTextDocument, mark: 'bold' | 'italic' | 'code' | 'highlight'): RichTextDocument {
  const next = structuredClone(document);
  next.content = next.content.map((block) => ({
    ...block,
    content: (block.content ?? []).map((node) => {
      if (node.type !== 'text') return node;
      const marks = node.marks ?? [];
      const hasMark = marks.some((item) => item.type === mark);
      return { ...node, marks: hasMark ? marks.filter((item) => item.type !== mark) : [...marks, { type: mark }] };
    }),
  }));
  return next;
}

export function toggleBlockList(document: RichTextDocument, kind: 'bulletList' | 'orderedList'): RichTextDocument {
  const next = structuredClone(document);
  const selectedBlocks = next.content;
  if (selectedBlocks.length === 1 && (selectedBlocks[0].type === 'bulletList' || selectedBlocks[0].type === 'orderedList')) {
    if (selectedBlocks[0].type === kind) return { ...next, content: selectedBlocks[0].content?.map((item) => ({ type: 'paragraph', content: item.content })) ?? [] };
  }
  return { ...next, content: [{ type: kind, content: selectedBlocks.map((block) => ({ type: 'listItem', content: block.content ?? [] })) }] };
}

export function setLinkMark(document: RichTextDocument, href: string | null): RichTextDocument {
  const next = structuredClone(document);
  next.content = next.content.map((block) => mapInlineMarks(block, href));
  return next;
}

function mapInlineMarks(node: RichTextNode, href: string | null): RichTextNode {
  const content = node.content?.map((child) => mapInlineMarks(child, href));
  if (node.type !== 'text') return { ...node, ...(content ? { content } : {}) };
  const marks = (node.marks ?? []).filter((mark) => mark.type !== 'link');
  if (href) marks.push({ type: 'link', attrs: { href } });
  return { ...node, marks: marks.length ? marks : undefined };
}
