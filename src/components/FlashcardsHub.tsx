import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ArrowLeft, ArrowRight, RefreshCw, Bookmark, BookmarkCheck, 
  CheckCircle2, HelpCircle, Trophy, GraduationCap, XCircle, Check, X, Award, Info,
  BookOpen
} from 'lucide-react';
import { Flashcard, UserState } from '../types';
import { PREBUILT_FLASHCARDS, AWS_DOMAINS } from '../data/awsQuestions';

interface FlashcardsHubProps {
  userState: UserState;
  onToggleBookmark: (cardId: string) => void;
}

export default function FlashcardsHub({ userState, onToggleBookmark }: FlashcardsHubProps) {
  const currentExam = userState.examType;
  const domains = AWS_DOMAINS[currentExam];

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Sub-tab selection: study cards vs interactive concept test
  const [activeMode, setActiveMode] = useState<'study' | 'quiz'>('study');

  // Test mode states
  const [quizQuestions, setQuizQuestions] = useState<{
    id: string;
    term: string;
    definition: string;
    explanation: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    userSelectedIndex: number | null;
  }[]>([]);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  // Load cards for current exam
  useEffect(() => {
    const examCards = PREBUILT_FLASHCARDS.filter(fc => fc.examType === currentExam);
    setCards(examCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    
    // Reset test mode when exam switches
    setQuizFinished(false);
    setQuizQuestions([]);
    setActiveMode('study');
  }, [currentExam]);

  const currentCard: Flashcard | undefined = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  // Generate terminology concept test based on current exam flashcards
  const startConceptTest = () => {
    const examCards = PREBUILT_FLASHCARDS.filter(fc => fc.examType === currentExam);
    if (examCards.length < 3) return;

    const questions = examCards.map((card) => {
      // 50% chance of term-to-def or def-to-term to make it highly balanced
      const isTermQuestion = Math.random() > 0.5;
      
      let questionText = "";
      let correctAnswer = "";
      let options: string[] = [];
      
      if (isTermQuestion) {
        questionText = `What is the correct core description or purpose of "${card.term}"?`;
        correctAnswer = card.definition;
        
        // Pick 3 distractors from other cards in the same exam
        const otherDefs = examCards
          .filter(c => c.id !== card.id)
          .map(c => c.definition);
        
        const distractors = otherDefs.sort(() => Math.random() - 0.5).slice(0, 3);
        options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      } else {
        questionText = `Which AWS service or cloud term matches this description: "${card.definition}"?`;
        correctAnswer = card.term;
        
        // Pick 3 distractors from other cards in the same exam
        const otherTerms = examCards
          .filter(c => c.id !== card.id)
          .map(c => c.term);
        
        const distractors = otherTerms.sort(() => Math.random() - 0.5).slice(0, 3);
        options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      }
      
      const correctIndex = options.indexOf(correctAnswer);
      
      return {
        id: card.id,
        term: card.term,
        definition: card.definition,
        explanation: card.explanation,
        questionText,
        options,
        correctIndex,
        userSelectedIndex: null
      };
    });

    setQuizQuestions(questions);
    setQuizCurrentIndex(0);
    setQuizFinished(false);
    setQuizScore(0);
    setActiveMode('quiz');
  };

  const handleSelectQuizOption = (optionIndex: number) => {
    const currentQuestion = quizQuestions[quizCurrentIndex];
    if (currentQuestion.userSelectedIndex !== null) return; // already answered

    const updated = [...quizQuestions];
    updated[quizCurrentIndex].userSelectedIndex = optionIndex;
    setQuizQuestions(updated);

    if (optionIndex === currentQuestion.correctIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizCurrentIndex < quizQuestions.length - 1) {
      setQuizCurrentIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto" id="flashcards-tab">
      
      {/* Title block */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold font-display text-slate-800">AWS Terminology Flashcards Hub</h2>
        <p className="text-slate-500 text-xs">
          Master acronyms, cloud concepts, and micro-definitions for the AWS **{currentExam}** syllabus.
        </p>
      </div>

      {/* Sub-tab Toggle Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 max-w-sm mx-auto">
        <button
          id="toggle-study-mode"
          onClick={() => setActiveMode('study')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMode === 'study'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Study Cards
        </button>
        <button
          id="toggle-quiz-mode"
          onClick={startConceptTest}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMode === 'quiz'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          Concept Test
        </button>
      </div>

      {/* RENDER STUDY MODE */}
      {activeMode === 'study' && (
        <div className="space-y-6 text-center">
          {currentCard ? (
            <div className="space-y-6">
              
              {/* Card index counter */}
              <div className="text-xs font-mono text-slate-400">
                CARD {currentIndex + 1} OF {cards.length}
              </div>

              {/* Interactive Flipped Card container */}
              <div
                id="flashcard-interactive-wrapper"
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full h-80 relative cursor-pointer perspective-1000 group select-none"
              >
                <div
                  className={`w-full h-full duration-500 transform-style-3d relative rounded-3xl border border-slate-200 shadow-lg ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  
                  {/* CARD FRONT */}
                  <div className="absolute inset-0 bg-white rounded-3xl p-8 flex flex-col justify-between backface-hidden">
                    <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                      <span>FRONT</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {domains.find(d => d.id === currentCard.domainId)?.name.split(':')[0]}
                      </span>
                    </div>

                    <div className="space-y-3 my-auto">
                      <h3 className="text-2xl font-bold font-display text-slate-800 leading-tight">
                        {currentCard.term}
                      </h3>
                      <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 rounded-full text-xs font-sans">
                        Click card to reveal definition
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                      AWS {currentExam} PRACTICE HUB
                    </div>
                  </div>

                  {/* CARD BACK */}
                  <div className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between text-white backface-hidden rotate-y-180">
                    <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                      <span>BACK</span>
                      <span className="text-[10px] font-bold text-amber-500 uppercase">
                        {domains.find(d => d.id === currentCard.domainId)?.name.split(':')[0]}
                      </span>
                    </div>

                    <div className="space-y-4 my-auto">
                      <h4 className="text-amber-400 text-lg font-bold font-display leading-tight">
                        {currentCard.definition}
                      </h4>
                      <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-sans max-w-md mx-auto">
                        {currentCard.explanation}
                      </p>
                    </div>

                    <div className="text-[10px] text-amber-500/60 font-mono tracking-wider">
                      CLICK CARD TO FLIP BACK
                    </div>
                  </div>

                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex justify-between items-center max-w-xs mx-auto">
                <button
                  id="fc-prev-btn"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-3 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-xl shadow-sm transition-all cursor-pointer text-slate-600"
                  title="Previous Card"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <button
                  id="fc-flip-btn"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Flip Card
                </button>

                <button
                  id="fc-next-btn"
                  onClick={handleNext}
                  disabled={currentIndex === cards.length - 1}
                  className="p-3 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-xl shadow-sm transition-all cursor-pointer text-slate-600"
                  title="Next Card"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Tips banner */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex items-start gap-3 text-left max-w-md mx-auto">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-normal">
                  Flip through all cards to memorize these terms. Once comfortable, toggle to the **Concept Test** tab to complete a memory test for the **{currentExam}** syllabus!
                </p>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-slate-400">
              No flashcards found for this exam.
            </div>
          )}
        </div>
      )}

      {/* RENDER CONCEPT QUIZ MODE */}
      {activeMode === 'quiz' && (
        <div className="space-y-6">
          
          {/* Quiz NOT finished */}
          {!quizFinished && quizQuestions.length > 0 && (
            <div className="space-y-6">
              
              {/* Header metrics */}
              <div className="flex justify-between items-center text-xs font-mono text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-150">
                <span>AWS Terminology Challenge: {currentExam}</span>
                <span className="font-bold text-slate-800">
                  QUESTION {quizCurrentIndex + 1} OF {quizQuestions.length}
                </span>
              </div>

              {/* Quiz progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${((quizCurrentIndex + 1) / quizQuestions.length) * 100}%` }}
                ></div>
              </div>

              {/* Question container */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs mt-0.5">
                    Q
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800 leading-snug">
                    {quizQuestions[quizCurrentIndex].questionText}
                  </h3>
                </div>

                {/* Multiple choice options */}
                <div className="grid grid-cols-1 gap-3">
                  {quizQuestions[quizCurrentIndex].options.map((option, idx) => {
                    const question = quizQuestions[quizCurrentIndex];
                    const hasAnswered = question.userSelectedIndex !== null;
                    const isSelected = question.userSelectedIndex === idx;
                    const isCorrect = question.correctIndex === idx;

                    let btnStyles = "border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
                    if (hasAnswered) {
                      if (isCorrect) {
                        btnStyles = "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium";
                      } else if (isSelected) {
                        btnStyles = "border-rose-500 bg-rose-50 text-rose-900";
                      } else {
                        btnStyles = "border-slate-150 bg-slate-50 text-slate-400 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        id={`quiz-option-${idx}`}
                        disabled={hasAnswered}
                        onClick={() => handleSelectQuizOption(idx)}
                        className={`w-full p-4 rounded-2xl border-2 text-left text-xs md:text-sm leading-snug transition-all duration-200 flex items-center justify-between cursor-pointer ${btnStyles}`}
                      >
                        <span className="font-medium pr-4">{option}</span>
                        {hasAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {hasAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Deep Educational Explanation Banner */}
                {quizQuestions[quizCurrentIndex].userSelectedIndex !== null && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl p-5 border text-xs md:text-sm leading-relaxed space-y-2 ${
                      quizQuestions[quizCurrentIndex].userSelectedIndex === quizQuestions[quizCurrentIndex].correctIndex
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-100 text-slate-800'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      {quizQuestions[quizCurrentIndex].userSelectedIndex === quizQuestions[quizCurrentIndex].correctIndex ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Check className="w-4 h-4 font-bold" /> CORRECT
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center gap-1">
                          <X className="w-4 h-4 font-bold" /> INCORRECT
                        </span>
                      )}
                      <span>• CONCEPT VERIFICATION</span>
                    </div>
                    <p className="font-sans leading-relaxed text-slate-700">
                      <strong>{quizQuestions[quizCurrentIndex].term}</strong>: {quizQuestions[quizCurrentIndex].explanation}
                    </p>
                    <div className="pt-3 flex justify-end">
                      <button
                        id="quiz-next-btn"
                        onClick={handleNextQuizQuestion}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
                      >
                        {quizCurrentIndex === quizQuestions.length - 1 ? 'Finish Challenge' : 'Next Concept'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>

            </div>
          )}

          {/* Quiz FINISHED - Complete stats */}
          {quizFinished && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md text-center space-y-6"
              id="quiz-results-card"
            >
              <div className="w-16 h-16 bg-amber-100 border border-amber-200 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Trophy className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display text-slate-800">Concept Challenge Complete!</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  You finished the Terminology Memory Challenge for the AWS **{currentExam}** syllabus.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-150 max-w-sm mx-auto grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Your Score</div>
                  <div className="text-3xl font-black font-display text-slate-800">
                    {quizScore} / {quizQuestions.length}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Accuracy</div>
                  <div className={`text-3xl font-black font-display ${quizScore / quizQuestions.length >= 0.8 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {Math.round((quizScore / quizQuestions.length) * 100)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                {quizScore === quizQuestions.length ? (
                  <p className="text-xs text-emerald-600 font-medium">
                    🏆 Flawless Victory! You have fully memorized all core acronyms and services. Keep this momentum going!
                  </p>
                ) : quizScore / quizQuestions.length >= 0.7 ? (
                  <p className="text-xs text-indigo-600 font-medium">
                    🔥 Excellent comprehension! You understand the key differentiators between these terms.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Keep studying the front-and-back study cards to improve your recognition and master the syllabus acronyms.
                  </p>
                )}
              </div>

              <div className="pt-4 flex flex-wrap gap-3 justify-center">
                <button
                  id="quiz-restart-btn"
                  onClick={startConceptTest}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
                <button
                  id="quiz-back-study-btn"
                  onClick={() => setActiveMode('study')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Return to Study Cards
                </button>
              </div>

            </motion.div>
          )}

        </div>
      )}

    </div>
  );
}
