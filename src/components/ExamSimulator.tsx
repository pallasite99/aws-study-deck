import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Play, Award, RotateCcw, AlertTriangle, ShieldCheck, FileText, CheckCircle2, XCircle, ArrowRight, Flag } from 'lucide-react';
import { AWSQuestion, UserState, AWSExamType, ExamAttempt } from '../types';
import { PREBUILT_QUESTIONS, AWS_DOMAINS } from '../data/awsQuestions';

interface ExamSimulatorProps {
  userState: UserState;
  onSaveAttempt: (attempt: ExamAttempt) => void;
}

export default function ExamSimulator({ userState, onSaveAttempt }: ExamSimulatorProps) {
  const currentExam = userState.examType;

  // Simulator stage states
  const [stage, setStage] = useState<'setup' | 'active' | 'results'>('setup');
  const [examLength, setExamLength] = useState<number>(10); // 10 or 20 questions
  const [activeQuestions, setActiveQuestions] = useState<AWSQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Track user selections and flags
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<string[]>([]); // flagged questionIds
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(900); // in seconds
  const [timeTakenSeconds, setTimeTakenSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Results state
  const [lastAttempt, setLastAttempt] = useState<ExamAttempt | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number>(0);

  // Safe confirm exit/submit modal
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Setup the exam questions based on selected length
  const handleStartExam = (length: number) => {
    setExamLength(length);
    
    // Pick questions balanced across domains for the current exam
    const allExamQuestions = PREBUILT_QUESTIONS.filter(q => q.examType === currentExam);
    
    // Let's shuffle and take requested length
    const shuffled = [...allExamQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, length);
    
    setActiveQuestions(selected);
    setCurrentIndex(0);
    setSelections({});
    setFlags([]);
    setTimeLeft(length === 10 ? 900 : 1800); // 15 mins vs 30 mins
    setTimeTakenSeconds(0);
    setStage('active');
  };

  // Timer runner
  useEffect(() => {
    if (stage !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto submit when timer expires
          handleForceSubmit();
          return 0;
        }
        setTimeTakenSeconds(t => t + 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  const handleSelectOption = (questionId: string, index: number) => {
    setSelections(prev => ({
      ...prev,
      [questionId]: index
    }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlags(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleForceSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Calculate final stats
    let score = 0;
    const answersMap: Record<string, { selectedIndex: number; isCorrect: boolean }> = {};

    activeQuestions.forEach(q => {
      const selected = selections[q.id];
      const isCorrect = selected === q.correctAnswerIndex;
      if (isCorrect) score++;
      
      answersMap[q.id] = {
        selectedIndex: selected !== undefined ? selected : -1,
        isCorrect
      };
    });

    const newAttempt: ExamAttempt = {
      id: `attempt_${Date.now()}`,
      examType: currentExam,
      score,
      total: examLength,
      timeTakenSeconds,
      date: new Date().toLocaleDateString(),
      answers: answersMap
    };

    onSaveAttempt(newAttempt);
    setLastAttempt(newAttempt);
    setReviewIndex(0);
    setShowSubmitModal(false);
    setStage('results');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to determine index grid classes
  const getIndexClass = (qIdx: number) => {
    const qId = activeQuestions[qIdx]?.id;
    const isCurrent = qIdx === currentIndex;
    const isAnswered = selections[qId] !== undefined;
    const isFlagged = flags.includes(qId);

    if (isCurrent) return "ring-2 ring-amber-500 bg-amber-50 text-amber-900 font-bold border-amber-300";
    if (isFlagged) return "bg-amber-100 text-amber-800 border-amber-300";
    if (isAnswered) return "bg-slate-800 text-white border-slate-700";
    return "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100";
  };

  return (
    <div className="space-y-6" id="simulator-tab">
      
      {/* 1. SETUP STAGE */}
      {stage === 'setup' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold font-display text-slate-800">AWS Exam Simulator Node</h2>
            <p className="text-slate-500 text-sm">
              Prepare for the stress of testing day under real-world conditions. Answers will not be revealed until you submit the entire mock test.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Express Sim Card */}
            <div className="border border-slate-200 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold font-mono">
                  EXPRESS DRILL
                </span>
                <h3 className="text-base font-bold text-slate-800">Express Sim (10 Qs)</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  A condensed exam representation containing 10 randomized prebuilt questions balanced across all syllabus weightings. Time limit is 15 minutes.
                </p>
              </div>

              <button
                id="start-express-sim-btn"
                onClick={() => handleStartExam(10)}
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Express Drill
              </button>
            </div>

            {/* Full Mock Card */}
            <div className="border border-slate-200 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold font-mono">
                  FULL SCALE
                </span>
                <h3 className="text-base font-bold text-slate-800">Comprehensive Mock (20 Qs)</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  A robust test simulation featuring 20 randomized scenario questions from all domains. Simulates the actual mental endurance and multi-choice pacing. Time limit is 30 minutes.
                </p>
              </div>

              <button
                id="start-full-mock-btn"
                onClick={() => handleStartExam(20)}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Full Mock
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">AWS Exam Passing Rules</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                The minimum passing standard for AWS CLF-C02 and AIF-C01 is **70%**. Finishing the simulator with a passing score automatically replenishes **+3 AI custom scenario tokens** to your active balance!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIVE MOCK TEST STAGE */}
      {stage === 'active' && activeQuestions[currentIndex] && (
        <div className="space-y-6">
          
          {/* Active Sim Header Bar */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-slate-400 font-mono text-xs uppercase">AWS Simulator Portal</span>
              <h3 className="text-base font-bold text-white font-display">
                {currentExam} Online Mock Examination
              </h3>
            </div>

            {/* Live digital countdown timer */}
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 shrink-0">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-mono text-base font-semibold tracking-wider text-amber-400">
                TIME REMAINING: {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Questions Navigation Grid Strip */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 uppercase">
              <span>Question Navigator</span>
              <span>Answered: {Object.keys(selections).length} / {examLength}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeQuestions.map((_, idx) => (
                <button
                  key={idx}
                  id={`nav-question-${idx}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-9 h-9 text-xs font-semibold rounded-lg border flex items-center justify-center transition-all ${getIndexClass(idx)}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Active Question Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-0.5">
                <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600 text-[10px] font-bold font-mono">
                  QUESTION {currentIndex + 1} OF {examLength}
                </span>
                <h3 className="text-[10px] font-mono text-slate-400 pt-1">
                  Domain: {AWS_DOMAINS[currentExam].find(d => d.id === activeQuestions[currentIndex].domainId)?.name}
                </h3>
              </div>

              {/* Flag for review button */}
              <button
                id="flag-for-review-btn"
                onClick={() => handleToggleFlag(activeQuestions[currentIndex].id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  flags.includes(activeQuestions[currentIndex].id)
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${flags.includes(activeQuestions[currentIndex].id) ? 'fill-amber-700 text-amber-700' : ''}`} />
                {flags.includes(activeQuestions[currentIndex].id) ? 'Flagged for Review' : 'Flag Question'}
              </button>
            </div>

            {/* Scenario */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-slate-700 text-sm md:text-base leading-relaxed font-sans font-medium">
              {activeQuestions[currentIndex].scenario}
            </div>

            {/* Core MCQ Question */}
            <h4 className="text-slate-800 text-base font-bold leading-snug">
              {activeQuestions[currentIndex].questionText}
            </h4>

            {/* Option Choices */}
            <div className="space-y-3 pt-2">
              {activeQuestions[currentIndex].options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const qId = activeQuestions[currentIndex].id;
                const isSelected = selections[qId] === idx;

                return (
                  <button
                    key={idx}
                    id={`sim-option-${idx}`}
                    onClick={() => handleSelectOption(qId, idx)}
                    className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white font-medium shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {letter}
                    </span>
                    <span className="text-xs md:text-sm font-sans">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 gap-4">
              <button
                id="sim-prev-btn"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Previous
              </button>

              <button
                id="submit-sim-early-btn"
                onClick={() => setShowSubmitModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Submit Exam & Finish
              </button>

              <button
                id="sim-next-btn"
                onClick={() => setCurrentIndex(prev => Math.min(activeQuestions.length - 1, prev + 1))}
                disabled={currentIndex === activeQuestions.length - 1}
                className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Next Question
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. SUBMIT SAFETY WARNING MODAL */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 text-center"
            >
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 font-display">Are you ready to submit?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You have answered **{Object.keys(selections).length} of {examLength}** questions. You cannot change your choices once submitted.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  id="cancel-submit-btn"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Keep Testing
                </button>
                <button
                  id="confirm-submit-btn"
                  onClick={handleForceSubmit}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Yes, Grade Me
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. RESULTS REPORT STAGE */}
      {stage === 'results' && lastAttempt && (
        <div className="space-y-6">
          
          {/* Big Score Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-center space-y-6">
            
            <div className="max-w-md mx-auto space-y-4">
              {lastAttempt.score / lastAttempt.total >= 0.7 ? (
                /* PASS SCREEN */
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                    <Award className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-extrabold font-display text-emerald-600">
                    CONGRATULATIONS! YOU PASSED!
                  </h2>
                  <p className="text-slate-500 text-xs">
                    You satisfied the passing standard for AWS certified professionals. We have credited your active account with **+3 custom scenario generation tokens**!
                  </p>
                </div>
              ) : (
                /* FAIL SCREEN */
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-extrabold font-display text-rose-600">
                    PASSING CRITERIA NOT MET
                  </h2>
                  <p className="text-slate-500 text-xs">
                    AWS standard requires a score of 70%+. Take action by studying the specific syllabus explanations of incorrect questions below.
                  </p>
                </div>
              )}

              {/* Big Percentage Meter */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-around items-center">
                <div className="text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Final Grade</span>
                  <span className="text-4xl font-bold font-display text-slate-800">
                    {Math.round((lastAttempt.score / lastAttempt.total) * 100)}%
                  </span>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Raw Score</span>
                  <span className="text-xl font-bold text-slate-700">
                    {lastAttempt.score} / {lastAttempt.total} Correct
                  </span>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Time Logged</span>
                  <span className="text-lg font-bold font-mono text-slate-700">
                    {formatTime(lastAttempt.timeTakenSeconds)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <button
                id="retry-sim-btn"
                onClick={() => setStage('setup')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Launch New Simulator
              </button>
            </div>
          </div>

          {/* Interactive Mock Review Arena */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold font-display text-slate-800">Syllabus-Aligned Question Review Dashboard</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Question indexes sidebar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Exam Questions Review</div>
                <div className="grid grid-cols-5 gap-2">
                  {activeQuestions.map((q, idx) => {
                    const ans = lastAttempt.answers[q.id];
                    const isCorrect = ans?.isCorrect;
                    const isSelectedReview = idx === reviewIndex;

                    let indicator = "bg-slate-50 border-slate-200 text-slate-500";
                    if (isCorrect) indicator = "bg-emerald-50 text-emerald-800 border-emerald-300";
                    else if (ans?.selectedIndex === -1) indicator = "bg-slate-100 text-slate-400 border-slate-200";
                    else indicator = "bg-rose-50 text-rose-800 border-rose-300";

                    if (isSelectedReview) indicator += " ring-2 ring-slate-900";

                    return (
                      <button
                        key={idx}
                        id={`review-question-selector-${idx}`}
                        onClick={() => setReviewIndex(idx)}
                        className={`w-10 h-10 text-xs font-bold rounded-lg border flex items-center justify-center transition-all ${indicator}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review details */}
              {activeQuestions[reviewIndex] && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 text-[10px] font-bold font-mono">
                      QUESTION {reviewIndex + 1} REVIEW
                    </span>
                    {lastAttempt.answers[activeQuestions[reviewIndex].id]?.isCorrect ? (
                      <span className="text-emerald-600 text-xs font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 fill-emerald-50 text-emerald-600" /> Correct Choice
                      </span>
                    ) : (
                      <span className="text-rose-500 text-xs font-bold inline-flex items-center gap-1">
                        <XCircle className="w-4 h-4 fill-rose-50 text-rose-500" /> Incorrect / Unanswered
                      </span>
                    )}
                  </div>

                  <p className="text-slate-500 text-xs font-mono">
                    Syllabus Section: {activeQuestions[reviewIndex].referenceSyllabusSection}
                  </p>

                  {/* Scenario box */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-xs leading-relaxed font-sans font-semibold">
                    {activeQuestions[reviewIndex].scenario}
                  </div>

                  {/* Question Text */}
                  <h4 className="text-slate-800 text-sm font-bold leading-snug">
                    {activeQuestions[reviewIndex].questionText}
                  </h4>

                  {/* Options review list */}
                  <div className="space-y-2">
                    {activeQuestions[reviewIndex].options.map((option, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isChosen = lastAttempt.answers[activeQuestions[reviewIndex].id]?.selectedIndex === oIdx;
                      const isCorrect = oIdx === activeQuestions[reviewIndex].correctAnswerIndex;

                      let style = "bg-slate-50 border-slate-100 text-slate-500";
                      if (isCorrect) style = "bg-emerald-50 border-emerald-500 text-emerald-900 font-medium";
                      else if (isChosen) style = "bg-rose-50 border-rose-500 text-rose-950";

                      return (
                        <div key={oIdx} className={`p-3 rounded-lg border text-xs flex items-center gap-3 ${style}`}>
                          <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isCorrect ? 'bg-emerald-500 text-white' : isChosen ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {letter}
                          </span>
                          <span className="font-sans">{option}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation container */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Official Training Explanation</h5>
                    <p className="text-slate-600 text-xs leading-relaxed font-sans">
                      {activeQuestions[reviewIndex].explanation}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
