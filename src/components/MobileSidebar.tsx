"use client";

import { motion, useMotionValue, useAnimation } from "framer-motion";
import React, { useEffect, useState, useRef, useCallback } from "react";

interface MobileSidebarProps {
  width?: number; // default 300
  children: React.ReactNode;
  showTrigger?: boolean;
}

export function MobileSidebar({
  width = 300,
  children,
  showTrigger = true,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(-width);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const isDragging = useRef(false);
  const touchStartTime = useRef<number>(0);

  useEffect(() => {
    controls.start({
      x: open ? 0 : -width,
      transition: { type: "spring", stiffness: 400, damping: 25 },
    });
    document.body.style.overflow = open ? "hidden" : "";
  }, [open, width, controls]);

  const handleDragEnd = (
    _: any,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const shouldClose = info.offset.x < -width / 2 || info.velocity.x < -500;
    setOpen(!shouldClose);
  };

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEndWithReset = (
    event: any,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    handleDragEnd(event, info);
    // Reset dragging flag after a short delay to allow for touch events
    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  };

  const handleOutsideClick = useCallback(
    (event: TouchEvent | MouseEvent) => {
      if (!open || isDragging.current) return;

      const target = event.target as Element;

      // Don't close if clicking on the sidebar itself, close button, or hamburger
      if (
        sidebarRef.current?.contains(target) ||
        closeButtonRef.current?.contains(target) ||
        hamburgerRef.current?.contains(target)
      ) {
        return;
      }

      // For touch events, check if it's a quick tap (not a drag)
      if (event instanceof TouchEvent) {
        const touchDuration = Date.now() - touchStartTime.current;
        if (touchDuration > 300) return; // Ignore long touches (likely drags)
      }

      setOpen(false);
    },
    [open]
  );

  useEffect(() => {
    if (!open) return;

    const handleTouchStart = () => {
      touchStartTime.current = Date.now();
    };

    const handleClick = (event: MouseEvent) => handleOutsideClick(event);
    const handleTouchEnd = (event: TouchEvent) => handleOutsideClick(event);

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("click", handleClick, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [open, handleOutsideClick]);

  return (
    <>
      {/* narrow rail for swipe gesture */}
      {!open && (
        <div
          className="fixed left-0 top-0 h-full w-4 z-40"
          onClick={() => setOpen(true)}
        />
      )}
      {/* visible hamburger button */}
      {!open && showTrigger && (
        <button
          ref={hamburgerRef}
          className="fixed top-3 left-3 z-50 p-2 rounded-md bg-white/80 dark:bg-slate-800/80 shadow-md backdrop-blur-md"
          aria-label="Open sidebar"
          onClick={() => setOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 text-slate-800 dark:text-slate-200"
          >
            <path
              fillRule="evenodd"
              d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm.75 4.5a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
      {open && (
        <button
          ref={closeButtonRef}
          className="fixed top-3"
          style={{ left: width + 12 }}
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6 text-slate-800 dark:text-slate-200"
          >
            <path
              fillRule="evenodd"
              d="M4.546 4.546a.75.75 0 011.06 0L12 10.939l6.394-6.393a.75.75 0 111.06 1.06L13.061 12l6.393 6.394a.75.75 0 11-1.06 1.06L12 13.061l-6.394 6.393a.75.75 0 11-1.06-1.06L10.939 12 4.546 5.606a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
      <motion.div
        ref={sidebarRef}
        className="fixed top-0 left-0 h-full z-50"
        style={{ width, x }}
        drag="x"
        dragConstraints={{ left: -width, right: 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndWithReset}
        animate={controls}
      >
        <div className="h-full bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
          {/* close button moved outside */}
          {children}
        </div>
      </motion.div>
    </>
  );
}
