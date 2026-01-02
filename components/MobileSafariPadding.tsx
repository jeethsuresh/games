"use client";

import { useEffect, useState } from "react";

export default function MobileSafariPadding({ children }: { children: React.ReactNode }) {
  const [isMobileSafari, setIsMobileSafari] = useState(false);

  useEffect(() => {
    // Detect mobile Safari
    const checkMobileSafari = () => {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
      const isMobile = window.innerWidth <= 768; // Consider mobile if width <= 768px
      
      return isIOS && isSafari && isMobile;
    };

    setIsMobileSafari(checkMobileSafari());

    // Re-check on resize in case of orientation change
    const handleResize = () => {
      setIsMobileSafari(checkMobileSafari());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={isMobileSafari ? "pb-safe" : ""}>
      {children}
    </div>
  );
}

