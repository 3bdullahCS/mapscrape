import React from "react";
import { Star } from "lucide-react";

export function StarRating({ count, size = 14 }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= count ? "text-accent-amber fill-accent-amber" : "text-gray-700"}
        />
      ))}
    </span>
  );
}
