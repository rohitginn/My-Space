'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery() {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1024, isDesktop: width >= 1024 };
}
