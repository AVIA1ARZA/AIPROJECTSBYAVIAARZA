import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ChevronDown, ChevronUp, Code, Lightbulb, ShieldCheck, Zap, Target, CheckCircle2, Trophy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../lib/utils';
import { CompletedQuestion } from './CompletedQueriesView';
import { useLanguage } from '../context/LanguageContext';
import { Material, InsuranceTopic, SQL_MATERIALS, INSURANCE_MATERIALS } from '../data/learningMaterials';

function getSqlTopicIds(item: CompletedQuestion): string[] {
  const sqlText = ((item.userSql || '') + ' ' + (item.question?.correctSql || '')).toLowerCase();
  const titleDesc = ((item.question?.title || '') + ' ' + (item.question?.description || '')).toLowerCase();
  const ids: string[] = [];

  if (sqlText.includes('join') || titleDesc.includes("ג'וין") || titleDesc.includes("חיבור טבלאות") || titleDesc.includes("קשר")) {
    ids.push('joins');
  }
  if (sqlText.includes('group by') || sqlText.includes('sum(') || sqlText.includes('avg(') || sqlText.includes('count(') || sqlText.includes('max(') || sqlText.includes('min(') || titleDesc.includes('סיכום') || titleDesc.includes('ממוצע') || titleDesc.includes('ספיר') || titleDesc.includes('אגרגצי') || titleDesc.includes('קיבוץ')) {
    ids.push('group-by');
  }
  if (sqlText.includes('case when') || titleDesc.includes('תנאי') || titleDesc.includes('case') || titleDesc.includes('סיווג')) {
    ids.push('case-when');
  }
  if (sqlText.includes('coalesce') || sqlText.includes('ifnull') || sqlText.includes('nullif') || sqlText.includes('is null') || sqlText.includes('is not null') || titleDesc.includes('נתונים חסרים') || titleDesc.includes('ברירת מחדל')) {
    ids.push('coalesce');
  }
  if (sqlText.includes('lpad') || sqlText.includes('rpad') || sqlText.includes('strftime') || sqlText.includes('to_char') || sqlText.includes('replace(') || sqlText.includes('cast(') || titleDesc.includes('עריכ') || titleDesc.includes('ניקוי') || titleDesc.includes('transformation') || titleDesc.includes('נירמול')) {
    ids.push('data-transformation');
  }
  if (sqlText.includes('limit ') || sqlText.includes('top ') || sqlText.includes('fetch first') || sqlText.includes('offset') || titleDesc.includes('הגבלת') || titleDesc.includes('דירוג') || titleDesc.includes('ראשונים') || titleDesc.includes('top')) {
    ids.push('limiting-ranking');
  }
  if (sqlText.includes('with ') || sqlText.includes('cte') || (sqlText.includes('select ') && sqlText.split('select').length > 2) || sqlText.includes('union') || sqlText.includes('except') || sqlText.includes('intersect') || sqlText.includes('exists') || titleDesc.includes('תת') || titleDesc.includes('cte') || titleDesc.includes('משנה') || titleDesc.includes('ארגון') || titleDesc.includes('advanced')) {
    ids.push('advanced-logic');
  }
  if (sqlText.includes('with ') || sqlText.includes('cte') || (sqlText.includes('select ') && sqlText.split('select').length > 2) || titleDesc.includes('תת') || titleDesc.includes('cte') || titleDesc.includes('משנה') || titleDesc.includes('ארגון')) {
    ids.push('ctes');
  }
  if (sqlText.includes('over (') || sqlText.includes('partition by') || sqlText.includes('row_number(') || sqlText.includes('rank(') || sqlText.includes('lag(') || sqlText.includes('lead(') || titleDesc.includes('חלון') || titleDesc.includes('מצטבר') || titleDesc.includes('דירוג')) {
    ids.push('window-functions');
  }
  if (sqlText.includes('procedure') || sqlText.includes('sp_') || sqlText.includes('exec ') || sqlText.includes('create procedure') || titleDesc.includes('פרוצדורה') || titleDesc.includes('stored procedure') || titleDesc.includes('אוטומציה')) {
    ids.push('stored-procedures');
  }

  if (sqlText.includes('lpad') || sqlText.includes('rpad') || sqlText.includes('strftime') || sqlText.includes('to_char') || sqlText.includes('replace(') || sqlText.includes('cast(') || titleDesc.includes('עריכ') || titleDesc.includes('ניקוי') || titleDesc.includes('transformation') || titleDesc.includes('נירמול')) {
    ids.push('data-transformation');
  }

  if (sqlText.includes('limit ') || sqlText.includes('top ') || sqlText.includes('fetch first') || sqlText.includes('offset') || titleDesc.includes('הגבלת') || titleDesc.includes('דירוג') || titleDesc.includes('ראשונים') || titleDesc.includes('top')) {
    ids.push('limiting-ranking');
  }

  if (ids.length === 0 || sqlText.includes('where') || titleDesc.includes('סינון') || titleDesc.includes('שליפה')) {
    ids.push('select-where');
  }

  return ids;
}

