import type { CSSProperties } from "react";

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className ? `a-icon ${className}` : "a-icon"} aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}

/** Staggers a data-reveal element among its siblings. */
export const revealIndex = (index: number) => ({ "--reveal-index": index }) as CSSProperties;

export function Stars() {
  return (
    <p className="v2-stars" role="img" aria-label="Rated 5 out of 5">
      {[1, 2, 3, 4, 5].map((n) => <Icon name="star-fill" key={n} />)}
    </p>
  );
}

/** Slot for a video the client has not supplied yet. */
export function VideoPlaceholder({ label, index }: { label: string; index: number }) {
  return (
    <div className="v2-video" role="img" aria-label={`Video placeholder: ${label}`} data-reveal="zoom" style={revealIndex(index)}>
      <span className="v2-video__play" aria-hidden="true"><Icon name="play-fill" className="a-icon--32" /></span>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

/** Slot for a photo the client has not supplied yet. */
export function PhotoPlaceholder({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <div className={wide ? "a-photo a-photo--16x9" : "a-photo"} role="img" aria-label={`Photo placeholder: ${label}`}>
      <div className="a-photo__placeholder" aria-hidden="true">
        <svg className="a-illus a-illus--64"><use href="#illus-documents" /></svg>
        <span>Photo: {label}</span>
      </div>
    </div>
  );
}
