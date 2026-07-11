import React, { useState, useEffect, useMemo } from 'react';
import { Bookmark, BookmarkCheck, Search, Trash2, Highlighter, Filter, Calendar, Sparkles, BookMarked, Layers, Clock, RotateCcw, FileText, ExternalLink } from 'lucide-react';
import { auth, SavedTip, getSavedTips, deleteSavedTip, updateSavedTip, db, loginWithGoogle, getAccessToken } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

const HIGHLIGHTER_COLORS = [
  { key: 'yellow', label: 'צהוב', bg: 'bg-yellow-200', border: 'border-yellow-400', hoverBg: 'hover:bg-yellow-300', text: 'text-yellow-800' },
  { key: 'pink', label: 'ורוד', bg: 'bg-pink-200', border: 'border-pink-400', hoverBg: 'hover:bg-pink-300', text: 'text-pink-800' },
  { key: 'orange', label: 'כתום', bg: 'bg-orange-200', border: 'border-orange-400', hoverBg: 'hover:bg-orange-300', text: 'text-orange-800' },
  { key: 'blue', label: 'תכלת', bg: 'bg-sky-200', border: 'border-sky-400', hoverBg: 'hover:bg-sky-300', text: 'text-sky-800' },
  { key: 'green', label: 'ירוק', bg: 'bg-emerald-250', border: 'border-emerald-400', hoverBg: 'hover:bg-emerald-300', text: 'text-emerald-800' },
];

interface ParsedHighlight {
  raw: string;
  text: string;
  color: string;
}

const parseHighlight = (h: string): ParsedHighlight => {
  if (typeof h !== 'string') return { raw: String(h), text: String(h), color: 'yellow' };
  const match = h.match(/^(yellow|pink|orange|blue|green):::(.*)$/s);
  if (match) {
    return {
      raw: h,
      color: match[1],
      text: match[2]
    };
  }
  return {
    raw: h,
    text: h,
    color: 'yellow'
  };
};

const serializeHighlight = (text: string, color: string): string => {
  return `${color}:::${text}`;
};

const splitIntoClickableSentences = (text: string): string[] => {
  if (!text) return [];
  // Matches sentences ending with periods, question marks, exclamation marks, etc. or paragraphs
  const regex = /([^\.!\?\n\r]+[\.!\?]*)/g;
  const matches = text.match(regex);
  if (!matches) return [text];
  return matches.map(s => s.trim()).filter(s => s.length > 0);
};

interface SavedMaterialsViewProps {
  onNavigateToTab?: (tab: any) => void;
  completedCount?: number;
}