function getInsuranceTopicIds(item: CompletedQuestion): string[] {
  const sqlText = ((item.userSql || '') + ' ' + (item.question?.correctSql || '')).toLowerCase();
  const titleDesc = ((item.question?.title || '') + ' ' + (item.question?.description || '')).toLowerCase();
  const ids: string[] = [];

  if (titleDesc.includes('מחזור חיי') || titleDesc.includes('הצעה') || titleDesc.includes('הפקה') || titleDesc.includes('חידוש') || titleDesc.includes('ביטול') || titleDesc.includes('הקפאה') || titleDesc.includes('סטטוס') || sqlText.includes('status') || titleDesc.includes('lifecycle')) {
    ids.push('lifecycle');
  }
  if (titleDesc.includes('תוספת') || titleDesc.includes('שינוי') || titleDesc.includes('החזר') || titleDesc.includes('יחסי') || titleDesc.includes('pro-rata') || sqlText.includes('endorsement') || titleDesc.includes('endorsements') || titleDesc.includes('mta')) {
    ids.push('endorsements');
  }
  if (
    titleDesc.includes('הצמדה') || 
    titleDesc.includes('מדד') || 
    titleDesc.includes('ריבית') || 
    titleDesc.includes('סילוקין') || 
    titleDesc.includes('הפרשי הצמד') || 
    titleDesc.includes('הפרש') ||
    (titleDesc.includes('פרמיה') && (titleDesc.includes('מדד') || titleDesc.includes('הצמד') || titleDesc.includes('ריבית') || sqlText.includes('index')))
  ) {
    ids.push('index-linkage');
  }
  if (titleDesc.includes('חיתום') || titleDesc.includes('סיכון') || titleDesc.includes('underwriting') || titleDesc.includes('הנחה') || titleDesc.includes('העמסה') || titleDesc.includes('גורמי סיכון')) {
    ids.push('underwriting');
  }
  if (titleDesc.includes('תביעה') || titleDesc.includes('תביעות') || titleDesc.includes('רזרב') || titleDesc.includes('reserve') || titleDesc.includes('שמאי') || titleDesc.includes('נזק') || sqlText.includes('claim') || sqlText.includes('reserve') || titleDesc.includes('reserves')) {
    ids.push('claims-reserves');
  }
  if (titleDesc.includes('משנה') || titleDesc.includes('שימור') || titleDesc.includes('reinsurance') || titleDesc.includes('treaty') || titleDesc.includes('quota share') || titleDesc.includes('ceded')) {
    ids.push('reinsurance');
  }
  if (titleDesc.includes('רגולציה') || titleDesc.includes('דיווח') || titleDesc.includes('סולבנסי') || titleDesc.includes('ממשק') || titleDesc.includes('ציות') || titleDesc.includes('compliance') || titleDesc.includes('reporting')) {
    ids.push('regulation');
  }

  if (ids.length === 0 || titleDesc.includes('יסוד') || titleDesc.includes('מבנה פוליסה') || titleDesc.includes('מבנה הפוליסה') || titleDesc.includes('מקיף') || titleDesc.includes('חובה') || titleDesc.includes('צד ג') || titleDesc.includes('פרמיה') || titleDesc.includes('הפוליסה')) {
    ids.push('basics');
  }

  return ids;
}

