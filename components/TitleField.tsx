"use client";

import { MAX_TITLE_LEN } from "@/lib/state";

type Props = {
  title: string;
  onChange: (next: string) => void;
};

export function TitleField({ title, onChange }: Props) {
  return (
    <div className="mb-8">
      <input
        type="text"
        value={title}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What are you deciding?"
        maxLength={MAX_TITLE_LEN}
        aria-label="Decision title"
        style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
        className="w-full bg-transparent font-medium tracking-[-0.02em] text-ink outline-none placeholder:font-medium placeholder:text-[#9A9A95]"
      />
      {title === "" && (
        <p className="mt-2 text-sm text-mute">
          Decide with weights, not vibes. Escape the Matrix.
        </p>
      )}
    </div>
  );
}
