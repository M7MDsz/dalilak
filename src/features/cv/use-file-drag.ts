"use client";
// Owner: cv. `drop-accept` (spec 3.6): the drop zone wakes when a file is dragged into the WINDOW, and takes it when it is
// dropped on the zone. A depth counter over the window's drag events (dragenter/dragleave fire for every child); a file
// dropped outside the zone is swallowed, so the browser never navigates away to open it.
import { useEffect, useRef, useState, type DragEvent } from "react";

export type DragState = "idle" | "window" | "zone";

const hasFiles = (event: globalThis.DragEvent | DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

export function useFileDrag(onFile: (file: File) => void, enabled = true) {
  const [state, setState] = useState<DragState>("idle");
  const depth = useRef(0);
  const take = useRef(onFile);
  useEffect(() => {
    take.current = onFile;
  });

  useEffect(() => {
    if (!enabled) return;
    const enter = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current += 1;
      setState((s) => (s === "idle" ? "window" : s));
    };
    const leave = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setState("idle");
    };
    const over = (event: globalThis.DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const drop = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setState("idle");
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      depth.current = 0;
    };
  }, [enabled]);

  const zone = {
    onDragOver: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setState("zone");
    },
    onDragLeave: (event: DragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setState(depth.current > 0 ? "window" : "idle");
    },
    onDrop: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setState("idle");
      const file = event.dataTransfer.files[0];
      if (file) take.current(file);
    },
  };

  return { state, zone };
}
