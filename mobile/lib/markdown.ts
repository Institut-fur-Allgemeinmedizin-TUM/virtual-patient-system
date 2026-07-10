/**
 * Markdown content loader for legal documents
 */

// Due to the transformer these markdown files can be imported directly and then be used as strings
// @ts-ignore
import impressumContent from '../assets/legal/impressum.md';
// @ts-ignore
import datenschutzContent from '../assets/legal/datenschutz.md';

// Markdown content mapping
export const MARKDOWN_CONTENT = {
  impressum: impressumContent,
  datenschutz: datenschutzContent,
} as const;

/**
 * Get markdown content by document type
 */
export function getMarkdownContent(docType: keyof typeof MARKDOWN_CONTENT): string {
  try {
    return MARKDOWN_CONTENT[docType] || 'Content not found';
  } catch (error) {
    console.error(`Error loading markdown content for ${docType}:`, error);
    return 'Error loading content. Please try again later.';
  }
}
