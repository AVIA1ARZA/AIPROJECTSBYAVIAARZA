import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, Bot, X, Bookmark, BookmarkCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { chatAboutSolution, summarizePracticeChat, Question, GradeResult, UserProfile } from '../services/geminiService';
import { updateCompletedQuestion } from '../firebase';
import { cn, extractTextFromChildren } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface FollowUpChatProps {
  submissionId?: string | null;
  question: Question;
  userSql?: string;
  result?: GradeResult | null;
  userProfile?: UserProfile | null;
  onClose?: () => void;
  schema?: any[];
  initialHistory?: { role: 'user' | 'model'; content: string }[];
  onSave?: (text: string, category: string) => Promise<void>;
  savedTips?: Set<string>;
}

export const FollowUpChat = React.memo<FollowUpChatProps>(({
  submissionId,
  question,
  userSql = "",
  result = null,
  userProfile,
  onClose,
  schema,
  initialHistory = [],
  onSave,
  savedTips = new Set()
}) => {
  const { isHe, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialHistory && initialHistory.length > 0) {
      return initialHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }));
    }
    return [];
  });

  // Sync messages with database changes (e.g. from background onSnapshot sync)
  useEffect(() => {
    if (initialHistory && initialHistory.length > 0) {
      setMessages((prev) => {
        // Simple comparison to prevent infinite loop
        const prevContent = prev.map(m => m.parts[0]?.text).join('||');
        const nextContent = initialHistory.map(h => h.content).join('||');
        if (prevContent === nextContent) {
          return prev;
        }
        return initialHistory.map(h => ({
          role: h.role,
          parts: [{ text: h.content }]
        }));
      });
    }
  }, [initialHistory]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markdownComponents = {
    p: ({ children }: any) => {
      if (!onSave) return <p className="mb-2">{children}</p>;
      const text = extractTextFromChildren(children);
      const isSaved = savedTips.has(text);
      
      return (
        <div className="group relative">
          <p className={cn("mb-2", isHe ? "pr-7" : "pl-7")}>{children}</p>
          {text.length > 20 && (
            <button
              onClick={() => onSave(text, 'general')}
              className={cn(
                "absolute top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer",
                isHe ? "right-0" : "left-0",
                isSaved ? "text-emerald-500" : "text-slate-300 hover:text-blue-500"
              )}
              title={isSaved ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים" : "Save to materials")}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      );
    },
    li: ({ children }: any) => {
      if (!onSave) return <li className="mb-1">{children}</li>;
      const text = extractTextFromChildren(children);
      const isSaved = savedTips.has(text);

      return (
        <div className="group relative">
          <li className={cn("mb-1", isHe ? "pr-7" : "pl-7")}>{children}</li>
          {text.length > 10 && (
            <button
              onClick={() => onSave(text, 'general')}
              className={cn(
                "absolute top-0 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer",
                isHe ? "right-0" : "left-0",
                isSaved ? "text-emerald-500" : "text-slate-300 hover:text-blue-500"
              )}
              title={isSaved ? (isHe ? "נשמר בחומרים" : "Saved to materials") : (isHe ? "שמור לחומרים" : "Save to materials")}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      );
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    const newUserMessage: Message = { role: 'user', parts: [{ text: userMsg }] };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const responseText = await chatAboutSolution(
        userMsg,
        messages,
        question,
        userSql,
        result,
        userProfile,
        schema,
        language
      );

      const aiMessage: Message = { role: 'model', parts: [{ text: responseText }] };
      const newMessages = [...messages, newUserMessage, aiMessage];
      setMessages(newMessages);

      // --- PERSISTENCE & SUMMARIZATION ---
      const firestoreHistory = newMessages.map(m => ({
        role: m.role,
        content: m.parts[0].text
      }));

      // Summarize the conversation
      const summary = await summarizePracticeChat(firestoreHistory, language);

      // Update Firebase if we have a submissionId
      if (submissionId) {
        await updateCompletedQuestion(submissionId, {
          chatHistory: firestoreHistory,
          chatSummary: summary
        });
      }
      // ------------------------------------

    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = result 
    ? (isHe ? ['למה להשתמש ב-JOIN?', 'מה זה COALESCE?', 'איך אפשר לייעל?'] : ['Why use JOIN?', 'What is COALESCE?', 'How can this be optimized?'])
    : (isHe ? ['מה הכוונה ב"מבוטחים"?', 'אילו טבלאות מתאימות כאן?', 'מה זה "פרמיה" במודל שלנו?'] : ['What is meant by "Insureds"?', 'Which tables fit here?', 'What is "Premium" in our model?']);

  return (
    <div className="flex flex-col h-[400px] bg-slate-50 border border-blue-100 rounded-xl overflow-hidden shadow-inner flex-1" dir={isHe ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="px-4 py-2 bg-blue-600 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {result ? (isHe ? "צ'אט לימודי עם המנטור" : "Educational Mentor Chat") : (isHe ? "הבהרת השאלה עם המנטור" : "Question Clarification Chat")}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Bot className="w-10 h-10 text-blue-200 mx-auto" />
            <p className="text-slate-500 text-sm italic px-4">
              {result 
                ? (isHe 
                    ? "יש לך שאלות על הפתרון? אני כאן כדי לעזור לך להבין טוב יותר את הלוגיקה העסקית וה-SQL."
                    : "Questions about the solution? I'm here to help you better understand the business logic and SQL.")
                : (isHe
                    ? "זקוק להבהרה לגבי השאלה או המבנה העסקי? אני כאן כדי לעזור לך להתחיל ברגל ימין."
                    : "Need clarification on the question or business structure? I'm here to help you get started on the right foot.")
              }
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="text-[10px] bg-white border border-blue-100 text-blue-600 px-2 py-1 rounded-full hover:bg-blue-50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' 
                ? (isHe ? "mr-auto flex-row-reverse" : "ml-auto flex-row-reverse")
                : (isHe ? "ml-auto" : "mr-auto")
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border",
              msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-600 border-blue-200"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
              msg.role === 'user' 
                ? "bg-slate-800 text-white rounded-tr-none" 
                : "bg-white text-slate-800 border border-blue-100 rounded-tl-none"
            )}>
              <div className="prose prose-slate prose-sm max-w-none">
                <Markdown components={msg.role === 'model' ? markdownComponents : {}}>{msg.parts[0].text}</Markdown>
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className={cn("flex gap-3", isHe ? "ml-auto" : "mr-auto")}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 border border-blue-200 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-blue-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-[10px] text-slate-400 font-medium">
                {isHe ? "המנטור חושב..." : "Mentor is thinking..."}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isHe ? "שאלי שאלה על השאילתה..." : "Ask a question about the query..."}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

FollowUpChat.displayName = 'FollowUpChat';
