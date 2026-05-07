"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, User, Share2, Link as LinkIcon, Check } from "lucide-react";
import { useState, useEffect } from "react";

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
  } catch (e) {
    return dateString;
  }
}

/**
 * BlogDetail — Client Component for rendering blog post content.
 * @param {{ post: Object, relatedPosts: Object[] }} props
 */
export default function BlogDetail({ post, relatedPosts = [] }) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, "_blank");
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(post.title)}`, "_blank");
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <header className="mb-10">
        <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden mb-8 bg-muted">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted-foreground/10">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
            {post.category && (
              <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full mb-4">
                {post.category}
              </span>
            )}
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
              {post.author && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{post.author}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content Section */}
      <div className="bg-background rounded-xl p-6 md:p-10 shadow-sm border border-border mb-10">
        <div
          className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2 flex items-center">Tags:</span>
            {post.tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-surface-1 text-muted-foreground text-sm rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Share Buttons */}
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Share2 className="w-4 h-4" />
            <span>Chia sẻ bài viết:</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={shareToFacebook}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-bold"
              aria-label="Share on Facebook"
            >
              f
            </button>
            <button
              onClick={shareToTwitter}
              className="p-2 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors text-sm font-bold"
              aria-label="Share on X"
            >
              𝕏
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-full bg-muted text-foreground hover:bg-surface-1-foreground/20 transition-colors flex items-center gap-2"
              aria-label="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts && relatedPosts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Bài viết liên quan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((relatedPost) => (
              <Link href={`/blog/${relatedPost.slug}`} key={relatedPost.id} className="group flex flex-col bg-background rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                  {relatedPost.featuredImage ? (
                    <Image
                      src={relatedPost.featuredImage}
                      alt={relatedPost.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted-foreground/10">
                      <span className="text-muted-foreground text-sm">No image</span>
                    </div>
                  )}
                  {relatedPost.category && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-medium rounded-full">
                      {relatedPost.category}
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {relatedPost.title}
                  </h3>
                  <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(relatedPost.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
