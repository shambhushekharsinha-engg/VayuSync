import React, { useState, useEffect } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover' | 'mount';
  revealDirection?: 'start' | 'end' | 'center';
}

/**
 * DecryptedText — React Bits cybernetic / sensor telemetry decryption effect
 * Scrambles characters with stochastic cyber glyphs before locking onto satellite data.
 */
export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 40,
  maxIterations = 10,
  characters = '0123456789!@#$%^&*()_+-=<>?/~',
  className = '',
  parentClassName = '',
  encryptedClassName = 'text-orange-400 opacity-75 font-mono',
  animateOn = 'mount',
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isScrambling, setIsScrambling] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let iteration = 0;

    const startScramble = () => {
      setIsScrambling(true);
      iteration = 0;

      interval = setInterval(() => {
        setDisplayText(() =>
          text
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' ';
              if (index < iteration / (maxIterations / text.length)) {
                return text[index];
              }
              return characters[Math.floor(Math.random() * characters.length)];
            })
            .join('')
        );

        iteration++;

        if (iteration >= maxIterations) {
          clearInterval(interval);
          setDisplayText(text);
          setIsScrambling(false);
        }
      }, speed);
    };

    if (animateOn === 'mount' || (animateOn === 'hover' && isHovering)) {
      startScramble();
    }

    return () => clearInterval(interval);
  }, [text, speed, maxIterations, characters, animateOn, isHovering]);

  return (
    <span
      className={`inline-block select-none cursor-default ${parentClassName}`}
      onMouseEnter={() => animateOn === 'hover' && setIsHovering(true)}
      onMouseLeave={() => animateOn === 'hover' && setIsHovering(false)}
    >
      <span className={isScrambling ? encryptedClassName : className}>
        {displayText}
      </span>
    </span>
  );
};
