import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookMarked, FileText, Trash2, ShieldAlert, Sparkles, Plus, Check, MessageSquare } from 'lucide-react';
import { AWSQuestion, UserState, StudyNote } from '../types';
import { PREBUILT_QUESTIONS, AWS_DOMAINS } from '../data/awsQuestions';

interface ReviewCenterProps {
  userState: UserState;
  onRemoveBookmark: (questionId: string) => void;
  onSaveNote: (topic: string, domainId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onNavigateToTab: (tabId: string) => void;
  onAskCoachAboutQuestion: (question: AWSQuestion) => void;
}

export default function ReviewCenter({
  userState,
  onRemoveBookmark,
  onSaveNote,
  onDeleteNote,
  onNavigateToTab,
  onAskCoachAboutQuestion
}: ReviewCenterProps) {
  const currentExam = userState.examType;
  const domains = AWS_DOMAINS[currentExam];

  // Notes Form State
  const [topic, setTopic] = useState<string>('');
  const [selectedDomainId, setSelectedDomainId] = useState<string>(domains[0]?.id || 'CLF_D1');
  const [content, setContent] = useState<string>('');

  // Filtering reviews or notes tab
  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'notes'>('bookmarks');

  // Bookmarked questions matching current exam
  const bookmarkedQuestions = PREBUILT_QUESTIONS.filter(q => 
    q.examType === currentExam && userState.bookmarks.includes(q.id)
  );

  // Active study notes for this exam
  const studyNotes = userState.notes.filter(note => note.examType === currentExam);

  const handleCreateNoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !content.trim()) return;
    onSaveNote(topic, selectedDomainId, content);
    setTopic('');
    setContent('');
  };

  return (
    <div className="space-y-6" id="review-tab">
      
      {/* Sub tabs Selector */}
      <div className="flex border-b border-slate-200">
        <button
          id="bookmarks-subtab-btn"
          onClick={() => setActiveSubTab('bookmarks')}
          className={`px-5 py-3 font-display font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'bookmarks'
              ? 'border-amber-500 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Bookmarked Questions ({bookmarkedQuestions.length})
        </button>
        <button
          id="notes-subtab-btn"
          onClick={() => setActiveSubTab('notes')}
          className={`px-5 py-3 font-display font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'notes'
              ? 'border-amber-500 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Personal Study Notes ({studyNotes.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: BOOKMARK REVIEWS */}
        {activeSubTab === 'bookmarks' && (
          <motion.div
            key="bookmarks-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {bookmarkedQuestions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-4 shadow-sm">
                <BookMarked className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-700">Your Study Checklist is Empty</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When practicing or generating custom scenarios, toggle the **Bookmark** button to flag difficult questions here for active revision.
                  </p>
                </div>
                <button
                  id="nav-to-practice-shortcuts"
                  onClick={() => onNavigateToTab('practice')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Start Practicing Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookmarkedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[9px] font-mono font-semibold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          {domains.find(d => d.id === q.domainId)?.name.split(':')[0]}
                        </span>
                        
                        {/* Remove Bookmark trigger */}
                        <button
                          id={`remove-bookmark-btn-${q.id}`}
                          onClick={() => onRemoveBookmark(q.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Unbookmark Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700 text-xs italic leading-relaxed">
                        "{q.scenario}"
                      </div>

                      <h4 className="text-slate-800 text-sm font-bold leading-snug">
                        {q.questionText}
                      </h4>

                      {/* Correct Option preview badge */}
                      <div className="bg-emerald-50 text-emerald-950 p-3 rounded-xl border border-emerald-100 text-xs flex gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Correct Solution: </span>
                          {q.options[q.correctAnswerIndex]}
                        </div>
                      </div>

                      {/* Explanation box */}
                      <div className="text-xs text-slate-500 leading-relaxed font-sans pt-2 border-t border-slate-100">
                        {q.explanation}
                      </div>
                    </div>

                    <button
                      id={`bookmark-explain-coach-${q.id}`}
                      onClick={() => {
                        onAskCoachAboutQuestion(q);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs py-2 rounded-xl transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Consult AI Coach about this Question
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: STUDY NOTES BOARD */}
        {activeSubTab === 'notes' && (
          <motion.div
            key="notes-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            
            {/* Note Composer Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 font-display">Notes Composer</h3>
                <p className="text-[11px] text-slate-400">Save critical terminology, formulas, or study notes:</p>
              </div>

              <form onSubmit={handleCreateNoteSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Topic Header</label>
                  <input
                    id="note-topic-input"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Bedrock Guardrails vs. IAM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Syllabus Domain</label>
                  <select
                    id="note-domain-dropdown"
                    value={selectedDomainId}
                    onChange={(e) => setSelectedDomainId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 transition-all cursor-pointer"
                  >
                    {domains.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name.split(':')[0]} ({d.percentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Study Content</label>
                  <textarea
                    id="note-content-input"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type key definitions or summaries here..."
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-amber-500 transition-all resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  id="save-study-note-btn"
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Save Note to Board
                </button>
              </form>
            </div>

            {/* Notes Visual Board */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wider font-mono">Personal Sticky Notes Board</h3>
              
              {studyNotes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-4 shadow-sm">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-700">No Custom Study Notes</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Use the composer panel to register custom memory items, formulas, or summaries in your personal offline board!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {studyNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            {domains.find(d => d.id === note.domainId)?.name.split(':')[0]}
                          </span>
                          
                          <button
                            id={`delete-note-btn-${note.id}`}
                            onClick={() => onDeleteNote(note.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-800 leading-snug">
                          {note.topic}
                        </h4>

                        <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono text-right pt-2 border-t border-slate-100">
                        {note.createdAt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
