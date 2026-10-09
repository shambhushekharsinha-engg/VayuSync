import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { soundEngine } from '../utils/audio';

export interface LogEntry {
  timestamp: string;
  source: 'EVENTBRIDGE' | 'NASA_FIRMS' | 'OPEN_METEO' | 'LAMBDA' | 'DYNAMODB' | 'BEDROCK' | 'SNS' | 'SYSTEM';
  message: string;
  level?: 'INFO' | 'SUCCESS' | 'WARN' | 'CRITICAL';
}

interface TerminalLogProps {
  logs: LogEntry[];
  onClear?: () => void;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`transition-all duration-300 rounded-2xl border border-gray-800 bg-gray-950/95 backdrop-blur-md shadow-2xl overflow-hidden ${
      isExpanded ? 'h-52' : 'h-10'
    }`}>
      {/* Title Bar */}
      <div
        onClick={() => {
          soundEngine.playClick();
          setIsExpanded(!isExpanded);
        }}
        className="flex items-center justify-between px-3 py-2 bg-gray-900/90 border-b border-gray-800/80 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-green-400" />
          <span className="font-mono text-[11px] font-bold text-gray-200">
            AWS Pipeline Execution Trace <span className="text-gray-500">({logs.length} traces)</span>
          </span>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
        </div>

        <div className="flex items-center gap-2">
          {onClear && isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 hover:text-red-400 text-gray-500 transition-colors"
              title="Clear terminal logs"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
            {isExpanded ? 'Minimize' : 'Expand Trace'}
          </span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>

      {/* Log Output Stream */}
      {isExpanded && (
        <div
          ref={logContainerRef}
          className="p-3 font-mono text-[10px] space-y-1 h-40 overflow-y-auto leading-relaxed bg-black/50 select-text"
        >
          {logs.map((log, index) => {
            const colorClass =
              log.level === 'CRITICAL' ? 'text-red-400 font-bold' :
              log.level === 'SUCCESS' ? 'text-green-400 font-bold' :
              log.level === 'WARN' ? 'text-yellow-400' :
              'text-cyan-300';

            return (
              <div key={index} className="flex items-start gap-2 hover:bg-gray-900/50 py-0.5 px-1 rounded transition-colors">
                <span className="text-gray-600 flex-shrink-0">[{log.timestamp}]</span>
                <span className={`px-1 rounded text-[9px] font-bold flex-shrink-0 ${
                  log.source === 'BEDROCK' ? 'bg-purple-500/20 text-purple-300' :
                  log.source === 'EVENTBRIDGE' ? 'bg-blue-500/20 text-blue-300' :
                  log.source === 'SNS' ? 'bg-red-500/20 text-red-300' :
                  'bg-gray-800 text-gray-300'
                }`}>
                  {log.source}
                </span>
                <span className={`${colorClass} break-all`}>{log.message}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1 text-gray-500 pt-1">
            <span className="animate-pulse">▌</span>
            <span className="text-[9px]">Listening for EventBridge & Lambda triggers...</span>
          </div>
        </div>
      )}
    </div>
  );
};
