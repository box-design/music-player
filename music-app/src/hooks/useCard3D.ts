import { useRef, useCallback, useState, useEffect } from 'react';

export interface Card3DStyle {
  style: React.CSSProperties;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Performant 3D card effect — writes CSS vars directly to the DOM
 * on mousemove (zero React re-renders), using state only for press.
 */
export function useCard3D(
  options: {
    maxTilt?: number;       // degrees, default 10
    maxPressTilt?: number;  // degrees when pressed, default 15
  } = {}
): Card3DStyle {
  const { maxTilt = 10, maxPressTilt = 14 } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const isHovering = useRef(false);

  const reset = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty('--card-rotate-x', '0deg');
    el.style.setProperty('--card-rotate-y', '0deg');
    el.style.setProperty('--card-scale', '1');
    el.style.setProperty('--card-mouse-x', '50%');
    el.style.setProperty('--card-mouse-y', '50%');
    // dynamic shadow
    el.style.setProperty('--card-shadow-x', '0px');
    el.style.setProperty('--card-shadow-y', '6px');
    isHovering.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const el = containerRef.current;
      if (el) reset();
    };
  }, [reset]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;   // 0..1
      const y = (e.clientY - rect.top) / rect.height;   // 0..1

      const tilt = isPressed ? maxPressTilt : maxTilt;
      const rotateY = (x - 0.5) * tilt * 2;       // -tilt .. +tilt
      const rotateX = (y - 0.5) * -tilt * 2;      // +tilt when mouse at bottom

      const scale = isPressed ? 0.97 : 1.02;

      el.style.setProperty('--card-rotate-x', `${rotateX.toFixed(2)}deg`);
      el.style.setProperty('--card-rotate-y', `${rotateY.toFixed(2)}deg`);
      el.style.setProperty('--card-scale', scale.toFixed(3));
      el.style.setProperty('--card-mouse-x', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--card-mouse-y', `${(y * 100).toFixed(1)}%`);

      // dynamic shadow offset (opposite to tilt — light from top-left)
      el.style.setProperty('--card-shadow-x', `${(rotateY * -0.5).toFixed(1)}px`);
      el.style.setProperty('--card-shadow-y', `${(rotateX * -0.5 + 6).toFixed(1)}px`);

      if (!isHovering.current) {
        isHovering.current = true;
      }
    },
    [isPressed, maxTilt, maxPressTilt]
  );

  const onMouseLeave = useCallback(() => {
    setIsPressed(false);
    const el = containerRef.current;
    if (!el) return;
    // Smooth reset via CSS transition
    el.style.setProperty('--card-rotate-x', '0deg');
    el.style.setProperty('--card-rotate-y', '0deg');
    el.style.setProperty('--card-scale', '1');
    el.style.setProperty('--card-mouse-x', '50%');
    el.style.setProperty('--card-mouse-y', '50%');
    el.style.setProperty('--card-shadow-x', '0px');
    el.style.setProperty('--card-shadow-y', '6px');
    isHovering.current = false;
  }, []);

  const onMouseDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  const onMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Compose dynamic shadow into style
  const style: React.CSSProperties = {
    boxShadow: `var(--card-shadow-x, 0px) var(--card-shadow-y, 6px) 28px rgba(0,0,0,0.15)`,
  };

  return { style, onMouseMove, onMouseLeave, onMouseDown, onMouseUp, containerRef };
}
