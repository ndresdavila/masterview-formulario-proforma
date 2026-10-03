import { useLayoutEffect, useRef } from 'react';

export default function AutoTextarea({ style, value, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + border}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      style={{ ...style, resize: 'none', overflow: 'hidden' }}
    />
  );
}
