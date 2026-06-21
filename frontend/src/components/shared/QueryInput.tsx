import React, { useRef, useLayoutEffect } from "react";
import { Search } from "lucide-react";

interface QueryInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  containerClassName?: string;
}

export function QueryInput({ value, onChange, onEnter, containerClassName, placeholder, ...props }: QueryInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current && inputRef.current) {
      scrollRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  useLayoutEffect(() => {
    handleScroll();
  }, [value]);

  const renderHighlightedText = (text: string) => {
    // We match tokens like is:issue, state:open, author:abc
    // But what if they have quotes? e.g. label:"bug fix"
    // For simplicity, we highlight any word that comes right after a colon, up to the next space.
    // And if it has quotes, we just highlight the quotes as well.
    // Regex matches [key]:[value]
    const regex = /([^:\s]+):([^\s]+)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      const keyStr = match[1] + ":";
      const valStr = match[2];
      elements.push(
        <span key={`token-${match.index}`}>
          <span>{keyStr}</span>
          <span className="bg-[#ddf4ff] text-[#0969da] dark:bg-[#122b50] dark:text-[#58a6ff] rounded-[3px]">{valStr}</span>
        </span>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      elements.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }
    
    return elements;
  };

  return (
    <div className={`relative flex items-center overflow-hidden ${containerClassName || ""}`}>
      <Search size={15} className="absolute left-3 z-10 text-[var(--text-muted)] pointer-events-none" />
      
      {/* Background layer for highlights */}
      <div 
        ref={scrollRef}
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div 
          className="w-full h-full pl-9 pr-3 whitespace-pre font-sans text-sm text-[var(--text-primary)]"
          style={{ lineHeight: '36px' }}
        >
          {value ? renderHighlightedText(value) : <span className="text-[var(--text-muted)]">{placeholder}</span>}
        </div>
      </div>

      {/* Actual Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
          if (props.onKeyDown) {
            props.onKeyDown(e);
          }
        }}
        className="absolute inset-0 w-full h-full pl-9 pr-3 outline-none font-sans text-sm focus:ring-0 focus:outline-none"
        style={{ color: 'transparent', background: 'transparent', caretColor: 'var(--text-primary)' }}
        spellCheck={false}
        autoComplete="off"
        {...props}
        placeholder="" // Placeholder is handled by the background layer for perfect alignment
      />
    </div>
  );
}