export const SavedMaterialsView: React.FC<SavedMaterialsViewProps> = ({ onNavigateToTab, completedCount }) => {
  const { isHe, dir } = useLanguage();
  const [savedTips, setSavedTips] = useState<SavedTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [highlighterColor, setHighlighterColor] = useState('yellow');
  const [activeSelection, setActiveSelection] = useState<{ tipId: string; selectedText: string } | null>(null);
  const [markingMode, setMarkingMode] = useState<'sentence' | 'free'>('sentence');

  const [exportingGroups, setExportingGroups] = useState<{ [groupId: string]: boolean }>({});
  const [exportedDocUrls, setExportedDocUrls] = useState<{ [groupId: string]: string }>({});
  const [exportErrors, setExportErrors] = useState<{ [groupId: string]: string }>({});

  const handleExportToGoogleDocs = async (groupId: string, groupTitle: string, groupTips: SavedTip[]) => {
    setExportingGroups(prev => ({ ...prev, [groupId]: true }));
    setExportErrors(prev => ({ ...prev, [groupId]: '' }));
    setExportedDocUrls(prev => ({ ...prev, [groupId]: '' }));

    try {
      // 1. Check if token is available
      let accessToken = getAccessToken();
      
      if (!accessToken) {
        // Re-authenticate
        await loginWithGoogle();
        accessToken = getAccessToken();
        if (!accessToken) {
          throw new Error(isHe ? 'לא התקבל מפתח אבטחה של גוגל מ-Sign In' : 'Failed to retrieve Google Access Token');
        }
      }

      // 2. Create the document metadata
      const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: isHe ? `סיכום שמירות - ${groupTitle}` : `Saved Summary - ${groupTitle}`
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || (isHe ? 'שגיאה ביצירת המסמך' : 'Failed to create Document'));
      }

      const createData = await createResponse.json();
      const documentId = createData.documentId;

      // 3. Construct the text content
      let documentText = "";
      documentText += `======================================================\n`;
      documentText += isHe ? `📝 סיכום שמירות: ${groupTitle}\n` : `📝 Saved Summary: ${groupTitle}\n`;
      documentText += isHe ? `📅 תאריך: ${new Date().toLocaleDateString('he-IL')}\n` : `📅 Date: ${new Date().toLocaleDateString()}\n`;
      documentText += `======================================================\n\n`;

      groupTips.forEach((tip, idx) => {
        const timeStr = tip.savedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const categoryLabel = tip.category === 'weakness' ? (isHe ? '🔍 נושא לחיזוק' : '🔍 Weakness') :
                              tip.category === 'recommendation' ? (isHe ? '💡 המלצה אישית' : '💡 Recommendation') :
                              (isHe ? '📌 טיפ כללי' : '📌 General Tip');

        documentText += `📍 ${isHe ? 'פריט' : 'Item'} #${idx + 1} | ${categoryLabel} (${timeStr})\n`;
        documentText += `------------------------------------------------------\n`;
        documentText += `${tip.text}\n\n`;
      });

      documentText += isHe ? `\n\nמסמך זה יוצר על ידי ה-AI SQL Assistant.` : `\n\nThis document was generated by AI SQL Assistant.`;

      // 4. Update the document content with batchUpdate
      const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: documentText
              }
            }
          ]
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || (isHe ? 'שגיאה בעדכון תוכן המסמך' : 'Failed to update Document content'));
      }

      // Success! Keep the link
      const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      setExportedDocUrls(prev => ({ ...prev, [groupId]: docUrl }));
    } catch (error: any) {
      console.error("Error exporting to Google Docs:", error);
      setExportErrors(prev => ({ ...prev, [groupId]: error?.message || String(error) }));
    } finally {
      setExportingGroups(prev => ({ ...prev, [groupId]: false }));
    }
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);
        const q = query(
          collection(db, 'saved_tips'),
          where('userId', '==', user.uid)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const tips = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId,
              text: data.text,
              category: data.category,
              sourceId: data.sourceId,
              sourceTitle: data.sourceTitle,
              sourceType: data.sourceType,
              savedAt: data.savedAt?.toDate() || new Date(),
              highlightedLines: data.highlightedLines || []
            } as SavedTip;
          });

          // Sort in memory by savedAt descending to bypass Firestore composite index requirements
          const sortedTips = tips.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
          setSavedTips(sortedTips);
          setLoading(false);
        }, (error) => {
          console.error("Error subscribing to saved tips snapshot:", error);
          setLoading(false);
        });
      } else {
        setSavedTips([]);
        setLoading(false);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = undefined;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const handleDeleteSavedTip = async (id: string) => {
    try {
      await deleteSavedTip(id);
      if (activeSelection?.tipId === id) {
        setActiveSelection(null);
      }
    } catch (error) {
      console.error("Error deleting saved material:", error);
    }
  };

  const handleToggleLineHighlight = async (tipId: string, lineText: string, chosenColor?: string) => {
    const tip = savedTips.find(t => t.id === tipId);
    if (!tip) return;

    const currentHighlights = tip.highlightedLines || [];
    let updatedHighlights: string[];

    const parsed = currentHighlights.map(h => parseHighlight(h));
    const exists = parsed.find(p => p.text === lineText);

    if (exists) {
      updatedHighlights = currentHighlights.filter(h => {
        const parsedH = parseHighlight(h);
        return parsedH.text !== lineText;
      });
    } else {
      const color = chosenColor || highlighterColor;
      const serialized = serializeHighlight(lineText, color);
      updatedHighlights = [...currentHighlights, serialized];
    }

    // Snappy UI update
    setSavedTips(prev => prev.map(t => t.id === tipId ? { ...t, highlightedLines: updatedHighlights } : t));

    try {
      await updateSavedTip(tipId, { highlightedLines: updatedHighlights });
    } catch (error) {
      console.error("Error saving highlight to Firebase:", error);
    }
  };

  const handleTextSelection = (tipId: string) => {
    const selection = window.getSelection();
    if (!selection) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length > 1) {
      const tip = savedTips.find(t => t.id === tipId);
      if (tip && tip.text.includes(selectedText)) {
        setActiveSelection({ tipId, selectedText });
      }
    }
  };

  const clearSelection = () => {
    setActiveSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection) return;
      const selectedText = selection.toString().trim();

      if (selectedText && selectedText.length > 1) {
        const matchingTip = savedTips.find(t => t.text.includes(selectedText));
        if (matchingTip) {
          setActiveSelection({ tipId: matchingTip.id, selectedText });
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [savedTips]);

  useEffect(() => {
    if (!activeSelection) return;

    const handleGlobalClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('.saved-tip-card') ||
        target.closest('.selection-helper-menu')
      ) {
        return;
      }
      clearSelection();
    };

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [activeSelection]);

  const renderTextWithHighlights = (tipId: string, text: string, highlights: string[]) => {
    const parsedHighlights = (highlights || []).map(h => parseHighlight(h));
    
    if (markingMode === 'sentence') {
      const sentences = splitIntoClickableSentences(text);
      let globalIndex = 0;

      return (
        <span className="leading-relaxed font-semibold transition-all flex flex-wrap gap-x-1.5 gap-y-1 text-slate-800">
          {sentences.map((sentence, idx) => {
            const sentenceStart = text.indexOf(sentence, globalIndex);
            const sentenceEnd = sentenceStart !== -1 ? sentenceStart + sentence.length : globalIndex + sentence.length;
            if (sentenceStart !== -1) globalIndex = sentenceEnd;

            // Find all highlights that intersect this sentence
            const relevantHighlights = parsedHighlights.filter(ph => {
              const hStart = text.indexOf(ph.text);
              if (hStart === -1) return false;
              const hEnd = hStart + ph.text.length;
              const sStart = sentenceStart !== -1 ? sentenceStart : text.indexOf(sentence);
              const sEnd = sStart + sentence.length;
              return Math.max(sStart, hStart) < Math.min(sEnd, hEnd);
            });

            if (relevantHighlights.length === 0) {
              const activeColorData = HIGHLIGHTER_COLORS.find(c => c.key === highlighterColor) || HIGHLIGHTER_COLORS[0];
              return (
                <span
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLineHighlight(tipId, sentence, highlighterColor);
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded-lg transition-all cursor-pointer inline-block text-slate-700 border border-transparent hover:text-slate-950",
                    "hover:bg-slate-200/50 hover:border-slate-300 hover:scale-[1.01] active:scale-95"
                  )}
                  title={isHe ? `לחץ לסימון מהיר ב${activeColorData.label} 🖍️` : `Click to quick highlight in ${activeColorData.label} 🖍️`}
                >
                  {sentence}
                </span>
              );
            }

            // If there ARE highlights, we need to render the sentence with its internal highlights
            // But some highlights might span multiple sentences. We'll render the part of the highlight that's in THIS sentence.
            
            interface Chunk {
              start: number;
              end: number;
              text: string;
              color?: string;
            }
            
            let chunks: Chunk[] = [{ start: 0, end: sentence.length, text: sentence }];
            
            relevantHighlights.forEach(ph => {
              const hStartInGlobal = text.indexOf(ph.text);
              const hEndInGlobal = hStartInGlobal + ph.text.length;
              const sStartInGlobal = sentenceStart !== -1 ? sentenceStart : text.indexOf(sentence);
              const sEndInGlobal = sStartInGlobal + sentence.length;
              
              const hStartInSentence = Math.max(0, hStartInGlobal - sStartInGlobal);
              const hEndInSentence = Math.min(sentence.length, hEndInGlobal - sStartInGlobal);
              const hTextInSentence = sentence.substring(hStartInSentence, hEndInSentence);
              
              if (hStartInSentence < hEndInSentence) {
                // Split existing chunks
                let newChunks: Chunk[] = [];
                chunks.forEach(chunk => {
                  if (hStartInSentence >= chunk.end || hEndInSentence <= chunk.start) {
                    newChunks.push(chunk);
                  } else {
                    // Overlap!
                    if (hStartInSentence > chunk.start) {
                      newChunks.push({ start: chunk.start, end: hStartInSentence, text: sentence.substring(chunk.start, hStartInSentence) });
                    }
                    newChunks.push({ 
                      start: Math.max(chunk.start, hStartInSentence), 
                      end: Math.min(chunk.end, hEndInSentence), 
                      text: sentence.substring(Math.max(chunk.start, hStartInSentence), Math.min(chunk.end, hEndInSentence)),
                      color: ph.color 
                    });
                    if (hEndInSentence < chunk.end) {
                      newChunks.push({ start: hEndInSentence, end: chunk.end, text: sentence.substring(hEndInSentence, chunk.end) });
                    }
                  }
                });
                chunks = newChunks;
              }
            });

            return (
              <span key={idx} className="inline-block transition-all mr-1">
                {chunks.map((chunk, cIdx) => {
                  if (chunk.color) {
                    const colorData = HIGHLIGHTER_COLORS.find(c => c.key === chunk.color) || HIGHLIGHTER_COLORS[0];
                    return (
                      <mark
                        key={cIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle precise removal or toggle
                          const originalHighlight = relevantHighlights.find(rh => rh.color === chunk.color);
                          if (originalHighlight) handleToggleLineHighlight(tipId, originalHighlight.text);
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded-lg cursor-pointer transition-all inline-block text-slate-900 border-b-2 shadow-xs",
                          "hover:bg-red-100 hover:text-red-900 hover:border-red-450 hover:scale-[1.01] active:scale-95",
                          colorData.bg,
                          colorData.border
                        )}
                      >
                        {chunk.text}
                      </mark>
                    );
                  }
                  return (
                    <span 
                      key={cIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLineHighlight(tipId, sentence, highlighterColor);
                      }}
                      className="cursor-pointer hover:bg-slate-200/50 rounded-lg transition-all hover:text-slate-950 px-1 py-0.5"
                    >
                      {chunk.text}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </span>
      );
    }

    // Classic Free Highlight Mode (default if not sentence)
    if (!highlights || highlights.length === 0) {
      return <span className="whitespace-pre-line leading-relaxed font-semibold text-slate-700">{text}</span>;
    }

    const parsed = (highlights || [])
      .map(h => parseHighlight(h))
      .filter((ph) => ph.text.trim().length > 0)
      .sort((a, b) => b.text.length - a.text.length);

    if (parsed.length === 0) {
      return <span className="whitespace-pre-line leading-relaxed font-semibold text-slate-700">{text}</span>;
    }

    interface MatchSegment {
      start: number;
      end: number;
      text: string;
      color: string;
    }

    const matches: MatchSegment[] = [];
    parsed.forEach((ph) => {
      let index = text.indexOf(ph.text);
      while (index !== -1) {
        const overlaps = matches.some(m =>
          (index >= m.start && index < m.end) ||
          (index + ph.text.length > m.start && index + ph.text.length <= m.end) ||
          (m.start >= index && m.start < index + ph.text.length)
        );

        if (!overlaps) {
          matches.push({
            start: index,
            end: index + ph.text.length,
            text: ph.text,
            color: ph.color
          });
        }
        index = text.indexOf(ph.text, index + 1);
      }
    });

    matches.sort((a, b) => a.start - b.start);

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match, index) => {
      if (match.start > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}-${match.start}`} className="whitespace-pre-line">
            {text.substring(lastIndex, match.start)}
          </span>
        );
      }

      const colorData = HIGHLIGHTER_COLORS.find(c => c.key === match.color) || HIGHLIGHTER_COLORS[0];

      segments.push(
        <mark
          key={`highlight-${match.start}-${index}`}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleLineHighlight(tipId, match.text);
          }}
          className={cn(
            "font-extrabold px-1.5 py-0.5 rounded-sm cursor-pointer transition-all mx-0.5 inline-block select-none text-slate-900 border-b-2",
            "hover:bg-red-100 hover:text-red-900 hover:border-red-400",
            colorData.bg,
            colorData.border
          )}
          title="לחץ להסרת המרקר"
          style={{ WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.4)' }}
        >
          {match.text}
        </mark>
      );
      lastIndex = match.end;
    });

    if (lastIndex < text.length) {
      segments.push(
        <span key={`text-${lastIndex}-${text.length}`} className="whitespace-pre-line">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <span className="leading-relaxed font-semibold">{segments}</span>;
  };

  const groupedTips = useMemo(() => {
    let result = [...savedTips];

    if (categoryFilter !== 'all') {
      result = result.filter(tip => tip.category === categoryFilter);
    }

    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      result = result.filter(tip =>
        tip.text.toLowerCase().includes(query) ||
        (tip.sourceTitle?.toLowerCase().includes(query)) ||
        (tip.category === 'weakness' ? 'נושא לחיזוק' : tip.category === 'recommendation' ? 'המלצה אישית' : 'טיפ כללי').toLowerCase().includes(query)
      );
    }

    // Grouping into Sequential "Sessions" or "Clusters"
    const sortedResult = result.sort((a, b) => a.savedAt.getTime() - b.savedAt.getTime());
    const displayGroups: { title: string; type: string; tips: SavedTip[]; latestDate: Date }[] = [];
    
    sortedResult.forEach(tip => {
      const lastGroup = displayGroups.length > 0 ? displayGroups[displayGroups.length - 1] : null;
      const lastTip = lastGroup ? lastGroup.tips[lastGroup.tips.length - 1] : null;

      const isSameDay = lastTip && tip.savedAt.toDateString() === lastTip.savedAt.toDateString();
      const isSameSource = lastTip && tip.sourceId === lastTip.sourceId;
      const isCloseInTime = lastTip && (tip.savedAt.getTime() - lastTip.savedAt.getTime()) <= 5 * 60 * 1000;

      // Logic: Same session if same day, same source ID (if any) and small time gap
      if (lastGroup && isSameDay && (tip.sourceId ? isSameSource : isCloseInTime)) {
        lastGroup.tips.push(tip);
        lastGroup.latestDate = tip.savedAt;
      } else {
        // Start a new logical "chat session" or "activity" group
        let gTitle = tip.sourceTitle;
        if (!gTitle) {
          if (tip.sourceId) {
            gTitle = isHe ? 'ללא כותרת' : 'Untitled';
          } else {
            gTitle = isHe ? `צ'ט מ-${tip.savedAt.toLocaleDateString('he-IL')}` : `Chat from ${tip.savedAt.toLocaleDateString()}`;
          }
        }
        
        const gType = tip.sourceType || 'legacy';
        displayGroups.push({
          title: gTitle,
          type: gType,
          tips: [tip],
          latestDate: tip.savedAt
        });
      }
    });

    // Return groups in descending order (Newest Day/Session at top)
    return displayGroups.reverse().map(group => [group.tips[0].id, group] as [string, typeof group]);
  }, [savedTips, categoryFilter, searchTerm, isHe]);

  const hasLegacyTips = useMemo(() => {
    return savedTips.some(tip => !tip.sourceId);
  }, [savedTips]);

  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrateLegacyTips = async () => {
    if (!auth.currentUser) return;
    setIsMigrating(true);
    try {
      const legacyTips = savedTips.filter(tip => !tip.sourceId);
      const updates = legacyTips.map(tip => 
        updateSavedTip(tip.id, {
          sourceId: 'legacy-chat-migration',
          sourceTitle: isHe ? 'סיכומי צ\'ט קודמים' : 'Previous Chat Summaries',
          sourceType: 'query'
        })
      );
      await Promise.all(updates);
    } catch (err) {
      console.error("Migration failed:", err);
    } finally {
      setIsMigrating(false);
    }
  };

  // Flattened for count
  const filteredCount = useMemo(() => {
    let count = 0;
    groupedTips.forEach(([_, group]) => count += group.tips.length);
    return count;
  }, [groupedTips]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-8 pb-24 md:pb-8" dir={dir}>
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Local Quick Jump Navigation Bar between History and Saved */}
        {onNavigateToTab && (
          <div className="flex justify-center">
            <div className="bg-slate-200/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-300/60 dark:border-slate-700/60 font-sans shadow-xs flex items-center gap-1">
              <button
                onClick={() => onNavigateToTab('completed')}
                className="px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{isHe ? "היסטוריית שאילתות" : "Execution History"}</span>
                {completedCount !== undefined && completedCount > 0 && (
                  <span className="bg-slate-300/60 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {completedCount}
                  </span>
                )}
              </button>
              <button
                disabled
                className="px-5 py-2 rounded-xl text-xs font-black transition-all cursor-default flex items-center gap-2 bg-white text-blue-600 shadow-sm"
              >
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span>{isHe ? "חומרים ששמרתי" : "Saved Materials"}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                  {savedTips.length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              חומרים ששמרתי
              <span className="bg-gradient-to-r from-pink-100 to-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-[10px] md:text-xs font-extrabold flex items-center gap-1.5 border border-yellow-200 shadow-xs animate-pulse">
                <Highlighter className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                מגוון צבעי מרקר! 🎨
              </span>
            </h2>
            <p className="text-slate-500 mt-1 md:mt-2 text-sm leading-relaxed">
              ריכוז כלל העצות, התובנות והנקודות ששמרת לשיפור ביצועי ה-SQL שלך.
            </p>
          </div>
          
          {hasLegacyTips && (
            <button
              onClick={handleMigrateLegacyTips}
              disabled={isMigrating}
              className="group flex items-center gap-3 bg-amber-50 hover:bg-amber-100 text-amber-800 px-5 py-3 rounded-2xl border-2 border-amber-200/50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <div className="bg-amber-500 p-2 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform">
                <RotateCcw className={cn("w-4 h-4", isMigrating && "animate-spin")} />
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-black uppercase tracking-tight leading-none mb-1">
                  {isHe ? "שדרוג חומרים ישנים" : "UPGRADE LEGACY ITEMS"}
                </span>
                <span className="block text-[10px] font-bold text-amber-700/80">
                  {isHe ? "איחוד רטרואקטיבי של מקורות" : "Unify sources retroactively"}
                </span>
              </div>
            </button>
          )}

          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl text-xs font-black border border-blue-100 flex items-center gap-2">
            <BookMarked className="w-4 h-4" />
            <span>סך הכל שמרת {savedTips.length} נקודות</span>
          </div>
        </div>

        {/* Highlighter Toolkit Panel */}
        <div className="bg-slate-900 text-white p-4 md:p-6 rounded-3xl border border-slate-700 shadow-lg space-y-4 font-sans relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <h3 className="text-sm md:text-base font-bold flex items-center gap-2 text-amber-400">
                <Highlighter className="w-5 h-5 text-amber-400" />
                {isHe ? "ארגז כלי מרקר חכם ✨" : "Smart Highlighter Toolkit ✨"}
              </h3>
              <p className="text-slate-400 text-xs">
                {isHe 
                  ? "בחרנו עבורך סימון משפטים מהיר: פשוט הקלק על כל משפט בטיפים למטה כדי לצבוע אותו באופן מיידי!" 
                  : "We selected Quick Sentence highlight: just click on any sentence below to color it instantly!"}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full md:w-auto">
              {/* Marking Mode Switcher */}
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setMarkingMode('sentence')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                    markingMode === 'sentence' 
                      ? "bg-blue-600 text-white shadow-md font-extrabold" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isHe ? "משפטים מהיר" : "Quick Sentence"}
                </button>
                <button
                  onClick={() => setMarkingMode('free')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                    markingMode === 'free' 
                      ? "bg-blue-600 text-white shadow-md font-extrabold" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  {isHe ? "בחירה חופשית" : "Free Selection"}
                </button>
              </div>

              {/* Active Color Selector */}
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 justify-between sm:justify-start">
                <span className="text-[10px] text-slate-300 font-bold">{isHe ? "צבע פעיל:" : "Active:"}</span>
                <div className="flex items-center gap-1.5">
                  {HIGHLIGHTER_COLORS.map((col) => {
                    const isSelected = highlighterColor === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => setHighlighterColor(col.key)}
                        className={cn(
                          "w-6 h-6 rounded-full border transition-all active:scale-95 flex items-center justify-center cursor-pointer",
                          col.bg,
                          isSelected ? "border-white scale-110 ring-1 ring-blue-400" : "border-transparent opacity-80 hover:opacity-100"
                        )}
                        title={isHe ? `צבע ${col.label}` : `${col.key} color`}
                      >
                        {isSelected && <span className="w-2 h-2 bg-slate-950 rounded-full" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Free Search input */}
            <div className="sm:col-span-8 relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
              <input
                type="text"
                placeholder="חיפוש חופשי בנקודות ששמרת..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-right"
              />
            </div>

            {/* Category selection */}
            <div className="sm:col-span-4 relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-right cursor-pointer"
              >
                <option value="all">כל סוגי החומרים</option>
                <option value="weakness">נושאים לחיזוק</option>
                <option value="recommendation">המלצות אישיות</option>
                <option value="general">טיפים כלליים</option>
              </select>
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Screen */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <span className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 mt-4 text-sm font-semibold">טוען את החומרים השמורים שלך...</p>
          </div>
        ) : groupedTips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-100 p-5 rounded-full text-slate-400 border border-slate-200">
              <Bookmark className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">אין חומרים ששמורים כאן</h3>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed mx-auto">
                {searchTerm || categoryFilter !== 'all' 
                  ? "לא נמצאו חומרים התואמים את הגדרות הסינון שלך. נסה לשנות את החיפוש." 
                  : "עדיין לא שמרת נקודות. בעת צפייה בהיסטוריית השאילתות ובניתוח הביצועים, לחץ על סמל הסימנייה לשמירת הטיפים החשובים לך!"}
              </p>
            </div>
          </div>
        ) : (
          /* Unified Source Containers */
          <div className="space-y-10 md:space-y-16">
            {groupedTips.map(([sourceId, group]) => (
              <div key={sourceId} className="space-y-5 animate-slideUp">
                {/* Source Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-2xl shadow-sm border",
                      group.type === 'performance_analysis' ? "bg-amber-100/50 text-amber-600 border-amber-200" :
                      group.type === 'query' ? "bg-blue-100/50 text-blue-600 border-blue-200" :
                      group.type === 'practice_question' ? "bg-emerald-100/50 text-emerald-600 border-emerald-200" :
                      "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {group.type === 'performance_analysis' ? <Sparkles className="w-5 h-5" /> : 
                       group.type === 'query' ? <Clock className="w-5 h-5" /> : 
                       group.type === 'practice_question' ? <BookMarked className="w-5 h-5" /> :
                       <Layers className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{group.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {group.type === 'performance_analysis' ? (isHe ? 'ניתוח ביצועים חכם' : 'AI Performance Analysis') : 
                           group.type === 'query' ? (isHe ? 'היסטוריית שאילתות' : 'Query History') : 
                           group.type === 'practice_question' ? (isHe ? 'תרגול שאלות' : 'Practice Question') :
                           (isHe ? 'מקור כללי' : 'General Source')}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">•</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {group.latestDate.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Actions (Export, unified list counts, status) */}
                  <div className="flex items-center gap-2.5 flex-wrap pointer-events-auto">
                    {exportedDocUrls[sourceId] ? (
                      <a
                        href={exportedDocUrls[sourceId]}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs transition-all no-underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5 animate-pulse" />
                        <span>{isHe ? 'פתח ב-Google Docs' : 'Open in Google Docs'}</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => handleExportToGoogleDocs(sourceId, group.title, group.tips)}
                        disabled={exportingGroups[sourceId]}
                        className={cn(
                          "flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-[11px] font-bold px-3 py-1.5 border border-blue-200/50 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer rounded-xl",
                          exportingGroups[sourceId] && "animate-pulse"
                        )}
                      >
                        {exportingGroups[sourceId] ? (
                          <>
                            <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span>{isHe ? 'מייצא...' : 'Exporting...'}</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>{isHe ? 'ייצוא ל-Google Docs' : 'Export to Docs'}</span>
                          </>
                        )}
                      </button>
                    )}

                    {exportErrors[sourceId] && (
                      <span className="text-[10px] font-bold text-red-650 bg-red-50 border border-red-200/50 px-2.5 py-1 rounded-lg block max-w-[200px] truncate" title={exportErrors[sourceId]}>
                        ⚠️ {isHe ? 'שגיאה' : 'Error'}
                      </span>
                    )}

                    <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{group.tips.length} {isHe ? 'פריטים בקבוצה' : 'items unified'}</span>
                    </div>
                  </div>
                </div>

                {/* Unified Notebook Card Container */}
                <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative group/group-card">
                  {/* Visual sidebar indicator for the source type */}
                  <div className={cn(
                    "absolute top-0 right-0 w-1.5 h-full opacity-60",
                    group.type === 'performance_analysis' ? "bg-amber-400" :
                    group.type === 'query' ? "bg-blue-400" :
                    group.type === 'practice_question' ? "bg-emerald-400" :
                    "bg-slate-300"
                  )} />

                  <div className="divide-y divide-slate-100">
                    {group.tips.map((tip, tipIdx) => {
                      const isSelectedForTip = activeSelection && activeSelection.tipId === tip.id;
                      return (
                        <div
                          key={tip.id}
                          id={`saved-tip-card-${tip.id}`}
                          className={cn(
                            "saved-tip-card p-6 md:p-8 flex flex-col justify-between space-y-6 relative transition-all bg-white hover:bg-slate-50/30 group/tip-item",
                            tip.category === 'weakness' ? "hover:bg-amber-50/10" :
                            tip.category === 'recommendation' ? "hover:bg-blue-50/10" :
                            "hover:bg-emerald-50/10"
                          )}
                          onMouseUp={() => handleTextSelection(tip.id)}
                          onTouchEnd={() => setTimeout(() => handleTextSelection(tip.id), 150)}
                        >
                          <div className="space-y-5">
                            <div className="flex items-center justify-between pointer-events-none">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border pointer-events-auto",
                                  tip.category === 'weakness' ? "bg-amber-100/50 text-amber-800 border-amber-200/60" :
                                  tip.category === 'recommendation' ? "bg-blue-100/50 text-blue-800 border-blue-200/60" :
                                  "bg-emerald-100/50 text-emerald-800 border-emerald-200/60"
                                )}>
                                  {tip.category === 'weakness' ? 'נושא לחיזוק' :
                                  tip.category === 'recommendation' ? 'המלצה אישית' : 'טיפ כללי'}
                                </span>
                                <span className="text-[10px] text-slate-300 font-mono font-bold uppercase pointer-events-auto">
                                  {tip.savedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 pointer-events-auto opacity-0 group-hover/tip-item:opacity-100 transition-opacity">
                                {(tip.highlightedLines || []).length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSavedTips(prev => prev.map(t => t.id === tip.id ? { ...t, highlightedLines: [] } : t));
                                      updateSavedTip(tip.id, { highlightedLines: [] });
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-red-600 font-bold transition-all border border-slate-200 hover:border-red-200 px-2.5 py-1 rounded-xl bg-white shadow-sm flex items-center gap-1.5"
                                    title="נקה את כל המרקרים בטיפ זה"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    {isHe ? "איפוס סימון" : "Clear Mark"}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="text-sm md:text-base text-slate-700 leading-[1.8] font-medium transition-all select-text pr-1">
                              {renderTextWithHighlights(tip.id, tip.text, tip.highlightedLines || [])}
                            </div>
                          </div>

                          {/* Active selection popup marker color picker */}
                          {isSelectedForTip && (
                            <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-3.5 flex flex-col lg:flex-row items-center justify-between gap-3.5 shadow-2xl select-none animate-fadeIn selection-helper-menu z-20 w-full mb-4">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-200 self-start lg:self-center w-full lg:w-auto">
                                <Highlighter className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="truncate max-w-[280px]">
                                  {isHe ? "סמן את:" : "Highlighting:"} &quot;{activeSelection.selectedText}&quot;
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 justify-between lg:justify-end">
                                {/* Selector circles */}
                                <div className="flex items-center justify-center gap-2 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
                                  {HIGHLIGHTER_COLORS.map((col) => {
                                    const isSelected = highlighterColor === col.key;
                                    return (
                                      <button
                                        key={col.key}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHighlighterColor(col.key);
                                          handleToggleLineHighlight(tip.id, activeSelection.selectedText, col.key);
                                          clearSelection();
                                        }}
                                        className={cn(
                                          "w-7 h-7 rounded-full border-2 transition-all active:scale-90 flex items-center justify-center relative touch-manipulation cursor-pointer",
                                          col.bg,
                                          isSelected ? "border-white scale-110 shadow-lg ring-2 ring-blue-500/50" : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                                        )}
                                        title={`סמן ב${col.label}`}
                                      >
                                        {isSelected && (
                                          <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-end gap-2 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearSelection();
                                    }}
                                    className="px-3 py-1.5 text-[11px] text-slate-400 hover:text-white font-black transition-colors"
                                  >
                                    ביטול
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleLineHighlight(tip.id, activeSelection.selectedText, highlighterColor);
                                      clearSelection();
                                    }}
                                    className={cn(
                                      "px-4 py-1.5 font-black rounded-xl text-[11px] shadow-md transition-all active:scale-95 flex items-center gap-1.5 border touch-manipulation cursor-pointer",
                                      HIGHLIGHTER_COLORS.find(c => c.key === highlighterColor)?.bg || 'bg-yellow-250',
                                      HIGHLIGHTER_COLORS.find(c => c.key === highlighterColor)?.border || 'border-yellow-400',
                                      "text-slate-950"
                                    )}
                                  >
                                    <span>{isHe ? "סמן" : "MARK"}</span>
                                    <Highlighter className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-3 opacity-0 group-hover/tip-item:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSavedTip(tip.id);
                              }}
                              className="text-[11px] font-black text-slate-400 hover:text-red-500 transition-all flex items-center gap-1.5 p-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer"
                              title="הסר מהשמורים"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {isHe ? 'הסר' : 'REMOVE'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
}
      </div>
    </div>
  );
};
