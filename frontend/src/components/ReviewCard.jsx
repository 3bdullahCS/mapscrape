import React from "react";
import { StarRating } from "./StarRating";

export function ReviewCard({ review, index }) {
  return (
    <div
      className="p-4 rounded-xl border border-white/5 bg-white/[0.02] animate-review-pop"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-semibold text-gray-400">
          {review.author || "Anonymous"}
        </span>
        <StarRating count={review.rating} size={13} />
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{review.text}</p>
      {review.date && (
        <span className="text-xs text-gray-600 mt-2 block">{review.date}</span>
      )}
    </div>
  );
}
