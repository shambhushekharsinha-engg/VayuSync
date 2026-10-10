import React, { useState } from 'react';

interface TrueFocusProps {
  sentence?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
}

/**
 * TrueFocus — React Bits dynamic focus bracket effect
 * Directs visual focus over critical institutional threat descriptors.
 */
export const TrueFocus: React.FC<TrueFocusProps> = ({
  sentence = 'PREEMPTIVE DISPERSION SAFETY ENGINE',
  blurAmount = 3,
  borderColor = '#f97316',
  glowColor = 'rgba(249, 115, 22, 0.4)',
  className = '',
}) => {
  const words = sentence.split(' ');
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className={`relative flex flex-wrap items-center gap-2 select-none ${className}`}>
      {words.map((word, index) => {
        const isCurrent = index === currentIndex;

        return (
          <span
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`relative px-2 py-0.5 rounded cursor-pointer transition-all duration-300 font-bold ${
              isCurrent ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{
              filter: isCurrent ? 'none' : `blur(${blurAmount * 0.3}px)`,
              opacity: isCurrent ? 1 : 0.65,
            }}
          >
            {word}

            {/* Target Reticle Brackets */}
            {isCurrent && (
              <span
                className="absolute inset-0 rounded pointer-events-none transition-all duration-300"
                style={{
                  border: `1.5px solid ${borderColor}`,
                  boxShadow: `0 0 12px ${glowColor}`,
                }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
};
