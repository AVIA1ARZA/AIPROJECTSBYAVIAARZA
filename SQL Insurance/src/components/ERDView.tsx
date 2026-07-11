import React, { useRef, useState, useMemo } from 'react';
import { Table } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Download, Loader2, Sparkles, Search, X, 
  UploadCloud, Send, MessageSquare, RotateCcw, Check, Plus, FileText, ChevronRight, ChevronDown, HelpCircle,
  Trash2, Edit3, Trash, History, Link, Unlink
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../lib/utils';
import { UserProfile, DBModel } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { parseUploadedSchema, schemaGeneratorChat } from '../services/geminiService';

interface ERDViewProps {
  isActive?: boolean;
  userProfile?: UserProfile | null;
  activeSchema: DBModel;
  allDatabases: DBModel[];
  onSelectSchema: (id: string) => Promise<void>;
  onSaveSchema: (schema: DBModel) => Promise<void>;
  onDeleteSchema?: (id: string) => Promise<void>;
  onRestoreSchema?: (id: string) => Promise<void>;
  onUpdateSchemaMetadata?: (id: string, name: string, description: string) => Promise<void>;
}

export const ERDView: React.FC<ERDViewProps> = ({ 
  isActive, 
  userProfile,
  activeSchema,
  allDatabases,
  onSelectSchema,
  onSaveSchema,
  onDeleteSchema,
  onRestoreSchema,
  onUpdateSchemaMetadata
}) => {
  const { isHe, language } = useLanguage();
  const erdRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Custom schema creator states
  const [workspaceMode, setWorkspaceMode] = useState<'view' | 'create_upload' | 'create_ai' | 'edit_active_ai' | 'edit_metadata' | 'versions' | 'relationships' | 'add_fields'>('view');
  
  // Relationship editor states
  const [relSourceTable, setRelSourceTable] = useState('');
  const [relSourceCol, setRelSourceCol] = useState('');
  const [relTargetTable, setRelTargetTable] = useState('');
  const [relTargetCol, setRelTargetCol] = useState('');

  // Field editor states
  const [fieldSourceTable, setFieldSourceTable] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('VARCHAR(100)');
  const [newFieldDesc, setNewFieldDesc] = useState('');
  const [newFieldValues, setNewFieldValues] = useState('');
  
  // Metadata edit state
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Restore version handler
  const handleRestoreVersion = async (version: any) => {
    const restoredDb: DBModel = {
      ...activeSchema,
      tables: version.tables,
      name: version.name,
      description: version.description
    };
    await onSaveSchema(restoredDb);
    setWorkspaceMode('view');
  };
  
  // Upload state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // AI Creator State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userDesc, setUserDesc] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);
  const [draftDb, setDraftDb] = useState<{ name: string; description: string; tables: Table[] } | null>(null);

  // Merge base schema with custom columns if active schema is the default insurance one
  const displayTables = useMemo(() => {
    const rawTables = activeSchema?.tables || [];
    if (activeSchema?.id !== 'insurance') return rawTables;
    if (!userProfile?.customSchema) return rawTables;

    return rawTables.map(table => {
      const customCols = userProfile.customSchema?.filter(col => col.table === table.name) || [];
      if (customCols.length === 0) return table;

      return {
        ...table,
        columns: [
          ...table.columns,
          ...customCols.map(col => ({
            name: col.name,
            type: col.type,
            description: col.description,
            isPrimary: false,
            isForeign: false,
            isCustom: true
          }))
        ]
      };
    });
  }, [activeSchema, userProfile?.customSchema]);

  const existingRelationships = useMemo(() => {
    const rels: { 
      sourceTable: string; 
      sourceCol: string; 
      targetTable: string; 
      targetCol: string; 
    }[] = [];
    
    displayTables.forEach(t => {
      t.columns.forEach(col => {
        if (col.isForeign && col.references) {
          const parts = col.references.split('.');
          const targetTable = parts[0] || '';
          const targetCol = parts[1] || '';
          rels.push({
            sourceTable: t.name,
            sourceCol: col.name,
            targetTable,
            targetCol
          });
        }
      });
    });
    
    return rels;
  }, [displayTables]);

  const handleAddRelationship = async () => {
    if (!relSourceTable || !relSourceCol || !relTargetTable || !relTargetCol) return;
    
    const updatedTables = displayTables.map(t => {
      if (t.name === relSourceTable) {
        return {
          ...t,
          columns: t.columns.map(col => {
            if (col.name === relSourceCol) {
              return {
                ...col,
                isForeign: true,
                references: `${relTargetTable}.${relTargetCol}`
              };
            }
            return col;
          })
        };
      }
      return t;
    });

    const isBaseDb = activeSchema.id === 'insurance';
    const finalSchema: DBModel = {
      ...activeSchema,
      id: isBaseDb ? `custom-edited-${Date.now()}` : activeSchema.id,
      name: isBaseDb ? `${activeSchema.name} (מותאם אישית)` : activeSchema.name,
      description: isBaseDb ? `${activeSchema.description} (עותק ערוך בתרשים)` : activeSchema.description,
      tables: updatedTables
    };
    await onSaveSchema(finalSchema);
    
    setRelSourceTable('');
    setRelSourceCol('');
    setRelTargetTable('');
    setRelTargetCol('');
  };

  const handleDeleteRelationship = async (sourceTable: string, sourceCol: string) => {
    const updatedTables = displayTables.map(t => {
      if (t.name === sourceTable) {
        return {
          ...t,
          columns: t.columns.map(col => {
            if (col.name === sourceCol) {
              return {
                ...col,
                isForeign: false,
                references: undefined
              };
            }
            return col;
          })
        };
      }
      return t;
    });

    const isBaseDb = activeSchema.id === 'insurance';
    const finalSchema: DBModel = {
      ...activeSchema,
      id: isBaseDb ? `custom-edited-${Date.now()}` : activeSchema.id,
      name: isBaseDb ? `${activeSchema.name} (מותאם אישית)` : activeSchema.name,
      description: isBaseDb ? `${activeSchema.description} (עותק ערוך בתרשים)` : activeSchema.description,
      tables: updatedTables
    };
    await onSaveSchema(finalSchema);
  };

  const activeCustomFields = useMemo(() => {
    const fields: { tableName: string; name: string; type: string; description: string; sampleValues?: string[] }[] = [];
    displayTables.forEach(t => {
      t.columns.forEach((col: any) => {
        if (col.isCustom) {
          fields.push({
            tableName: t.name,
            name: col.name,
            type: col.type,
            description: col.description,
            sampleValues: col.sampleValues
          });
        }
      });
    });
    return fields;
  }, [displayTables]);

  const handleAddField = async () => {
    if (!fieldSourceTable || !newFieldName.trim() || !newFieldType.trim()) return;

    const rawVals = newFieldValues.trim()
      ? newFieldValues.split(',').map(v => v.trim()).filter(Boolean)
      : undefined;

    const newCol = {
      name: newFieldName.trim(),
      type: newFieldType.trim(),
      description: newFieldDesc.trim(),
      sampleValues: rawVals,
      isCustom: true,
      isPrimary: false,
      isForeign: false
    };

    const updatedTables = displayTables.map(t => {
      if (t.name === fieldSourceTable) {
        if (t.columns.some((col: any) => col.name.toLowerCase() === newFieldName.trim().toLowerCase())) {
          return t;
        }
        return {
          ...t,
          columns: [...t.columns, newCol]
        };
      }
      return t;
    });

    const isBaseDb = activeSchema.id === 'insurance';
    const finalSchema: DBModel = {
      ...activeSchema,
      id: isBaseDb ? `custom-edited-${Date.now()}` : activeSchema.id,
      name: isBaseDb ? `${activeSchema.name} (מותאם אישית)` : activeSchema.name,
      description: isBaseDb ? `${activeSchema.description} (עותק ערוך בתרשים)` : activeSchema.description,
      tables: updatedTables
    };

    await onSaveSchema(finalSchema);

    setNewFieldName('');
    setNewFieldDesc('');
    setNewFieldValues('');
  };

  const handleDeleteField = async (tableName: string, colName: string) => {
    const updatedTables = displayTables.map(t => {
      if (t.name === tableName) {
        return {
          ...t,
          columns: t.columns.filter((col: any) => col.name !== colName)
        };
      }
      return t;
    });

    const isBaseDb = activeSchema.id === 'insurance';
    const finalSchema: DBModel = {
      ...activeSchema,
      id: isBaseDb ? `custom-edited-${Date.now()}` : activeSchema.id,
      name: isBaseDb ? `${activeSchema.name} (מותאם אישית)` : activeSchema.name,
      description: isBaseDb ? `${activeSchema.description} (עותק ערוך בתרשים)` : activeSchema.description,
      tables: updatedTables
    };

    await onSaveSchema(finalSchema);
  };

  const handleOpenAddField = (tableName: string) => {
    setFieldSourceTable(tableName);
    setWorkspaceMode('add_fields');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadPDF = async () => {
    if (!erdRef.current) return;
    setIsDownloading(true);
    
    try {
      const prevSearch = searchTerm;
      setSearchTerm('');
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(erdRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f1f5f9',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedErd = clonedDoc.getElementById('erd-capture-area');
          if (clonedErd) {
            clonedErd.style.padding = '40px';
          }
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            *, ::before, ::after {
              --tw-ring-color: transparent !important;
              --tw-shadow: none !important;
              --tw-shadow-colored: none !important;
              --tw-outline-color: transparent !important;
              --tw-ring-offset-color: transparent !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${activeSchema.name.replace(/\s+/g, '_')}_ERD_Schema.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setUploadLoading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error("קובץ ריק");

        const schemaData = await parseUploadedSchema(text, file.name, language);
        
        const newDb: DBModel = {
          id: `custom-${Date.now()}`,
          name: schemaData.name || `דאטהבייס שנפרס מ-${file.name}`,
          description: schemaData.description || "דאטהבייס מותאם אישית שהועלה על ידי המשתמש",
          tables: schemaData.tables
        };

        await onSaveSchema(newDb);
        setWorkspaceMode('view');
      } catch (err: any) {
        console.error("Error loading schema file:", err);
        setUploadError(isHe ? "שגיאה בפענוח קובץ הסכמה. ודא שהקובץ תקין וממחיש תרשים טבלאות." : "Error parsing diagram schema. Verify file formatting.");
      } finally {
        setUploadLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // AISchema Generator Chat Send
  const handleSendMessage = async () => {
    if (!userDesc.trim()) return;
    
    setAiLoading(true);
    setAiError(null);
    const textToSend = userDesc;
    setUserDesc('');

    // Append to message stream
    const updatedHistory = [
      ...chatHistory,
      { role: 'user' as const, parts: [{ text: textToSend }] }
    ];
    setChatHistory(updatedHistory);

    try {
      const response = await schemaGeneratorChat(
        textToSend,
        updatedHistory,
        draftDb?.tables || [],
        language
      );

      setDraftDb({
        name: response.name,
        description: response.description,
        tables: response.tables
      });

      setChatHistory([
        ...updatedHistory,
        { role: 'model' as const, parts: [{ text: response.explanation }] }
      ]);
    } catch (err: any) {
      console.error("AI custom DB generation error:", err);
      setAiError(isHe ? "חלה שגיאה בעיצוב הדאטהבייס על ידי ה-AI. אנא נסה שוב." : "Failed to generate DB with AI. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveDraftToProfile = async () => {
    if (!draftDb) return;
    const finalDb: DBModel = {
      id: `custom-ai-${Date.now()}`,
      name: draftDb.name,
      description: draftDb.description,
      tables: draftDb.tables
    };
    await onSaveSchema(finalDb);
    setDraftDb(null);
    setChatHistory([]);
    setWorkspaceMode('view');
  };

  const handleSaveEditToProfile = async () => {
    if (!draftDb) return;
    const isBaseDb = activeSchema.id === 'insurance';
    const finalDb: DBModel = {
      id: isBaseDb ? `custom-edited-${Date.now()}` : activeSchema.id,
      name: draftDb.name || activeSchema.name,
      description: draftDb.description || activeSchema.description,
      tables: draftDb.tables
    };
    await onSaveSchema(finalDb);
    setDraftDb(null);
    setChatHistory([]);
    setWorkspaceMode('view');
  };

  const activeDatabases = useMemo(() => allDatabases.filter(db => !db.isDeleted), [allDatabases]);
  const deletedDatabases = useMemo(() => allDatabases.filter(db => db.isDeleted), [allDatabases]);

  const handleStartEditMetadata = (db: DBModel) => {
    setEditingDbId(db.id);
    setEditName(db.name);
    setEditDesc(db.description);
    setWorkspaceMode('edit_metadata');
  };

  const handleSaveMetadata = async () => {
    if (editingDbId && onUpdateSchemaMetadata) {
      await onUpdateSchemaMetadata(editingDbId, editName, editDesc);
      setWorkspaceMode('view');
      setEditingDbId(null);
    }
  };

  const renderSidebarContent = (isMobileOrTablet = false) => (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            {isHe ? "סביבות דאטהבייס" : "Practice Databases"}
          </h3>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowTrash(!showTrash)}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer",
                showTrash 
                  ? "bg-amber-100 text-amber-700 shadow-sm ring-1 ring-amber-200" 
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              )}
              title={isHe ? (showTrash ? "חזרה לרשימה" : "פח מיחזור") : (showTrash ? "Back to list" : "Recycle Bin")}
            >
              {showTrash ? <Database className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
            {isMobileOrTablet && (
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mb-3 font-medium leading-relaxed">
          {showTrash 
            ? (isHe ? "ניהול דאטהבייסים שנמחקו. ניתן לשחזר אותם בכל עת." : "Manage deleted databases. They can be restored anytime.")
            : (isHe ? "בחרי מסד נתונים לתרגול וצפייה במודל הישויות:" : "Choose a database to view layout and practice queries:")
          }
        </p>

        <div className="space-y-2">
          {(showTrash ? deletedDatabases : activeDatabases).map((dbItem) => {
            const active = dbItem.id === activeSchema.id;
            const isBase = dbItem.id === 'insurance';
            
            return (
              <div key={dbItem.id} className="group relative">
                <button
                  onClick={() => {
                    onSelectSchema(dbItem.id);
                    if (isMobileOrTablet) setIsMobileSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full text-right p-3 rounded-xl border text-xs transition-all duration-300 relative overflow-hidden flex flex-col gap-1 cursor-pointer pr-3 pl-12",
                    active && !showTrash
                      ? "border-blue-500 bg-blue-50/70 font-bold text-blue-900 shadow-sm" 
                      : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  {active && !showTrash && (
                    <span className="absolute top-0 bottom-0 left-0 w-1.5 bg-blue-500"></span>
                  )}
                  <span className="font-bold block truncate">{dbItem.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[180px]">
                    {dbItem.description}
                  </span>
                </button>

                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  isHe ? "left-3" : "right-3"
                )}>
                  {showTrash ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRestoreSchema?.(dbItem.id); }}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title={isHe ? "שחזר" : "Restore"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      {!isBase && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStartEditMetadata(dbItem); }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title={isHe ? "ערוך פרטים" : "Edit Details"}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isBase && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteSchema?.(dbItem.id); }}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title={isHe ? "מחק" : "Delete"}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {showTrash && deletedDatabases.length === 0 && (
            <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Trash2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-400">{isHe ? "פח המיחזור ריק" : "Recycle bin is empty"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Controls for Creating/Editing Custom DBs */}
      <div className="p-4 border-b border-slate-100">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          {isHe ? "עריכה ויצירה עם AI" : "AI DB Editing & Creation"}
        </h4>
        
        <div className="space-y-2">
          <button
            onClick={() => {
              if (workspaceMode === 'edit_active_ai') {
                setWorkspaceMode('view');
              } else {
                setWorkspaceMode('edit_active_ai');
                setAiError(null);
                setDraftDb({
                  name: activeSchema.name,
                  description: activeSchema.description,
                  tables: activeSchema.tables
                });
                setChatHistory([]);
              }
              if (isMobileOrTablet) setIsMobileSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-center p-3 rounded-xl border gap-2 transition-all duration-200 cursor-pointer text-xs font-black shadow-sm",
              workspaceMode === 'edit_active_ai'
                ? "bg-purple-600 text-white border-purple-600 font-bold"
                : "bg-purple-50 hover:bg-purple-100/70 border-purple-100 text-purple-700 font-bold"
            )}
          >
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{isHe ? "ערוך דאטהבייס פעיל עם AI" : "Edit Active DB with AI"}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setWorkspaceMode(workspaceMode === 'create_upload' ? 'view' : 'create_upload');
                setUploadError(null);
                if (isMobileOrTablet) setIsMobileSidebarOpen(false);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl border gap-1.5 transition-all duration-200 cursor-pointer",
                workspaceMode === 'create_upload'
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <UploadCloud className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black">{isHe ? "העלאת סכמה" : "Upload DDL"}</span>
            </button>

            <button
              onClick={() => {
                if (workspaceMode === 'create_ai') {
                  setWorkspaceMode('view');
                } else {
                  setWorkspaceMode('create_ai');
                  setAiError(null);
                  setDraftDb(null);
                  setChatHistory([]);
                }
                if (isMobileOrTablet) setIsMobileSidebarOpen(false);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl border gap-1.5 transition-all duration-200 cursor-pointer",
                workspaceMode === 'create_ai'
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black">{isHe ? "חדש עם AI" : "New DB with AI"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Available Tables in Selected DB */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          {isHe ? "טבלאות בדאטהבייס הפעיל" : "Tables in Active DB"}
        </h4>
        <div className="space-y-1.5">
          {displayTables.map(t => (
            <a 
              href={`#table-${t.name}`}
              key={t.name}
              onClick={() => {
                if (isMobileOrTablet) setIsMobileSidebarOpen(false);
              }}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors text-[11px] font-semibold text-slate-700 font-mono"
            >
              <span>{t.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-slate-200/60 rounded text-slate-500">
                {t.columns.length}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden" dir={isHe ? "rtl" : "ltr"}>
      {/* Dynamic Selector Sidebar (Left/Right depending on language, currently standard rtl) */}
      <div className={cn("hidden lg:flex w-80 bg-white flex-col h-full shrink-0 shadow-sm border-slate-200", isHe ? "border-l" : "border-r")}>
        {renderSidebarContent(false)}
      </div>

      {/* Mobile/Tablet sliding drawers overlay for selecting and creating custom databases */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            {/* Drawer Container */}
            <motion.div 
              initial={{ x: isHe ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isHe ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed top-0 bottom-0 w-80 bg-white z-50 lg:hidden shadow-2xl flex flex-col h-full",
                isHe ? "right-0 border-l border-slate-200" : "left-0 border-r border-slate-200"
              )}
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Control Panel */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2 md:py-2.5 flex flex-col sm:flex-row justify-between items-center gap-3 z-20 shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              {isHe ? `תרשים קשרי ישויות (ERD) - ${activeSchema.name}` : `ERD Diagram - ${activeSchema.name}`}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {activeSchema.description}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:scale-[1.02] active:scale-95 border border-blue-200 rounded-xl transition-all shadow-sm font-extrabold text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer"
              title={isHe ? "סביבות דאטהבייס ויצירה עם AI" : "Database environments & AI generation"}
            >
              <Database className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{isHe ? "דאטהבייסים" : "Databases"}</span>
            </button>

            <div className="relative flex-1 sm:w-64 group">
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder={isHe ? "חפש טבלה או עמודה בסכמה..." : "Search table or column..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all text-xs font-semibold shadow-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setWorkspaceMode(workspaceMode === 'add_fields' ? 'view' : 'add_fields');
                if (fieldSourceTable === '') {
                  setFieldSourceTable(displayTables[0]?.name || '');
                }
              }}
              className={cn(
                "px-3 py-1.5 border rounded-xl transition-all shadow-sm font-extrabold text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer",
                workspaceMode === 'add_fields'
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white border-slate-200 text-slate-700 hover:text-purple-600 hover:bg-purple-50/20 active:bg-purple-50/50"
              )}
              title={isHe ? "הוספה וניהול של שדות וערכים לטבלאות" : "Manage and Add Fields and Values"}
            >
              <Plus className="w-3.5 h-3.5 text-purple-500 whitespace-nowrap animate-none" />
              {isHe ? "הוספת שדות" : "Add Fields"}
            </button>

            <button
              onClick={() => setWorkspaceMode(workspaceMode === 'relationships' ? 'view' : 'relationships')}
              className={cn(
                "px-3 py-1.5 border rounded-xl transition-all shadow-sm font-extrabold text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer",
                workspaceMode === 'relationships'
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50/20 active:bg-blue-50/50"
              )}
              title={isHe ? "עריכה ויצירה של קשרי גומלין" : "Edit or Create Relationships"}
            >
              <Link className="w-3.5 h-3.5" />
              {isHe ? "עריכת קשרים" : "Edit Relations"}
            </button>

            <button
              onClick={() => setWorkspaceMode(workspaceMode === 'versions' ? 'view' : 'versions')}
              disabled={activeSchema.id === 'insurance' || !activeSchema.history?.length}
              className={cn(
                "px-3 py-1.5 border rounded-xl transition-all shadow-sm font-extrabold text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer",
                workspaceMode === 'versions'
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-700 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              )}
              title={isHe ? "היסטוריית גרסאות" : "Version History"}
            >
              <History className="w-3.5 h-3.5" />
              {isHe ? "גרסאות" : "Versions"}
            </button>

            <button
              onClick={downloadPDF}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all shadow-sm font-extrabold text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isHe ? "שמור תרשים כ-PDF" : "Export PDF"}
            </button>
          </div>
        </div>

        {/* Dynamic Creation / Overlay Workspace */}
        <AnimatePresence mode="wait">
          {workspaceMode === 'create_upload' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 p-4 md:p-5 overflow-hidden shrink-0"
            >
              <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-blue-600" />
                      {isHe ? "העלאת קובץ סכמה או מבנה דאטהבייס" : "Upload Database Schema / Diagram File"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {isHe 
                        ? "מודל ה-AI ינתח כל קובץ שתעלי (קוד SQL DDL, קובץ JSON, או תיאור טקסטואלי) ויצור מיד מסד נתונים חדש לתרגול." 
                        : "The AI model will analyze any file content (SQL DDL script, raw JSON schema, or text) and establish a complete custom practice DB."}
                    </p>
                  </div>
                  <button 
                    onClick={() => setWorkspaceMode('view')}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
                    dragActive ? "border-blue-500 bg-blue-50/40" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".sql,.txt,.json,.csv,.erd"
                  />
                  {uploadLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-700 animate-pulse">
                        {isHe ? "קורא ומנתח את הסכמה בעזרת AI..." : "Parsing schema structures with Gemini..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-2">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">
                        {isHe ? "גרור והשלך קובץ לכאן, או לחץ לבחירת קובץ" : "Drag & drop files here, or click to browse files"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {isHe ? "תומך בקבצי SQL, CSV, JSON, TXT" : "Supports SQL scripts, CSV, JSON, TXT files"}
                      </span>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {uploadError}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {workspaceMode === 'create_ai' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 p-6 overflow-hidden shrink-0 shadow-inner"
            >
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-6 relative">
                <button 
                  onClick={() => setWorkspaceMode('view')}
                  className="absolute top-4 left-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Chat Panel */}
                <div className="flex flex-col h-[320px] bg-slate-50 rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      {isHe ? "שיחה עם מתכנן ה-AI של הדאטהבייס" : "AI DB Modeler Helper"}
                    </h4>
                  </div>

                  <div className="flex-1 overflow-y-auto mb-3 space-y-3 p-1 text-xs">
                    {chatHistory.length === 0 && (
                      <div className="bg-blue-50/50 p-3 rounded-lg text-blue-900 border border-blue-100 leading-relaxed">
                        {isHe 
                          ? "היי! תאר לי את הדאטהבייס שהיית רוצה לעצב. לדוגמה: 'אני רוצה חנות ספרים בה יש ספרים, לקוחות, הזמנות, ומחברים'. אוכל ליצור אותו באופן מושלם!" 
                          : "Hey! Describe the database schema you wish to build. For example: 'A book store with books, clients, invoices, and authors'."}
                      </div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "p-2.5 rounded-xl max-w-[85%] leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-blue-600 text-white mr-auto text-left" 
                            : "bg-white text-slate-800 border border-slate-100 ml-auto"
                        )}
                      >
                        {msg.parts[0].text}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100 ml-auto flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        <span>{isHe ? "ה-AI מחשב ומעצב את הטבלאות..." : "AI is model building..."}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userDesc}
                      disabled={aiLoading}
                      onChange={(e) => setUserDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
                      placeholder={isHe ? "תאר את הדאטהבייס או בקש שינויים..." : "Describe changes or database theme..."}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-sans"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={aiLoading || !userDesc.trim()}
                      className="p-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Preview Draft Tables */}
                <div className="flex flex-col h-[320px] bg-slate-50 rounded-xl border border-slate-100 p-4 overflow-hidden">
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-emerald-600" />
                      {draftDb?.name || (isHe ? "תצוגה מקדימה לסכמה החדשה" : "Draft DB Preview")}
                    </span>
                    {draftDb && (
                      <button
                        onClick={handleSaveDraftToProfile}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        {isHe ? "שמור והתחל לתרגל" : "Save & Practice"}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px]">
                    {draftDb ? (
                      <div>
                        <p className="text-[11px] font-sans text-slate-500 mb-3 bg-white border border-slate-100 p-2 rounded-lg italic">
                          {draftDb.description}
                        </p>
                        <div className="space-y-3 font-mono text-[10px]">
                          {draftDb.tables.map(tb => (
                            <div key={tb.name} className="bg-white border border-slate-100 rounded-lg p-2.5">
                              <div className="font-extrabold text-blue-700 border-b border-slate-100 pb-1 mb-1 flex items-center justify-between">
                                <span>{tb.name}</span>
                                <span className="text-[9px] font-normal font-sans text-slate-400 truncate max-w-[120px]" title={tb.description}>
                                  {tb.description}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {tb.columns.map(col => (
                                  <div key={col.name} className="flex justify-between text-slate-600 font-mono text-[9px]">
                                    <span className="flex items-center gap-1">
                                      {col.isPrimary && <span className="text-[8px] px-1 bg-blue-100 text-blue-700 rounded font-bold">PK</span>}
                                      {col.isForeign && <span className="text-[8px] px-1 bg-amber-100 text-amber-700 rounded font-bold">FK</span>}
                                      <span className="font-semibold">{col.name}</span>
                                    </span>
                                    <span className="text-slate-400">{col.type}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center font-sans">
                        <HelpCircle className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                        <span className="text-[11px] font-bold">
                          {isHe ? "הסכמה המוצעת תופיע כאן ברגע שתכתבי ל-AI" : "Draft database visualization will appear here"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {workspaceMode === 'versions' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 p-4 md:p-5 overflow-hidden shrink-0 shadow-inner"
            >
              <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 md:p-5 relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    {isHe ? `היסטוריית גרסאות - ${activeSchema.name}` : `Version History - ${activeSchema.name}`}
                  </h3>
                  <button 
                    onClick={() => setWorkspaceMode('view')}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(activeSchema.history || []).map((version, index) => (
                    <div 
                      key={version.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-indigo-300 transition-colors group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {new Date(version.createdAt).toLocaleString(isHe ? 'he-IL' : 'en-US')}
                          </span>
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{version.name}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold">
                          v{ (activeSchema.history?.length || 0) - index }
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 line-clamp-2 h-8 leading-relaxed">
                        {version.description}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-bold text-slate-400">
                          {version.tables.length} {isHe ? "טבלאות" : "tables"}
                        </span>
                        <button
                          onClick={() => handleRestoreVersion(version)}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {isHe ? "שחזר גרסה זו" : "Restore this version"}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {(!activeSchema.history || activeSchema.history.length === 0) && (
                    <div className="col-span-full py-12 text-center">
                      <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold text-sm">
                        {isHe ? "אין עדיין היסטוריית גרסאות לדאטהבייס זה" : "No version history available yet"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {workspaceMode === 'edit_metadata' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 p-4 md:p-5 overflow-hidden shrink-0 shadow-inner"
            >
              <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 md:p-5 relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    {isHe ? "עריכת פרטי דאטהבייס" : "Edit Database Metadata"}
                  </h3>
                  <button 
                    onClick={() => setWorkspaceMode('view')}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                      {isHe ? "שם הדאטהבייס" : "Database Name"}
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                      {isHe ? "תיאור" : "Description"}
                    </label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setWorkspaceMode('view')}
                      className="px-4 py-2 text-slate-600 text-xs font-bold hover:bg-slate-100 rounded-xl transition-all"
                    >
                      {isHe ? "ביטול" : "Cancel"}
                    </button>
                    <button
                      onClick={handleSaveMetadata}
                      className="px-6 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {isHe ? "עדכן פרטים" : "Update Details"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {workspaceMode === 'edit_active_ai' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 p-4 md:p-5 overflow-hidden shrink-0 shadow-inner"
            >
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-4 md:p-5 relative">
                <button 
                  onClick={() => setWorkspaceMode('view')}
                  className="absolute top-4 left-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Chat Panel */}
                <div className="flex flex-col h-[320px] bg-slate-50 rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-800">
                      {isHe ? `עריכת דאטהבייס עם AI - ${activeSchema.name}` : `Edit DB with AI - ${activeSchema.name}`}
                    </h4>
                  </div>

                  <div className="flex-1 overflow-y-auto mb-3 space-y-3 p-1 text-xs">
                    {chatHistory.length === 0 && (
                      <div className="bg-purple-50/70 p-3 rounded-lg text-purple-950 border border-purple-100 leading-relaxed font-semibold">
                        {isHe 
                          ? `היי! אני כאן לעזור לך לערוך ולשדרג את בסיס הנתונים "${activeSchema.name}". ספרי לי אילו שינויים ברצונך לבצע: לבטל טבלאות, להוסיף עמודות חדשות, לשנות סוגי נתונים או לעדכן מפתחות זרים.` 
                          : `Hi! I'm here to help you edit and upgrade the "${activeSchema.name}" database. Tell me what changes you want to make: drop tables, add columns, change data types, or update foreign keys.`}
                      </div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "p-2.5 rounded-xl max-w-[85%] leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-purple-600 text-white mr-auto text-left" 
                            : "bg-white text-slate-800 border border-slate-100 ml-auto"
                        )}
                      >
                        {msg.parts[0].text}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100 ml-auto flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        <span>{isHe ? "ה-AI מעדכן את הטבלאות..." : "AI is updating tables..."}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userDesc}
                      disabled={aiLoading}
                      onChange={(e) => setUserDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
                      placeholder={isHe ? "לדוגמה: תוסיף עמודת משכורת לטבלת שמאים..." : "E.g. add a wage column to agents..."}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-sans"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={aiLoading || !userDesc.trim()}
                      className="p-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Preview Draft Tables */}
                <div className="flex flex-col h-[320px] bg-slate-50 rounded-xl border border-slate-100 p-4 overflow-hidden">
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <span className="text-xs font-black text-slate-705 flex items-center gap-1.5 font-sans">
                      <Database className="w-4 h-4 text-emerald-600" />
                      {draftDb?.name || activeSchema.name} ({isHe ? "תצוגה מקדימה לשינויים" : "Changes Preview"})
                    </span>
                    {draftDb && (
                      <button
                        onClick={handleSaveEditToProfile}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        {isHe ? "שמור שינויים" : "Apply Changes"}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px]">
                    {draftDb ? (
                      <div>
                        <p className="text-[11px] font-sans text-slate-500 mb-3 bg-white border border-slate-100 p-2 rounded-lg italic">
                          {draftDb.description}
                        </p>
                        <div className="space-y-3 font-mono text-[10px]">
                          {draftDb.tables.map(tb => (
                            <div key={tb.name} className="bg-white border border-slate-100 rounded-lg p-2.5">
                              <div className="font-extrabold text-blue-700 border-b border-slate-100 pb-1 mb-1 flex items-center justify-between">
                                <span>{tb.name}</span>
                                <span className="text-[9px] font-normal font-sans text-slate-400 truncate max-w-[120px]" title={tb.description}>
                                  {tb.description}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {tb.columns.map(col => (
                                  <div key={col.name} className="flex justify-between text-slate-600 font-mono text-[9px]">
                                    <span className="flex items-center gap-1">
                                      {col.isPrimary && <span className="text-[8px] px-1 bg-blue-100 text-blue-700 rounded font-bold">PK</span>}
                                      {col.isForeign && <span className="text-[8px] px-1 bg-amber-100 text-amber-700 rounded font-bold">FK</span>}
                                      <span className="font-semibold">{col.name}</span>
                                    </span>
                                    <span className="text-slate-400">{col.type}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center font-sans">
                        <HelpCircle className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                        <span className="text-[11px] font-bold">
                          {isHe ? "הסכמה העדכנית תופיע כאן ברגע שתכתבי ל-AI" : "Draft database changes will appear here"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {workspaceMode === 'relationships' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 p-4 md:p-5 overflow-hidden shrink-0 shadow-inner"
            >
              <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 md:p-5 relative" dir={isHe ? "rtl" : "ltr"}>
                <button 
                  onClick={() => setWorkspaceMode('view')}
                  className="absolute top-4 left-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <Link className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      {isHe ? "ניהול קשרי גומלין (Relationships)" : "Relationship & Constraint Modeler"}
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-400">
                      {isHe 
                        ? "עריכת קשרים קיימים, מחיקתם או הגדרת קשרי גומלין חדשים בין טבלאות המודל כדי להמחיש מפתחות זרים."
                        : "Define model mappings, edit targets or tear down existing connections visually."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right">
                  {/* Create Relationship Panel */}
                  <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-4 md:p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                        <Plus className="w-3.5 h-3.5 text-blue-500" />
                        {isHe ? "הגדרת קשר חדש" : "Create New Relationship"}
                      </h4>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Source Table */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "טבלת מקור (הכוללת מפתח זר)" : "Source Table (has Foreign Key)"}
                            </label>
                            <select
                              value={relSourceTable}
                              onChange={(e) => {
                                setRelSourceTable(e.target.value);
                                setRelSourceCol('');
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="">{isHe ? "-- בחר טבלה --" : "-- Select Table --"}</option>
                              {displayTables.map(t => (
                                <option key={t.name} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Source Column */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "עמודת מקור" : "Source Column"}
                            </label>
                            <select
                              value={relSourceCol}
                              disabled={!relSourceTable}
                              onChange={(e) => setRelSourceCol(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40"
                            >
                              <option value="">{isHe ? "-- בחר עמודה --" : "-- Select Column --"}</option>
                              {(displayTables.find(t => t.name === relSourceTable)?.columns || []).map(col => (
                                <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-center py-1 opacity-60">
                          <Link className="w-5 h-5 text-slate-400 rotate-45" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Target Table */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "טבלת יעד (מקושרת)" : "Target Table (References)"}
                            </label>
                            <select
                              value={relTargetTable}
                              onChange={(e) => {
                                setRelTargetTable(e.target.value);
                                setRelTargetCol('');
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="">{isHe ? "-- בחר טבלה --" : "-- Select Table --"}</option>
                              {displayTables.map(t => (
                                <option key={t.name} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Target Column */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "עמודת יעד (לרוב מפתח ראשי)" : "Target Column (Usually Primary Key)"}
                            </label>
                            <select
                              value={relTargetCol}
                              disabled={!relTargetTable}
                              onChange={(e) => setRelTargetCol(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40"
                            >
                              <option value="">{isHe ? "-- בחר עמודה --" : "-- Select Column --"}</option>
                              {(displayTables.find(t => t.name === relTargetTable)?.columns || []).map(col => (
                                <option key={col.name} value={col.name}>
                                  {col.name} {col.isPrimary ? "(PK)" : ""} ({col.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleAddRelationship}
                      disabled={!relSourceTable || !relSourceCol || !relTargetTable || !relTargetCol}
                      className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {isHe ? "הוסף קשר גומלין חדש" : "Bind Relationship"}
                    </button>
                  </div>

                  {/* Existing Relationships List */}
                  <div className="lg:col-span-5 flex flex-col h-[320px] lg:h-auto min-h-[240px]">
                    <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                      <Database className="w-3.5 h-3.5 text-blue-500" />
                      {isHe ? "קשרים קיימים בסכמה" : "Existing Schema Ties"}
                    </h4>

                    <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 font-mono text-[10px]">
                      {existingRelationships.map((rel, idx) => (
                        <div 
                          key={`${rel.sourceTable}-${rel.sourceCol}-${idx}`}
                          className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center group/item hover:border-red-200 transition-colors"
                        >
                          <div className="flex flex-col gap-0.5 text-right">
                            <span className="font-extrabold text-slate-800 tracking-tight">
                              {rel.sourceTable}.{rel.sourceCol}
                            </span>
                            <span className="text-slate-400 font-bold block text-[8px] tracking-wide uppercase">
                              {isHe ? "➔ מקשר אל:" : "➔ References:"} {rel.targetTable}.{rel.targetCol}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteRelationship(rel.sourceTable, rel.sourceCol)}
                            className="p-1 px-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-all font-sans text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title={isHe ? "בטל קשר" : "Delete Constraint"}
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span className="text-[9px] uppercase font-bold">{isHe ? "בטל" : "Unbind"}</span>
                          </button>
                        </div>
                      ))}

                      {existingRelationships.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center font-sans">
                          <HelpCircle className="w-8 h-8 text-slate-300 mb-1.5 stroke-[1.5]" />
                          <span className="text-[11px] font-bold">
                            {isHe ? "אין קשרי גומלין מוגדרים במסד הנתונים" : "No relationships configured yet"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {workspaceMode === 'add_fields' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-b border-slate-200 p-4 md:p-5 overflow-hidden shrink-0 shadow-inner"
            >
              <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 md:p-5 relative" dir={isHe ? "rtl" : "ltr"}>
                <button 
                  onClick={() => setWorkspaceMode('view')}
                  className="absolute top-4 left-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      {isHe ? "הוספה וניהול של שדות חדשים" : "Add & Manage Custom Fields"}
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-400">
                      {isHe 
                        ? "הוסיפי שדות חדשים לטבלאות קיימות, והגדירי את הערכים שיופיעו בהם לצורך המחשה ומיקוד עסקי של מסד הנתונים."
                        : "Add new custom fields to existing schema tables, and define their sample values to model elementary business states."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right">
                  {/* Create Field Form */}
                  <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-4 md:p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                        <Plus className="w-3.5 h-3.5 text-purple-600" />
                        {isHe ? "הוספת שדה חדש" : "Define New Field"}
                      </h4>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Pick Table */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "טבלה לתוספת שדה" : "Select Target Table"}
                            </label>
                            <select
                              value={fieldSourceTable}
                              onChange={(e) => setFieldSourceTable(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                            >
                              <option value="">{isHe ? "-- בחר טבלה --" : "-- Select Table --"}</option>
                              {displayTables.map(t => (
                                <option key={t.name} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Field name */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "שם השדה (Column Name)" : "Field Name (snake_case)"}
                            </label>
                            <input
                              type="text"
                              value={newFieldName}
                              onChange={(e) => setNewFieldName(e.target.value)}
                              placeholder={isHe ? "customer_preference" : "customer_preference"}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white text-left font-mono"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Field type */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "סוג הנתונים (Data Type)" : "Data Type"}
                            </label>
                            <div className="space-y-1.5">
                              <select
                                value={newFieldType}
                                onChange={(e) => setNewFieldType(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                              >
                                <option value="VARCHAR(50)">VARCHAR(50)</option>
                                <option value="VARCHAR(100)">VARCHAR(100)</option>
                                <option value="VARCHAR(255)">VARCHAR(255)</option>
                                <option value="INT">INT</option>
                                <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                                <option value="BOOLEAN">BOOLEAN</option>
                                <option value="TEXT">TEXT</option>
                                <option value="TIMESTAMP">TIMESTAMP</option>
                              </select>
                              <div className="flex gap-1 flex-wrap">
                                {['VARCHAR(50)', 'INT', 'BOOLEAN', 'DECIMAL(10,2)'].map(preset => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setNewFieldType(preset)}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-600 rounded text-[8px] font-bold text-slate-500 border border-slate-200 cursor-pointer transition-colors"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Field Desc */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isHe ? "תיאור השדה (מה מטרתו?)" : "Field Description (Purpose)"}
                            </label>
                            <input
                              type="text"
                              value={newFieldDesc}
                              onChange={(e) => setNewFieldDesc(e.target.value)}
                              placeholder={isHe ? "כיסוי מבוקש למטרות מוגדרות" : "preference for extra coverage"}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
                            />
                          </div>
                        </div>

                        {/* Defining Column values */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            {isHe ? "הגדרת ערכים שיופיעו בשדה (מופרדים בפסיק)" : "Define values to appear in this field (comma-separated)"}
                          </label>
                          <input
                            type="text"
                            value={newFieldValues}
                            onChange={(e) => setNewFieldValues(e.target.value)}
                            placeholder={isHe ? "Comprehensive, Third Party, EcoPremium" : "Comprehensive, Third Party, EcoPremium"}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
                          />
                          <p className="text-[9px] text-slate-400 mt-1 font-medium">
                            {isHe 
                              ? "משמש להגדרת ערכים לדוגמה שיוצגו בטבלה, ויעזרו להמחיש את השדה החדש." 
                              : "Sets sample values to visually mock and clarify what this field represents."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleAddField}
                      disabled={!fieldSourceTable || !newFieldName.trim() || !newFieldType.trim()}
                      className="mt-6 w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {isHe ? "הוסף שדה חדש ושמור סכמה" : "Add Field & Save Schema"}
                    </button>
                  </div>

                  {/* List of custom fields */}
                  <div className="lg:col-span-5 flex flex-col h-[320px] lg:h-auto min-h-[240px]">
                    <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      {isHe ? "שדות מותאמים אישית שהוספת" : "Your Custom Fields"}
                    </h4>

                    <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 font-mono text-[10px]">
                      {activeCustomFields.map((field, idx) => (
                        <div 
                          key={`${field.tableName}-${field.name}-${idx}`}
                          className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center group hover:border-red-200 transition-colors"
                        >
                          <div className="flex flex-col gap-0.5 text-right flex-1 min-w-0 pr-1">
                            <span className="font-extrabold text-slate-800 tracking-tight block truncate">
                              {field.tableName}.{field.name} <span className="text-[9px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">{field.type}</span>
                            </span>
                            {field.description && (
                              <p className="text-slate-400 font-sans font-semibold text-[9px] mt-0.5 block truncate">
                                {isHe ? "תיאור:" : "Desc:"} {field.description}
                              </p>
                            )}
                            {field.sampleValues && field.sampleValues.length > 0 && (
                              <p className="text-slate-500 font-sans font-extrabold text-[9px] mt-0.5 block truncate">
                                {isHe ? "ערכים מוגדרים:" : "Defined values:"} {field.sampleValues.join(', ')}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteField(field.tableName, field.name)}
                            className="p-1 px-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-all font-sans text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 ml-2 animate-none"
                            title={isHe ? "מחק שדה" : "Delete custom field"}
                          >
                            <Trash className="w-3.5 h-3.5" />
                            <span className="text-[9px] uppercase font-bold">{isHe ? "מחק" : "Delete"}</span>
                          </button>
                        </div>
                      ))}

                      {activeCustomFields.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center font-sans">
                          <Sparkles className="w-8 h-8 text-slate-300 mb-1.5 stroke-[1.5]" />
                          <span className="text-[11px] font-bold">
                            {isHe ? "לא הוספו שדות מותאמים אישית עדיין" : "No custom fields added yet"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The ERD Render Area Canvas */}
        <div className="flex-1 overflow-auto p-8 bg-slate-100/60" ref={erdRef} id="erd-capture-area">
          <div className="max-w-[1600px] mx-auto min-h-[900px]">
            {displayTables.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 font-sans" dir="rtl">
                <Database className="w-12 h-12 text-slate-300 mb-2 animate-pulse" />
                <span className="text-xs font-extrabold">{isHe ? "אין טבלאות להצגה בדאטהבייס זה ספציפית." : "No tables found in this database."}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative">
                {displayTables.map((table, idx) => (
                  <TableCard 
                    key={table.name} 
                    table={table} 
                    index={idx} 
                    searchTerm={searchTerm}
                    onAddFieldClick={handleOpenAddField}
                    onDeleteFieldClick={handleDeleteField}
                  />
                ))}
              </div>
            )}

            {/* Legend card */}
            <div className="mt-16 p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-2xl font-sans">
              <h3 className="text-sm font-black mb-4 text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                {isHe ? "מקרא קשרים וסמלים" : "Legend & Guidelines"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-4 flex items-center justify-center bg-blue-50 text-blue-700 rounded text-[9px] font-extrabold border border-blue-200">PK</span>
                    <span className="text-xs font-extrabold text-slate-700">Primary Key</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    {isHe ? "מפתח ראשי מזהה ייחודי." : "Primary key identifier."}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-4 flex items-center justify-center bg-amber-50 text-amber-700 rounded text-[9px] font-extrabold border border-amber-200">FK</span>
                    <span className="text-xs font-extrabold text-slate-700">Foreign Key</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    {isHe ? "מפתח זר המשייך לרשומה אחרת." : "Foreign key relation."}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-4 flex items-center justify-center bg-purple-50 text-purple-700 rounded text-[9px] font-extrabold border border-purple-200">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                    </span>
                    <span className="text-xs font-extrabold text-slate-700">Custom Column</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    {isHe ? "ייחודי לענף הביטוח." : "Added for elementary business goals."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TableCard: React.FC<{ 
  table: any; 
  index: number; 
  searchTerm: string;
  onAddFieldClick: (tableName: string) => void;
  onDeleteFieldClick?: (tableName: string, colName: string) => void;
}> = ({ table, index, searchTerm, onAddFieldClick, onDeleteFieldClick }) => {
  const { isHe } = useLanguage();
  const isSearchActive = searchTerm.length > 0;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const matchesTable = useMemo(() => {
    if (!isSearchActive) return true;
    const term = searchTerm.toLowerCase();
    return (
      table.name.toLowerCase().includes(term) ||
      (table.description && table.description.toLowerCase().includes(term)) ||
      table.columns.some((col: any) => 
        col.name.toLowerCase().includes(term) || 
        col.type.toLowerCase().includes(term) ||
        (col.description && col.description.toLowerCase().includes(term))
      )
    );
  }, [table, searchTerm, isSearchActive]);

  const isDimmed = isSearchActive && !matchesTable;
  const showFields = isExpanded || (isSearchActive && matchesTable);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isDimmed ? 0.35 : 1, 
        scale: matchesTable && isSearchActive ? 1.03 : 1,
        borderColor: matchesTable && isSearchActive ? 'rgb(59, 130, 246)' : 'rgb(226, 232, 240)'
      }}
      transition={{ 
        duration: 0.25,
        delay: isSearchActive ? 0 : index * 0.03 
      }}
      id={`table-${table.name}`}
      className={cn(
        "bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col min-w-[240px] font-sans h-fit",
        matchesTable && isSearchActive ? "border-blue-500 ring-4 ring-blue-500/10 z-10" : "border-slate-200"
      )}
    >
      <div 
        id={`table-header-${table.name}`}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "p-3.5 text-white font-mono text-xs flex justify-between items-center border-b transition-colors cursor-pointer select-none hover:opacity-95 active:scale-[0.99]",
          matchesTable && isSearchActive ? "bg-blue-600 border-blue-500" : "bg-slate-800 border-slate-700"
        )}
      >
        <span className="font-extrabold tracking-tight">
          {table.name.toLowerCase().includes(searchTerm.toLowerCase()) && isSearchActive ? (
            <mark className="bg-yellow-200 text-slate-800 rounded px-1">{table.name}</mark>
          ) : (
            table.name
          )}
        </span>
        <div className="flex items-center gap-2">
          <Database className={cn("w-4 h-4 text-blue-400")} />
          <ChevronDown className={cn("w-3.5 h-3.5 text-slate-300 transition-transform duration-200", showFields ? "rotate-180" : "rotate-0")} />
        </div>
      </div>
      
      {table.description && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 italic leading-snug">
          {table.description}
        </div>
      )}
 
      <AnimatePresence initial={false}>
        {showFields && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="text-[8px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-4 py-1.5 font-bold">{searchTerm ? "Column" : "עמודה"}</th>
                  <th className="px-4 py-1.5 font-bold text-left">{searchTerm ? "Type" : "סוג"}</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-mono">
                {table.columns.map((col: any) => {
                  const colMatches = isSearchActive && (
                    col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    col.type.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  
                  return (
                    <tr 
                      key={col.name} 
                      id={`col-${table.name}-${col.name}`}
                      className={cn(
                        "border-t border-slate-50 group hover:bg-slate-50 transition-colors",
                        colMatches ? "bg-blue-50" : ""
                      )}
                    >
                      <td className="px-4 py-2 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {col.isPrimary && (
                            <span className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-bold border border-blue-200 font-sans" title="Primary Key">
                              PK
                            </span>
                          )}
                          {col.isForeign && (
                            <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-bold border border-amber-200 font-sans" title={`Foreign Key to ${col.references}`}>
                              FK
                            </span>
                          )}
                          {col.isCustom && (
                            <span className="px-1 py-0.5 bg-purple-50 text-purple-600 rounded text-[8px] font-bold border border-purple-200 font-sans flex items-center justify-center" title="Custom Column">
                              <Sparkles className="w-2 h-2" />
                            </span>
                          )}
                          <span className={cn(
                            "font-semibold",
                            colMatches ? "text-blue-900 font-extrabold" : (col.isPrimary ? "text-blue-700" : col.isForeign ? "text-amber-700" : col.isCustom ? "text-purple-700" : "text-slate-700")
                          )} title={col.description}>
                            {colMatches ? (
                              <mark className="bg-yellow-200 text-slate-800 rounded px-1">{col.name}</mark>
                            ) : (
                              col.name
                            )}
                          </span>
                        </div>
                        {col.description && (
                          <span className="text-[9px] text-slate-400 font-sans tracking-tight block max-w-[180px] break-words font-medium">
                            {col.description}
                          </span>
                        )}
                        {col.sampleValues && col.sampleValues.length > 0 && (
                          <div className="flex flex-col gap-0.5 mt-0.5 max-w-[180px]">
                            <span className="text-[8px] font-sans font-extrabold text-purple-600 tracking-wider uppercase">
                              {isHe ? "ערכים מוגדרים:" : "Defined values:"}
                            </span>
                            <span className="text-[9px] text-slate-600 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded break-all font-medium leading-relaxed">
                              {col.sampleValues.join(', ')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-[10px] text-left">
                        <div className="flex items-center justify-between gap-1">
                          <span>
                            {colMatches ? (
                              <mark className="bg-yellow-200 text-slate-800 rounded px-1">{col.type}</mark>
                            ) : (
                              col.type
                            )}
                          </span>
                          {col.isCustom && onDeleteFieldClick && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFieldClick(table.name, col.name);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer ml-1 animate-none shrink-0"
                              title={isHe ? "מחק שדה" : "Delete field"}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddFieldClick(table.name); 
                }}
                className="w-full py-1.5 text-center bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 rounded-xl text-[10px] font-black border border-slate-200 hover:border-purple-200 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
              >
                <Plus className="w-3 h-3 text-purple-600" />
                <span>{isHe ? "הוספת שדה חדש לטבלה" : "Add Field to Table"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
