/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  ReactNode,
  useLayoutEffect,
  useRef,
  useCallback,
  useEffect,
} from "react";
import Lenis from "lenis";

/* ====================== Item ====================== */
export interface ScrollStackItemProps {
  itemClassName?: string;
  children: ReactNode;
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({
  children,
  itemClassName = "",
}) => (
  <div
    className={[
      "scroll-stack-card relative w-full my-8 p-12 rounded-[32px]",
      "shadow-[0_6px_24px_rgba(0,0,0,0.08)]",
      "box-border origin-top will-change-transform",
      "min-h-[22rem]",
      itemClassName,
    ].join(" ")}
    style={{
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      contain: "paint",
    }}
  >
    {children}
  </div>
);

/* ====================== Stack ====================== */
interface ScrollStackProps {
  className?: string;
  children?: ReactNode;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;     // e.g. "20%"
  scaleEndPosition?: string;  // e.g. "10%"
  baseScale?: number;
  rotationAmount?: number;
  blurAmount?: number;        // kept for API compat (not used during scroll)
  useWindowScroll?: boolean;
  endPaddingRem?: number;     // minimum padding at the end (in rem)
  /** Cap the tail spacer as a fraction of viewport height (0..1). */
  tailMaxVh?: number;
  onStackComplete?: () => void;
}

const ScrollStack: React.FC<ScrollStackProps> = ({
  children,
  className = "",
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = "20%",
  scaleEndPosition = "10%",
  baseScale = 0.85,
  rotationAmount = 0,
  blurAmount = 0, // eslint-disable-line @typescript-eslint/no-unused-vars
  useWindowScroll = false,
  endPaddingRem = 16,
  tailMaxVh = 0.4,
  onStackComplete,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const cardsRef = useRef<HTMLElement[]>([]);
  const cardOffsetsRef = useRef<number[]>([]);
  const endElRef = useRef<HTMLElement | null>(null);
  const endOffsetRef = useRef<number>(0);

  const rafIdRef = useRef<number | null>(null);
  const lastTransformsRef = useRef(
    new Map<number, { translateY: number; scale: number; rotation: number }>()
  );
  const stackCompletedRef = useRef(false);

  /* ---------- helpers ---------- */
  const parsePercentage = useCallback((value: string | number, containerHeight: number) => {
    if (typeof value === "string" && value.includes("%")) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value as string);
  }, []);

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      const y = typeof window !== "undefined" ? window.scrollY : 0;
      const h = typeof window !== "undefined" ? window.innerHeight : 0;
      return { scrollTop: y, containerHeight: h };
    } else {
      const scroller = scrollerRef.current!;
      return {
        scrollTop: scroller ? scroller.scrollTop : 0,
        containerHeight: scroller ? scroller.clientHeight : 0,
      };
    }
  }, [useWindowScroll]);

  const getElementOffset = useCallback(
    (el: HTMLElement) => {
      if (useWindowScroll) {
        const rect = el.getBoundingClientRect();
        const y = typeof window !== "undefined" ? window.scrollY : 0;
        return rect.top + y; // SSR-safe
      } else {
        // offset relative to the scroller wrapper
        let offset = 0;
        let node: HTMLElement | null = el;
        while (node && node !== scrollerRef.current) {
          offset += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return offset;
      }
    },
    [useWindowScroll]
  );

  /* ---------- measure once, and when layout changes ---------- */
  const measure = useCallback(() => {
    const root: ParentNode =
      useWindowScroll ? document : (scrollerRef.current as HTMLDivElement);
    if (!root) return;

    cardsRef.current = Array.from(
      root.querySelectorAll(".scroll-stack-card")
    ) as HTMLElement[];

    // Apply static styles + spacing
    cardsRef.current.forEach((card, i) => {
      if (i < cardsRef.current.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.transformOrigin = "top center";
      card.style.willChange = "transform";
      (card.style as any).translate = "0 0"; // compositor hint
    });

    // Cache offsets to avoid layout reads during scroll
    cardOffsetsRef.current = cardsRef.current.map((el) => getElementOffset(el));

    endElRef.current = (useWindowScroll
      ? document.querySelector(".scroll-stack-end")
      : scrollerRef.current?.querySelector(".scroll-stack-end")) as HTMLElement | null;

    endOffsetRef.current = endElRef.current ? getElementOffset(endElRef.current) : 0;

    // reset last transforms so first update paints correctly
    lastTransformsRef.current.clear();
  }, [getElementOffset, itemDistance, useWindowScroll]);

  /* ---------- compute transforms ---------- */
  const compute = useCallback(() => {
    if (cardsRef.current.length === 0) return;

    const { scrollTop, containerHeight } = getScrollData();
    const stackPosPx = parsePercentage(stackPosition, containerHeight);
    const scaleEndPx = parsePercentage(scaleEndPosition, containerHeight);
    const endTop = endOffsetRef.current;

    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    cardsRef.current.forEach((card, i) => {
      const cardTop = cardOffsetsRef.current[i];

      const triggerStart = cardTop - stackPosPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPx;
      const pinStart = cardTop - stackPosPx - itemStackDistance * i;
      const pinEnd = endTop - containerHeight / 2;

      const t = clamp01(
        (scrollTop - triggerStart) / Math.max(1, triggerEnd - triggerStart)
      );
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - t * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * t : 0;

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
      if (isPinned) {
        translateY = scrollTop - cardTop + stackPosPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPosPx + itemStackDistance * i;
      }

      const next = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
      };
      const prev = lastTransformsRef.current.get(i);

      if (
        !prev ||
        Math.abs(prev.translateY - next.translateY) > 0.1 ||
        Math.abs(prev.scale - next.scale) > 0.001 ||
        Math.abs(prev.rotation - next.rotation) > 0.1
      ) {
        card.style.transform = `translate3d(0, ${next.translateY}px, 0) scale(${next.scale}) rotate(${next.rotation}deg)`;
        lastTransformsRef.current.set(i, next);
      }

      // completion when last card is in its pin range
      if (i === cardsRef.current.length - 1) {
        const inView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (inView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!inView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });
  }, [
    baseScale,
    itemScale,
    itemStackDistance,
    onStackComplete,
    parsePercentage,
    getScrollData,
    rotationAmount,
    scaleEndPosition,
    stackPosition,
  ]);

  /* ---------- rAF loop: drive Lenis + compute ---------- */
  useEffect(() => {
    const frame = (time: number) => {
      if (lenisRef.current) lenisRef.current.raf(time);
      compute();
      rafIdRef.current = requestAnimationFrame(frame);
    };
    rafIdRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [compute]);

  /* ---------- setup Lenis + listeners ---------- */
  useEffect(() => {
    let lenis: Lenis | null = null;

    if (useWindowScroll) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        syncTouch: true,
      });
      lenisRef.current = lenis;
    } else {
      const scroller = scrollerRef.current!;
      lenis = new Lenis({
        wrapper: scroller,
        content: scroller.querySelector(".scroll-stack-inner") as HTMLElement,
        duration: 1.1,
        easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        syncTouch: true,
      });
      lenisRef.current = lenis;
    }

    const onResize = () => measure();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize);
    }

    return () => {
      if (lenisRef.current) lenisRef.current.destroy();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize);
      }
    };
  }, [measure, useWindowScroll]);

  /* ---------- measure on mount and when cards/end change ---------- */
  useLayoutEffect(() => {
    if (!useWindowScroll && !scrollerRef.current) return;
    measure();

    const ro = new ResizeObserver(() => {
      measure();
    });
    cardsRef.current.forEach((el) => ro.observe(el));
    if (endElRef.current) ro.observe(endElRef.current);

    return () => {
      ro.disconnect();
      lastTransformsRef.current.clear();
    };
  }, [
    measure,
    useWindowScroll,
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
  ]);

  /* ---------- dynamic spacer height with clamp (SSR-safe) ---------- */
  const computeSpacerPx = (): number => {
    const { containerHeight } = getScrollData(); // SSR-safe (0 on server)
    const n = cardsRef.current.length;
    if (n <= 0) return Math.max(containerHeight * 0.5, endPaddingRem * 16);

    // distance between cards + stacking displacement + smaller viewport fraction
    const base =
      Math.max(0, n - 1) * (itemDistance + itemStackDistance) +
      containerHeight * 0.5; // reduced from 0.75 to help shorten tail

    const minPx = endPaddingRem * 16; // rem -> px
    const maxPx = Math.max(containerHeight * tailMaxVh, minPx); // clamp to vh cap
    return Math.min(Math.max(base || 0, minPx), maxPx);
  };

  const usingWindow = useWindowScroll;

  return (
    <div
      className={[
        "relative w-full",
        usingWindow ? "h-auto overflow-visible" : "h-full overflow-y-auto",
        className,
      ].join(" ")}
      ref={usingWindow ? undefined : scrollerRef}
      style={{
        // keep styles minimal in window mode; let the page own scrolling
        WebkitOverflowScrolling: usingWindow ? "auto" : "touch",
      }}
    >
      <div
        className="scroll-stack-inner pt-[20vh] px-6 md:px-12 lg:px-20"
        style={{ minHeight: "calc(100vh + 1px)" }} // ensure > 100vh so window can scroll
      >
        {children}
        {/* Spacer so the last pin can release cleanly */}
        <div
          className="scroll-stack-end w-full"
          style={{ height: `${computeSpacerPx()}px` }}
        />
      </div>
    </div>
  );
};

export default ScrollStack;
