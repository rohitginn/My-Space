import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export function sanitizeHtml(value: string | null | undefined) {
  if (!value) return value;
  return DOMPurify.sanitize(value);
}
