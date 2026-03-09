import { useEffect } from 'react';

const PREFIX = 'CampSight | ';

/**
 * Sets document.title with "CampSight | " prefix.
 * Pass a falsy value to show just "CampSight".
 */
export function useDocumentTitle(title: string | undefined | null): void {
  useEffect(() => {
    document.title = title ? `${PREFIX}${title}` : 'CampSight';
  }, [title]);
}
