import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, BookOpen, ChevronLeft, ChevronRight, Terminal, Lightbulb } from 'lucide-react';
import { SQL_DICTIONARY } from '../lib/sqlDictionary';
import { cn } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLanguage } from '../context/LanguageContext';

interface SqlDictionaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlDictionaryPanel = React.memo<SqlDictionaryPanelProps>(({ isOpen, onClose }) => {
  const { isHe, dir } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredConcepts = Object.values(SQL_DICTIONARY).filter(concept => 
    concept.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    concept.definition.includes(searchQuery)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: dir === 'rtl' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: dir === 'rtl' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col border-slate-200",
              dir === 'rtl' ? "right-0 border-l" : "left-0 border-r"
            )}
            dir={dir}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{isHe ? "מילון SQL ביטוחי" : "Insurance SQL Glossary"}</h2>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">{isHe ? "למידה והבנה של פקודות ומושגים" : "Learn and understand commands and definitions"}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 bg-white border-b border-slate-50">
              <div className="relative">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", dir === 'rtl' ? "right-3" : "left-3")} />
                <input
                  type="text"
                  placeholder={isHe ? "חפש מושג או פקודה..." : "Search concept or command..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full py-2 bg-slate-100 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm",
                    dir === 'rtl' ? "pr-10 pl-4" : "pl-10 pr-4"
                  )}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {filteredConcepts.length > 0 ? (
                filteredConcepts.map((concept) => (
                  <motion.div
                    key={concept.term}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2">
                        <Terminal className="w-4 h-4 opacity-70" />
                        {concept.term}
                      </h3>
                    </div>
                    
                    <p className="text-slate-700 text-sm leading-relaxed mb-4">
                      {concept.definition}
                    </p>

                    {concept.example && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <Lightbulb className="w-3 h-3 text-amber-500" />
                          {isHe ? "דוגמה לשימוש" : "Example Usage"}
                        </div>
                        <div className="rounded-xl overflow-hidden text-xs">
                          <SyntaxHighlighter
                            language="sql"
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '1rem' }}
                          >
                            {concept.example}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                  <Search className="w-12 h-12 opacity-20" />
                  <p className="font-medium">{isHe ? "לא נמצאו מושגים תואמים" : "No matching concepts found"}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white text-center">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
              >
                {isHe ? "סגור מילון" : "Close Glossary"}
                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

SqlDictionaryPanel.displayName = 'SqlDictionaryPanel';
