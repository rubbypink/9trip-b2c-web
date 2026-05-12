"use client";

import { useState, useCallback } from "react";
import { $$$ } from "@9trip/shared/utils";

function stripHtml(html) {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function hasHtmlTags(str) {
  if (!str) return false;
  return /<\/?[a-z][\s\S]*>/i.test(str);
}

function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * HtmlField — renders HTML content safely with tooltip/popup support.
 *
 * - `asHtml={true}`: Renders the HTML content directly using dangerouslySetInnerHTML
 *   (for fields known to contain rich text / HTML).
 * - `asHtml={false}` or omitted (auto-detect): If the content contains HTML tags,
 *   renders truncated plain text with a "View HTML" button that opens a popup
 *   showing the rendered HTML content.
 *
 * @param {{
 *   html?: string,
 *   content?: string,
 *   asHtml?: boolean,
 *   className?: string,
 *   prose?: boolean,
 *   maxLength?: number,
 * }} props
 */
export default function HtmlField({
  html,
  content,
  asHtml,
  className = "",
  prose = true,
  maxLength = 200,
}) {
  const htmlContent = html || content || "";
  const [showPopup, setShowPopup] = useState(false);

  const openPopup = useCallback(() => setShowPopup(true), []);
  const closePopup = useCallback(() => setShowPopup(false), []);

  // Determine rendering mode
  const isHtmlMode = asHtml === true;
  const containsHtml = hasHtmlTags(htmlContent);

  // If asHtml is not explicitly set and content contains HTML tags,
  // default to non-HTML mode with tooltip for safety
  const shouldRenderHtml = isHtmlMode;
  const shouldShowTooltip =
    !isHtmlMode && containsHtml && htmlContent.trim().length > 0;

  if (!htmlContent) {
    return null;
  }

  // ── HTML Mode: render directly ──────────────────────────
  if (shouldRenderHtml) {
    return (
      <div
        className={cn(prose && "prose max-w-none", className)}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  // ── Non-HTML / Unknown Mode ─────────────────────────────
  const plainText = containsHtml ? stripHtml(htmlContent) : htmlContent;
  const displayText = truncateText(plainText, maxLength);

  return (
    <div className={className}>
      <div
        className={cn(prose && "prose max-w-none", "text-muted-foreground")}
      >
        {displayText}
      </div>

      {shouldShowTooltip && (
        <div className="mt-2">
          <button
            type="button"
            onClick={openPopup}
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Xem nội dung HTML
          </button>
        </div>
      )}

      {/* HTML Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePopup}
          />

          {/* Popup Content */}
          <div className="relative z-10 bg-card rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-lg font-semibold text-foreground">
                Nội dung HTML
              </h3>
              <button
                type="button"
                onClick={closePopup}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
