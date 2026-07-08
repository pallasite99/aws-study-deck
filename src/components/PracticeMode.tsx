import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Bookmark, BookmarkCheck, HelpCircle, AlertCircle, RefreshCw, MessageSquare, Check, X, ShieldAlert, Cpu } from 'lucide-react';
import { AWSQuestion, UserState, AWSExamType } from '../types';
import { PREBUILT_QUESTIONS, AWS_DOMAINS } from '../data/awsQuestions';

interface PracticeModeProps {
  userState: UserState;
  onAnswerQuestion: (questionId: string, selectedIndex: number, isCorrect: boolean) => void;
  onToggleBookmark: (questionId: string) => void;
  onAskCoachAboutQuestion: (question: AWSQuestion) => void;
  onConsumeCredit: () => boolean; // returns true if has credits and decrements
  aiEngineReady: boolean;
  onAddGeneratedQuestion: (question: AWSQuestion) => void;
}

const GENERATION_STEPS = [
  "Provisioning AWS Trainer instance...",
  "Querying AWS exam blueprint specs...",
  "Drafting realistic enterprise scenario...",
  "Formulating deep syllabus explanations...",
  "Assembling final interactive MCQ choices..."
];

export default function PracticeMode({
  userState,
  onAnswerQuestion,
  onToggleBookmark,
  onAskCoachAboutQuestion,
  onConsumeCredit,
  aiEngineReady,
  onAddGeneratedQuestion
}: PracticeModeProps) {
  const currentExam = userState.examType;
  const domains = AWS_DOMAINS[currentExam];

  // Selected domain state
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  
  // Track active question list (mix of prebuilt + generated for this session)
  const [questions, setQuestions] = useState<AWSQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // User input selection state
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);

  // Generating animation/state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genStepIdx, setGenStepIdx] = useState<number>(0);
  const [genError, setGenError] = useState<string | null>(null);

  // Sync selected domain from global state if changed
  useEffect(() => {
    if (userState.selectedDomainId) {
      setSelectedDomainId(userState.selectedDomainId);
      // Reset after consuming
      userState.selectedDomainId = 'all';
    }
  }, [userState.selectedDomainId]);

  // Load questions when exam type or selected domain changes
  useEffect(() => {
    const filtered = PREBUILT_QUESTIONS.filter(q => {
      const matchExam = q.examType === currentExam;
      const matchDomain = selectedDomainId === 'all' || q.domainId === selectedDomainId;
      return matchExam && matchDomain;
    });
    setQuestions(filtered);
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswerRevealed(false);
  }, [currentExam, selectedDomainId]);

  // Multi-step generation animation text
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setGenStepIdx(prev => (prev + 1) % GENERATION_STEPS.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const currentQuestion: AWSQuestion | undefined = questions[currentIndex];

  const handleSelectOption = (index: number) => {
    if (isAnswerRevealed) return;
    setSelectedOptionIndex(index);
  };

  const handleRevealAnswer = () => {
    if (selectedOptionIndex === null || !currentQuestion) return;
    setIsAnswerRevealed(true);
    const isCorrect = selectedOptionIndex === currentQuestion.correctAnswerIndex;
    onAnswerQuestion(currentQuestion.id, selectedOptionIndex, isCorrect);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswerRevealed(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOptionIndex(null);
      setIsAnswerRevealed(false);
    }
  };

  const handleToggleSave = () => {
    if (currentQuestion) {
      onToggleBookmark(currentQuestion.id);
    }
  };

  // Generate a brand new AWS Scenario question using Gemini API
  const handleGenerateAIScenario = async () => {
    setGenError(null);

    // 1. Check/Consume credit
    const creditConsumed = onConsumeCredit();
    if (!creditConsumed) {
      setGenError("You have consumed all your AI generation tokens for this session! Refill them on the Dashboard tab.");
      return;
    }

    setIsGenerating(true);
    setGenStepIdx(0);

    const activeDomain = selectedDomainId === 'all' 
      ? domains[Math.floor(Math.random() * domains.length)]
      : domains.find(d => d.id === selectedDomainId) || domains[0];

    try {
      const response = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType: currentExam,
          domainName: activeDomain.name,
          domainId: activeDomain.id,
          difficulty: "Medium",
          simulate503: !!userState.simulate503
        })
      });

      const data = await response.json();

      if (data.fallback) {
        // Fallback triggered: choose a prebuilt from this domain that isn't already the current one
        const fallbackQs = PREBUILT_QUESTIONS.filter(q => q.examType === currentExam && q.domainId === activeDomain.id);
        if (fallbackQs.length > 0) {
          const chosen = fallbackQs[Math.floor(Math.random() * fallbackQs.length)];
          // Inject as a custom generated clone to let them play with it
          const clonedQuestion: AWSQuestion = {
            ...chosen,
            id: `gen_fallback_${Date.now()}`,
            isAIGenerated: true,
            scenario: `[FALLBACK ENGINED ALIGNMENT] ${chosen.scenario}`,
            modelUsed: "Local Grounding Static Engine"
          };
          onAddGeneratedQuestion(clonedQuestion);
          setQuestions(prev => [clonedQuestion, ...prev]);
          setCurrentIndex(0);
        } else {
          throw new Error("No prebuilt questions in this domain found for fallback.");
        }
      } else {
        const newQuestion: AWSQuestion = {
          ...data.question,
          modelUsed: data.modelUsed || "gemini-2.5-flash"
        };
        onAddGeneratedQuestion(newQuestion);
        setQuestions(prev => [newQuestion, ...prev]);
        setCurrentIndex(0);
      }

    } catch (err: any) {
      console.error(err);
      setGenError("Failed to connect to the AWS AI generation node. Please try again or study offline prebuilt questions!");
    } finally {
      setIsGenerating(false);
    }
  };

  const isBookmarked = currentQuestion ? userState.bookmarks.includes(currentQuestion.id) : false;

  return (
    <div className="space-y-6" id="practice-tab">
      
      {/* Configuration Strip */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-mono text-slate-400 uppercase">Focus Domain:</span>
          <select
            id="domain-filter-dropdown"
            value={selectedDomainId}
            onChange={(e) => setSelectedDomainId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3.5 rounded-xl outline-none focus:border-amber-500 transition-colors cursor-pointer w-full sm:w-64"
          >
            <option value="all">Practice All Domains Combined</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>
                Domain {d.id.slice(-1)}: {d.name.split(':')[1] || d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Generate custom scenario trigger */}
        <button
          id="generate-scenario-btn"
          onClick={handleGenerateAIScenario}
          disabled={isGenerating}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs py-2.5 px-5 rounded-xl shadow-md transition-all duration-300 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
          Generate AI AWS Scenario
        </button>
      </div>

      {/* Error or Quota Warning */}
      {genError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 text-rose-700 text-xs items-center">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="flex-1 font-medium">{genError}</div>
          <button onClick={() => setGenError(null)} className="text-rose-400 hover:text-rose-600 text-sm font-bold">Dismiss</button>
        </div>
      )}

      {/* Main Study Arena */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            /* Gemini Loading State */
            <motion.div
              key="generating-loader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-white space-y-6 flex flex-col items-center justify-center min-h-[400px] shadow-xl"
            >
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"></div>
              
              <div className="relative">
                <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                <Sparkles className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-bold font-display text-white">Gemini is drafting an AWS challenge</h3>
                <p className="text-slate-400 text-xs font-mono py-1 px-3 bg-slate-950 rounded-lg inline-block animate-pulse border border-slate-800">
                  {GENERATION_STEPS[genStepIdx]}
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Every scenario combines business challenges, pricing optimizations, and technical design patterns extracted directly from the actual AWS certification syllabus.
                </p>
              </div>
            </motion.div>
          ) : !currentQuestion ? (
            /* No Questions Warning */
            <motion.div
              key="no-questions-state"
              className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 space-y-4 shadow-sm"
            >
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-700">No Custom Scenarios Available</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  To practice this syllabus domain, trigger our **AI Scenario Generator** above or select another domain from the dropdown filter.
                </p>
              </div>
            </motion.div>
          ) : (
            /* Interactive Scenario Question Card */
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
            >
              
              {/* Question Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600 text-[10px] font-bold font-mono">
                      QUESTION {currentIndex + 1} OF {questions.length}
                    </span>
                    {currentQuestion.isAIGenerated && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold flex items-center gap-1 font-mono">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        AI GENERATED
                      </span>
                    )}
                    {currentQuestion.isAIGenerated && currentQuestion.modelUsed && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold flex items-center gap-1 font-mono">
                        <Cpu className="w-3 h-3 text-indigo-500" />
                        {currentQuestion.modelUsed.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-mono text-slate-400">
                    Syllabus Ref: {currentQuestion.referenceSyllabusSection}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="bookmark-toggle-btn"
                    onClick={handleToggleSave}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
                    title={isBookmarked ? "Remove Bookmark" : "Save to Bookmarks"}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Scenario Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Enterprise Scenario Case Study</div>
                <p className="text-slate-700 text-sm md:text-base leading-relaxed font-sans font-medium">
                  {currentQuestion.scenario}
                </p>
              </div>

              {/* Specific Question Prompt */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Exam Prompt</div>
                <h4 className="text-slate-800 text-base font-bold leading-snug">
                  {currentQuestion.questionText}
                </h4>
              </div>

              {/* Choice Options List */}
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedOptionIndex === idx;
                  const isCorrect = idx === currentQuestion.correctAnswerIndex;
                  
                  // Style resolving logic
                  let btnStyle = "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700";
                  let badgeStyle = "bg-slate-200 text-slate-600";

                  if (isSelected) {
                    btnStyle = "bg-slate-900 border-slate-900 text-white";
                    badgeStyle = "bg-slate-800 text-slate-200";
                  }

                  if (isAnswerRevealed) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 font-medium";
                      badgeStyle = "bg-emerald-500 text-white";
                    } else if (isSelected) {
                      btnStyle = "bg-rose-50 border-rose-500 text-rose-950";
                      badgeStyle = "bg-rose-500 text-white";
                    } else {
                      btnStyle = "bg-slate-50 border-slate-100 text-slate-400 opacity-60";
                      badgeStyle = "bg-slate-100 text-slate-400";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      id={`option-choice-${idx}`}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerRevealed}
                      className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 ${btnStyle}`}
                    >
                      <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${badgeStyle}`}>
                        {isAnswerRevealed && isCorrect ? <Check className="w-3.5 h-3.5" /> : isAnswerRevealed && isSelected ? <X className="w-3.5 h-3.5" /> : letter}
                      </span>
                      <span className="text-xs md:text-sm font-sans">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Control Buttons & Explanations */}
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      id="practice-prev-btn"
                      onClick={handlePrevQuestion}
                      disabled={currentIndex === 0}
                      className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      id="practice-next-btn"
                      onClick={handleNextQuestion}
                      disabled={currentIndex === questions.length - 1}
                      className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                    >
                      Next Prebuilt
                    </button>
                  </div>

                  {!isAnswerRevealed ? (
                    <button
                      id="reveal-answer-btn"
                      onClick={handleRevealAnswer}
                      disabled={selectedOptionIndex === null}
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Confirm & Submit Answer
                    </button>
                  ) : (
                    <button
                      id="ask-coach-btn"
                      onClick={() => onAskCoachAboutQuestion(currentQuestion)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs py-2.5 px-5 rounded-xl transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Ask Coach to explain this question
                    </button>
                  )}
                </div>

                {/* Detailed Explanation Drawer */}
                <AnimatePresence>
                  {isAnswerRevealed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <h4 className="text-sm font-bold text-emerald-900">
                          Comprehensive AWS Training Explanation
                        </h4>
                      </div>

                      <div className="space-y-3 text-xs md:text-sm text-slate-700 leading-relaxed font-sans">
                        <p className="font-medium">
                          {currentQuestion.explanation}
                        </p>
                        <div className="pt-2 border-t border-emerald-100 flex items-center gap-2 text-emerald-800 font-mono text-xs">
                          <span className="font-semibold uppercase">Exam Syllabus Alignment:</span>
                          <span>{currentQuestion.referenceSyllabusSection}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