interface LearningMaterialsViewProps {
  onStartTargetedPractice?: (topic: string, difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert') => void;
  completed?: CompletedQuestion[];
}

export const LearningMaterialsView: React.FC<LearningMaterialsViewProps> = ({ onStartTargetedPractice, completed = [] }) => {
  const { isHe, language, dir, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'sql' | 'insurance'>('sql');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const sqlStats: Record<string, { total: number, Easy: number, Medium: number, Hard: number, Expert: number }> = {};
    const insuranceStats: Record<string, { total: number, Easy: number, Medium: number, Hard: number, Expert: number }> = {};

    SQL_MATERIALS.forEach(m => {
      sqlStats[m.id] = { total: 0, Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
    });
    INSURANCE_MATERIALS.forEach(m => {
      insuranceStats[m.id] = { total: 0, Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
    });

    completed.forEach(item => {
      const diff = item.question?.difficulty || 'Easy';
      
      const sqlTopicIds = getSqlTopicIds(item);
      sqlTopicIds.forEach(id => {
        if (sqlStats[id]) {
          sqlStats[id].total += 1;
          sqlStats[id][diff] = (sqlStats[id][diff] || 0) + 1;
        }
      });

      const insTopicIds = getInsuranceTopicIds(item);
      insTopicIds.forEach(id => {
        if (insuranceStats[id]) {
          insuranceStats[id].total += 1;
          insuranceStats[id][diff] = (insuranceStats[id][diff] || 0) + 1;
        }
      });
    });

    return { sqlStats, insuranceStats };
  }, [completed]);

  const materials = activeSubTab === 'sql' ? SQL_MATERIALS : INSURANCE_MATERIALS;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-8 pb-20 md:pb-8" dir={dir}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800">{isHe ? "חומרי למידה" : "Study Guide"}</h2>
              <p className="text-slate-500 mt-1">{isHe ? "המדריך המלא למיישם חוזה עסקי בביטוח אלמנטרי" : "The complete guide for elementary insurance business implementation and SQL analytics"}</p>
            </div>
          </div>

          <div className="flex bg-slate-200 p-1 rounded-xl self-start md:self-center">
            <button
              onClick={() => { setActiveSubTab('sql'); setExpandedId(null); }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                activeSubTab === 'sql' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {isHe ? "SQL למיישמים" : "SQL for Analysts"}
            </button>
            <button
              onClick={() => { setActiveSubTab('insurance'); setExpandedId(null); }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                activeSubTab === 'insurance' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {isHe ? "ביטוח אלמנטרי" : "Elementary Insurance"}
            </button>
          </div>
        </div>

        {/* Materials List */}
        <div className="space-y-4">
          {materials.map((material) => {
            const itemStats = activeSubTab === 'sql' 
              ? stats.sqlStats[material.id] 
              : stats.insuranceStats[material.id] || { total: 0, Easy: 0, Medium: 0, Hard: 0, Expert: 0 };

            return (
              <motion.div
                key={material.id}
                layout
                className={cn(
                  "bg-white rounded-2xl border transition-all duration-200 overflow-hidden",
                  expandedId === material.id ? "border-blue-300 shadow-md ring-1 ring-blue-100" : "border-slate-200 shadow-sm hover:border-slate-300"
                )}
              >
                <button
                  onClick={() => setExpandedId(expandedId === material.id ? null : material.id)}
                  className="w-full p-5 flex items-center justify-between text-right gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      material.difficulty === 'Easy' ? "bg-green-50 text-green-600" :
                      material.difficulty === 'Medium' ? "bg-orange-50 text-orange-600" :
                      material.difficulty === 'Hard' ? "bg-red-50 text-red-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {material.difficulty === 'Easy' ? <Zap className="w-5 h-5" /> :
                       material.difficulty === 'Medium' ? <Code className="w-5 h-5" /> :
                       material.difficulty === 'Hard' ? <ShieldCheck className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{material.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          material.difficulty === 'Easy' ? "bg-green-100 text-green-700" :
                          material.difficulty === 'Medium' ? "bg-orange-100 text-orange-700" :
                          material.difficulty === 'Hard' ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {material.difficulty === 'Easy' ? (isHe ? 'קל' : 'Easy') : material.difficulty === 'Medium' ? (isHe ? 'בינוני' : 'Medium') : material.difficulty === 'Hard' ? (isHe ? 'קשה' : 'Hard') : (isHe ? 'מומחה' : 'Expert')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header solved metrics summary */}
                  {itemStats && itemStats.total > 0 && (
                    <div className="flex items-center gap-3 mr-auto ml-1 sm:ml-4 select-none animate-none shrink-0">
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2.5 py-1 rounded-full text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{isHe ? "פתרת" : "Solved"} {itemStats.total}</span>
                      </div>

                      {/* Dot indicators */}
                      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium font-mono">
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{itemStats.Easy}</span>
                        </span>
                        <span className="text-slate-200">|</span>
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-orange-400" />
                          <span>{itemStats.Medium}</span>
                        </span>
                        <span className="text-slate-200">|</span>
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span>{itemStats.Hard}</span>
                        </span>
                        <span className="text-slate-200">|</span>
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          <span>{itemStats.Expert}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {expandedId === material.id ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </button>

                {expandedId === material.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-5 pb-6 space-y-6 border-t border-slate-50 pt-5"
                  >
                    {/* Gamification Stats Card */}
                    <div className="bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1 text-right animate-none select-none">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                          {isHe ? "סטטוס התקדמות בפרק זה" : "Chapter Progress Status"}
                        </h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          {itemStats.total === 0 
                            ? (isHe ? "עדיין לא פתרת שאילתות בנושא זה. לחץ למטה על רמת קושי כדי להתחיל לתרגל!" : "You haven't solved any queries on this topic yet. Click a difficulty level below to practice!") 
                            : (isHe ? `פתרת בהצלחה ${itemStats.total} שאילתות בפרק זה! להלן הפירוט לפי רמות קושי:` : `Successfully solved ${itemStats.total} queries in this chapter! Difficulty breakdown:`)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 lg:flex items-center gap-2 w-full md:w-auto">
                        {([
                          { key: 'Easy', label: isHe ? 'קל' : 'Easy', color: 'text-green-700 bg-green-50 border-green-200' },
                          { key: 'Medium', label: isHe ? 'בינוני' : 'Medium', color: 'text-orange-700 bg-orange-50 border-orange-200' },
                          { key: 'Hard', label: isHe ? 'קשה' : 'Hard', color: 'text-red-700 bg-red-50 border-red-200' },
                          { key: 'Expert', label: isHe ? 'מומחה' : 'Expert', color: 'text-purple-700 bg-purple-50 border-purple-200' }
                        ] as const).map((lvl) => {
                          const solvedCount = itemStats[lvl.key] || 0;
                          return (
                            <div 
                              key={lvl.key}
                              className={cn(
                                "flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 min-w-[90px] md:min-w-[100px]",
                                lvl.color
                              )}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full", lvl.key === 'Easy' ? 'bg-green-500' : lvl.key === 'Medium' ? 'bg-orange-500' : lvl.key === 'Hard' ? 'bg-red-500' : 'bg-purple-500')} />
                                <span>{lvl.label}</span>
                              </span>
                              <span className="font-mono text-[13px] bg-white/60 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                                {solvedCount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isHe ? "מה זה כולל?" : "What's Included?"}</h4>
                      <p className="text-slate-700 text-sm leading-relaxed">{material.description}</p>
                    </div>

                  {activeSubTab === 'sql' ? (
                     <>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-2">
                        <h4 className="text-xs font-bold text-blue-700 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          {isHe ? "בעולם הביטוח" : "In the Insurance World"}
                        </h4>
                        <p className="text-blue-800 text-sm leading-relaxed">{(material as Material).insuranceContext}</p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isHe ? "דוגמת קוד" : "Code Sample"}</h4>
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                          <SyntaxHighlighter
                            language="sql"
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '1.25rem', fontSize: '0.85rem' }}
                          >
                            {(material as Material).example}
                          </SyntaxHighlighter>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          {isHe ? "טיפים למקצוענים" : "Pro Tips"}
                        </h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(material as Material).tips.map((tip, i) => (
                            <li key={i} className="bg-slate-100 p-3 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Interactive Custom Practice Section */}
                      <div className="bg-slate-50 p-4 shrink-0 rounded-2xl border border-slate-200 mt-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs md:text-sm">
                              <Target className="w-4 h-4 text-blue-600 animate-pulse" />
                              תרגול אינטראקטיבי בנושא
                            </div>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              רוצה לבדוק את עצמך? בחר רמת קושי והמערכת תייצר עבורך שאילתת תרגול ממוקדת על <strong>{material.title}</strong>:
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {(['Easy', 'Medium', 'Hard', 'Expert'] as const).map((diff) => {
                            const label = diff === 'Easy' ? 'קל' : diff === 'Medium' ? 'בינוני' : diff === 'Hard' ? 'קשה' : 'מומחה';
                            const badgeColor = 
                              diff === 'Easy' ? 'text-green-700 bg-green-50/50 border-green-200 hover:bg-green-50' :
                              diff === 'Medium' ? 'text-orange-700 bg-orange-50/55 border-orange-200 hover:bg-orange-50' :
                              diff === 'Hard' ? 'text-red-700 bg-red-50/50 border-red-200 hover:bg-red-50' :
                              'text-purple-700 bg-purple-50/50 border-purple-200 hover:bg-purple-50';

                            return (
                              <button
                                key={diff}
                                onClick={() => onStartTargetedPractice?.(material.title, diff)}
                                className={cn(
                                  "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer active:scale-95",
                                  badgeColor
                                )}
                              >
                                <span>התחל {label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isHe ? "מושגי מפתח" : "Key Concepts"}</h4>
                        <div className="flex flex-wrap gap-2">
                          {(material as InsuranceTopic).keyConcepts.map((concept, i) => (
                            <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-medium border border-blue-100">
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          {isHe ? "הלוגיקה העסקית (Business Logic)" : "The Business Logic"}
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {(material as InsuranceTopic).businessLogic}
                        </p>
                      </div>

                      {/* Interactive Custom Practice Section */}
                      <div className="bg-slate-50 p-4 shrink-0 rounded-2xl border border-slate-200 mt-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs md:text-sm">
                              <Target className="w-4 h-4 text-blue-600 animate-pulse" />
                              {isHe ? "תרגול אינטראקטיבי בנושא" : "Interactive Chapter Practice"}
                            </div>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              {isHe ? "רוצה לבדוק את עצמך? בחר רמת קושי והמערכת תייצר עבורך שאילתת תרגול ממוקדת על " : "Want to test yourself? Pick a difficulty and the system will generate a custom exercise focused on "} <strong>{material.title}</strong>:
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {(['Easy', 'Medium', 'Hard', 'Expert'] as const).map((diff) => {
                            const label = diff === 'Easy' ? (isHe ? 'קל' : 'Easy') : diff === 'Medium' ? (isHe ? 'בינוני' : 'Medium') : diff === 'Hard' ? (isHe ? 'קשה' : 'Hard') : (isHe ? 'מומחה' : 'Expert');
                            const badgeColor = 
                              diff === 'Easy' ? 'text-green-700 bg-green-50/50 border-green-200 hover:bg-green-50' :
                              diff === 'Medium' ? 'text-orange-700 bg-orange-50/55 border-orange-200 hover:bg-orange-50' :
                              diff === 'Hard' ? 'text-red-700 bg-red-50/50 border-red-200 hover:bg-red-50' :
                              'text-purple-700 bg-purple-50/50 border-purple-200 hover:bg-purple-50';

                            return (
                              <button
                                key={diff}
                                onClick={() => onStartTargetedPractice?.(material.title, diff)}
                                className={cn(
                                  "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer active:scale-95",
                                  badgeColor
                                )}
                              >
                                <span>{isHe ? "התחל" : "Start"} {label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
            );
          })}
        </div>

        {/* Pro Tip Footer */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <Lightbulb className="w-10 h-10 text-yellow-300" />
            </div>
            <div className="text-center md:text-right space-y-2">
              <h3 className="text-xl font-bold">{isHe ? "טיפ למיישם חוזה עסקי" : "Business Implementation Pro Tip"}</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                {activeSubTab === 'sql' 
                  ? (isHe 
                      ? "זכרו שהמטרה שלכם היא לא רק לכתוב קוד שעובד, אלא קוד שמשקף במדויק את הלוגיקה של פוליסת הביטוח. תמיד תשאלו את עצמכם: 'האם השאילתה הזו מטפלת נכון במקרים של ביטולים או הצמדה למדד?'"
                      : "Remember your goal is not just to write query syntax that runs, but code that precisely mirrors insurance policy logic. Always ask: 'Does this handle cancellations or index-linkage correctly?'")
                  : (isHe
                      ? "המומחיות שלכם היא הגשר בין העולם העסקי לטכני. ככל שתבינו טוב יותר את ה'למה' מאחורי כל כלל חיתום או רזרבה, כך השאילתות שלכם יהיו מדויקות ואמינות יותר."
                      : "Your technical/actuarial expertise bridges raw data to production business value. Understanding the 'why' behind rating factors or reserves turns basic SELECTs into precise enterprise analytics.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
