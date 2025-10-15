"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { signOut } from "next-auth/react";

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
  logo: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
}

const PillNav: React.FC<PillNavProps> = ({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#fff",
  pillColor = "#060010",
  hoveredPillTextColor = "#060010",
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
}) => {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false); // 👈 navbar visibility

  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | HTMLElement | null>(null);

  /* ---------------- Handle Scroll Hide/Show ---------------- */
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const updateScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 50) {
        setHidden(true); // hide
      } else {
        setHidden(false); // show
      }
      lastScrollY = window.scrollY;
    };
    window.addEventListener("scroll", updateScroll);
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  /* ---------------- Setup Animations ---------------- */
  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;
        const pill = circle.parentElement as HTMLElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector<HTMLElement>(".pill-label");
        const white = pill.querySelector<HTMLElement>(".pill-label-hover");

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" }, 0);
        }
        tlRefs.current[index] = tl;
      });
    };

    layout();
    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if (document.fonts) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: "auto" });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: "auto" });
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, { rotate: 360, duration: 0.2, ease, overwrite: "auto" });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    onMobileMenuClick?.();
  };

  const cssVars = {
    ["--base"]: baseColor,
    ["--pill-bg"]: pillColor,
    ["--hover-text"]: hoveredPillTextColor,
    ["--pill-text"]: resolvedPillTextColor,
    ["--nav-h"]: "48px",
    ["--logo"]: "36px",
    ["--pill-pad-x"]: "18px",
    ["--pill-gap"]: "3px",
  } as React.CSSProperties;

  /* ---------------- NavBar ---------------- */
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[1000] transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <nav
        className={`w-full flex items-center justify-between box-border px-4 md:px-8 ${className}`}
        aria-label="Primary"
        style={cssVars}
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="Home"
          onMouseEnter={handleLogoEnter}
          ref={(el) => {
            logoRef.current = el;
          }}
          className="rounded-full p-2 inline-flex items-center justify-center overflow-hidden"
          style={{ width: "var(--nav-h)", height: "var(--nav-h)", background: "var(--base, #000)" }}
        >
          <Image
            src={logo}
            alt={logoAlt}
            ref={logoImgRef}
            width={36}
            height={36}
            className="w-full h-full object-contain block"
          />
        </Link>

        {/* Desktop Nav Full Width */}
        <div
          ref={navItemsRef}
          className="relative items-center rounded-full hidden md:flex ml-2 flex-1"
          style={{ height: "var(--nav-h)", background: "var(--base, #000)" }}
        >
          <ul
            role="menubar"
            className="list-none flex items-stretch justify-between m-0 p-[3px] h-full w-full"
          >
            {items.map((item, i) => {
              const isActive = activeHref === item.href;
              const pillStyle: React.CSSProperties = {
                background: "var(--pill-bg, #fff)",
                color: "var(--pill-text, var(--base, #000))",
                paddingLeft: "var(--pill-pad-x)",
                paddingRight: "var(--pill-pad-x)",
              };

              const PillContent = (
                <>
                  <span
                    className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none"
                    style={{ background: "var(--base, #000)" }}
                    aria-hidden="true"
                    ref={(el) => {
                      circleRefs.current[i] = el;
                    }}
                  />
                  <span className="label-stack relative inline-block leading-[1] z-[2]">
                    <span className="pill-label relative z-[2] inline-block leading-[1]">{item.label}</span>
                    <span
                      className="pill-label-hover absolute left-0 top-0 z-[3] inline-block"
                      style={{ color: "var(--hover-text, #fff)" }}
                      aria-hidden="true"
                    >
                      {item.label}
                    </span>
                  </span>
                  {isActive && (
                    <span className="absolute left-1/2 -bottom-[6px] -translate-x-1/2 w-3 h-3 rounded-full z-[4]" style={{ background: "var(--base, #000)" }} />
                  )}
                </>
              );

              const basePillClasses =
                "relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-semibold text-[16px] uppercase cursor-pointer w-full transition-colors duration-200";

              if (item.label === "Sign Out") {
                return (
                  <li key={item.href} className="flex h-full flex-1">
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className={basePillClasses}
                      style={pillStyle}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                    >
                      {PillContent}
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.href} className="flex h-full flex-1">
                  <Link
                    href={item.href}
                    className={basePillClasses}
                    style={pillStyle}
                    aria-label={item.ariaLabel || item.label}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                  >
                    {PillContent}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mobile Hamburger */}
        <button
          ref={hamburgerRef}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          className="md:hidden rounded-full flex flex-col items-center justify-center gap-1 cursor-pointer p-0 relative"
          style={{ width: "var(--nav-h)", height: "var(--nav-h)", background: "var(--base, #000)" }}
        >
          <span className="hamburger-line w-4 h-0.5 rounded" style={{ background: "var(--pill-bg, #fff)" }} />
          <span className="hamburger-line w-4 h-0.5 rounded" style={{ background: "var(--pill-bg, #fff)" }} />
        </button>
      </nav>
    </div>
  );
};

export default PillNav;
