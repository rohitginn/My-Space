import { describe, expect, it } from 'vitest';
import { htmlToRichText, plainTextToRichText, richTextToHtml, richTextToPlainText, setLinkMark, toggleBlockList, toggleTextMark } from './richText';

describe('structured rich text', () => {
  it('round-trips multiline plain text', () => {
    const document = plainTextToRichText('one\ntwo');
    expect(richTextToPlainText(document)).toBe('one\ntwo');
  });

  it('toggles marks without changing the document text', () => {
    const document = plainTextToRichText('hello');
    const marked = toggleTextMark(document, 'bold');
    expect(marked.content[0].content?.[0].marks?.[0].type).toBe('bold');
    expect(richTextToPlainText(marked)).toBe('hello');
  });

  it('round-trips inline formatting through HTML', () => {
    const document = toggleTextMark(plainTextToRichText('Hello world'), 'bold');
    expect(richTextToHtml(document)).toContain('<strong>Hello world</strong>');
    expect(richTextToPlainText(document)).toBe('Hello world');
  });

  it('preserves list containers and links as structured nodes', () => {
    const parsed = htmlToRichText('<ul><li>One</li><li><a href="https://example.com">Two</a></li></ul>');
    expect(parsed.content[0].type).toBe('bulletList');
    expect(richTextToPlainText(parsed)).toBe('OneTwo');
    expect(richTextToHtml(parsed)).toContain('<ul>');
    expect(richTextToHtml(parsed)).toContain('https://example.com');
  });

  it('preserves lists wrapped by contenteditable divs', () => {
    const parsed = htmlToRichText('<div><ul><li>One</li><li>Two</li></ul></div>');
    expect(parsed.content[0].type).toBe('bulletList');
    expect(parsed.content[0].content).toHaveLength(2);
  });

  it('toggles block lists and link marks without flattening content', () => {
    const list = toggleBlockList(plainTextToRichText('one\ntwo'), 'orderedList');
    expect(list.content[0].type).toBe('orderedList');
    const linked = setLinkMark(plainTextToRichText('one'), 'https://example.com');
    expect(linked.content[0].content?.[0].marks?.[0].type).toBe('link');
  });
});
