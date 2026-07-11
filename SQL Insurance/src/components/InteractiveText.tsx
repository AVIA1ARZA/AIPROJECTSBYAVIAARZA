import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SQL_DICTIONARY, SqlConcept } from '../lib/sqlDictionary';
import { BookOpen, X, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface InteractiveTextProps {
  text: string;
  className?: string;
}

const ConceptTooltip: React.FC<{ concept: SqlConcept; onClose: () => void; triggerRef: React.RefObject<HTMLElement> }> = ({ concept, onClose, triggerRef }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Calculate position relative to viewport
    const calculatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipHeight = 250; // Approximated max height
        
        let top = rect.bottom + 8;
        // If it goes off bottom, show above the trigger
        if (top + tooltipHeight > window.innerHeight) {
          top = rect.top - tooltipHeight - 8;
        }

        setCoords({
          top: Math.max(16, top),
          left: Math.max(16, Math.min(window.innerWidth - 336, rect.left - 100))
        });
      }
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [triggerRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      style={{ top: coords.top, left: coords.left }}
      className="fixed z-[101] w-80 bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden pointer-events-auto"
      dir="rtl"
    >
      <div className="bg-blue-600 px-4 py-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span className="font-bold text-sm">מושג SQL: {concept.term}</span>
        </div>
        <button onClick={onClose} className="hover:bg-blue-500 p-1 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-slate-700 text-sm leading-relaxed">
          {concept.definition}
        </p>
        
        {concept.example && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-600">
              <Play className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">דוגמה לשימוש</span>
            </div>
            <div className="rounded-lg overflow-hidden text-[11px] font-mono">
              <SyntaxHighlighter
                language="sql"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0.5rem' }}
              >
                {concept.example}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>
    </motion.div>
    </div>
  );
};

export const InteractiveText = React.memo<InteractiveTextProps>(({ text, className }) => {
  const [activeConcept, setActiveConcept] = useState<SqlConcept | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const [clickedTriggerRef, setClickedTriggerRef] = useState<React.RefObject<HTMLElement> | null>(null);

  // Sort keywords by length descending to match longer phrases first (e.g., "LEFT JOIN" before "JOIN")
  const keywords = Object.keys(SQL_DICTIONARY).sort((a, b) => b.length - a.length);
  
  // Create a regex pattern to match any of the keywords
  // We use word boundaries where possible, but for SQL keywords usually uppercase is a good hint
  // Also handle Hebrew context around keywords
  const pattern = new RegExp(`(${keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'gi');

  const parts = text.split(pattern);

  const handleConceptClick = (term: string, event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const concept = SQL_DICTIONARY[term.toUpperCase()] || 
                    Object.values(SQL_DICTIONARY).find(c => c.term.toUpperCase() === term.toUpperCase());
    
    if (concept) {
      setActiveConcept(concept);
      // We need a ref for the specific element clicked
      const target = event.currentTarget;
      setClickedTriggerRef({ current: target } as any);
    }
  };

  return (
    <>
      <span className={className}>
        {parts.map((part, index) => {
          const upperPart = part.toUpperCase();
          const conceptKey = keywords.find(k => k.toUpperCase() === upperPart);
          
          if (conceptKey) {
            return (
              <button
                key={index}
                onClick={(e) => handleConceptClick(conceptKey, e)}
                className="inline-block px-1 mx-0.5 rounded bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 border-b-2 border-blue-400/30 transition-colors cursor-help whitespace-nowrap"
              >
                {part}
              </button>
            );
          }
          return part;
        })}
      </span>

      <AnimatePresence>
        {activeConcept && clickedTriggerRef && (
          <ConceptTooltip 
            concept={activeConcept} 
            onClose={() => setActiveConcept(null)} 
            triggerRef={clickedTriggerRef}
          />
        )}
      </AnimatePresence>
    </>
  );
});

InteractiveText.displayName = 'InteractiveText';
