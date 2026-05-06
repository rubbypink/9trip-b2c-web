/**
 * @fileoverview Blog Schema Module — Defines Firestore mapping for blog posts.
 * @module blog-schema
 */

/**
 * Blog post schema metadata definitions
 * @constant {Object<string, {type: string, required?: boolean, description: string}>}
 */
export const BLOG_SCHEMA = {
  title: { type: 'string', required: true, description: 'Post title' },
  slug: { type: 'string', required: true, description: 'URL-safe slug' },
  excerpt: { type: 'string', description: 'Short summary (max 150-200 chars)' },
  content: { type: 'string', description: 'Full HTML content (300+ words)' },
  featuredImage: { type: 'string', description: 'Main image URL' },
  author: { type: 'string', description: 'Author name' },
  category: { type: 'string', description: 'Primary category' },
  tags: { type: 'array', items: { type: 'string' }, description: 'List of tags' },
  createdAt: { type: 'timestamp', required: true, description: 'Creation timestamp' },
  updatedAt: { type: 'timestamp', required: true, description: 'Last update timestamp' },
  status: { type: 'string', description: 'Post status: published | draft' }
};

export default BLOG_SCHEMA;
