"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, User } from "lucide-react";

/**
 * Format date to Vietnamese locale.
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

/**
 * BlogCard — Client Component for rendering a blog post card in the grid.
 * @param {{ blog: { id: string, slug: string, title: string, excerpt?: string, featuredImage?: string, author?: string, category?: string, createdAt?: string } }} props
 */
export default function BlogCard({ blog }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group flex flex-col bg-background rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-shadow duration-300"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {blog.featuredImage ? (
          <Image
            src={blog.featuredImage}
            alt={blog.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted-foreground/10">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
        {blog.category && (
          <span className="absolute top-2 left-2 px-2.5 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-medium rounded-full">
            {blog.category}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {blog.title}
        </h3>
        {blog.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {blog.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
          {blog.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {blog.author}
            </span>
          )}
          {blog.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(blog.createdAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}