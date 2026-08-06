"use client";

import { useEffect, useState } from "react";

export type InlineArticle = {
  headline: string;
  summary?: string;
  source: string;
  url: string;
  datetime: number;
};

export function ArticleModal({ article, onClose }: { article: InlineArticle; onClose: () => void }) {
  const [content, setContent] = useState<{ text: string | null; status: "loading" | "ready" | "unavailable" }>({
    text: null,
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news/article?url=${encodeURIComponent(article.url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setContent(data.content ? { text: data.content, status: "ready" } : { text: null, status: "unavailable" });
      })
      .catch(() => {
        if (!cancelled) setContent({ text: null, status: "unavailable" });
      });
    return () => { cancelled = true; };
  }, [article.url]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8 bg-black/70" onClick={onClose}>
      <article className="bg-canvas border border-hairline-strong max-w-3xl w-full my-12" onClick={(e) => e.stopPropagation()}>
        <header className="px-7 py-4 border-b border-hairline-strong flex items-center justify-between gap-4">
          <div className="label label-muted-2"><span className="text-brand-deep mr-2">{article.source}</span>{new Date(article.datetime * 1000).toLocaleString("en-US")}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-7 h-7 border border-hairline-strong text-ink">✕</button>
        </header>
        <div className="px-7 py-7 max-h-[72vh] overflow-y-auto">
          <h2 className="font-display text-[28px] text-ink mb-5 leading-tight">{article.headline}</h2>
          {content.status === "loading" && <div className="py-12 text-center text-muted">Importing article…</div>}
          {content.status === "ready" && content.text && (
            <div className="max-w-[68ch] whitespace-pre-line text-[15px] text-body leading-[1.75]">
              {article.summary && <p className="text-ink font-medium mb-5">{article.summary}</p>}
              {content.text}
            </div>
          )}
          {content.status === "unavailable" && (
            <div className="py-10 text-center">
              <p className="text-muted text-sm mb-4">The publisher did not make the article body available for import.</p>
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="label text-brand-deep link-underline">Open in original portal →</a>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
