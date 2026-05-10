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
      className="group flex flex-col md:flex-row bg-background rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-shadow duration-300"
    >
      <div className="relative aspect-video md:aspect-auto md:w-2/5 w-full shrink-0 overflow-hidden bg-muted">
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
          <span className="absolute top-4 left-4 px-3 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full shadow-sm z-10">
            {blog.category}
          </span>
        )}
      </div>

      <div className="p-5 md:p-6 flex flex-col flex-grow justify-center">
        <h3 className="font-bold text-xl md:text-2xl line-clamp-2 mb-3 group-hover:text-primary transition-colors text-foreground">
          {blog.title}
        </h3>
        {blog.excerpt && (
          <p className="text-sm md:text-base text-muted-foreground line-clamp-3 mb-4">
            {blog.excerpt}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-4 text-xs md:text-sm font-medium text-muted-foreground">
          {blog.author && (
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {blog.author}
            </span>
          )}
          {blog.createdAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(blog.createdAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}