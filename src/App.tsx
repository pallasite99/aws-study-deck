import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CreditCard,
  BookMarked,
  Sparkles,
  Server,
  ChevronRight,
  User,
  ExternalLink
} from 'lucide-react';

import { AWSExamType, UserState, AWSQuestion, ExamAttempt, StudyNote } from './types';
import Dashboard from './components/Dashboard';
import PracticeMode from './components/PracticeMode';
import ExamSimulator from './components/ExamSimulator';
import FlashcardsHub from './components/FlashcardsHub';
import AICoach from './components/AICoach';
import ReviewCenter from './components/ReviewCenter';

const LOCAL_STORAGE_KEY = 'aws_exam_practice_state_v1';

const DEFAULT_STATE: UserState = {
  aiCredits: 5,
  totalCredits: 5,
  bookmarks: [],
  wrongAnswersHistory: [],
  answers: {},
  notes: [],
  attempts: [],
  examType: 'CLF-C02',
  selectedDomainId: 'all',
  subscriptionStatus: 'free',
  isDevModeEnabled: false,
  simulate503: false
};

export default function App() {
  const [userState, setUserState] = useState<UserState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeQuestionContext, setActiveQuestionContext] = useState<AWSQuestion | null>(null);
  const [aiEngineReady, setAiEngineReady] = useState<boolean>(false);

  // 1. Initial State Loading from LocalStorage & Config check from Backend Express server
  useEffect(() => {
    // Load local storage
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserState({
          ...DEFAULT_STATE,
          ...parsed
        });
      }
    } catch (e) {
      console.error("Failed to load user progress from LocalStorage:", e);
    }

    // Ping Express server config to verify if GEMINI_API_KEY is defined
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        setAiEngineReady(!!data.aiEngineReady);
      } catch (e) {
        console.warn("Express API is unreachable or booting. Defaulting to offline/fallback diagnostics.", e);
        setAiEngineReady(false);
      }
    };

    checkConfig();
  }, []);

  // 2. Persist State Changes
  const saveState = (updated: UserState) => {
    setUserState(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("LocalStorage write failed:", e);
    }
  };

  // Switch AWS certification course
  const handleChangeExam = (exam: AWSExamType) => {
    saveState({
      ...userState,
      examType: exam
    });
  };

  // Record answering logs for progress dashboards
  const handleAnswerQuestion = (questionId: string, selectedIndex: number, isCorrect: boolean) => {
    const updatedAnswers = {
      ...userState.answers,
      [questionId]: {
        selectedIndex,
        isCorrect,
        timestamp: new Date().toISOString()
      }
    };

    const updatedWrongHistory = [...userState.wrongAnswersHistory];
    if (!isCorrect && !updatedWrongHistory.includes(questionId)) {
      updatedWrongHistory.push(questionId);
    } else if (isCorrect) {
      // Remove from wrong history if correct now
      const idx = updatedWrongHistory.indexOf(questionId);
      if (idx !== -1) updatedWrongHistory.splice(idx, 1);
    }

    saveState({
      ...userState,
      answers: updatedAnswers,
      wrongAnswersHistory: updatedWrongHistory
    });
  };

  // Toggle bookmark questions
  const handleToggleBookmark = (questionId: string) => {
    const updatedBookmarks = userState.bookmarks.includes(questionId)
      ? userState.bookmarks.filter(id => id !== questionId)
      : [...userState.bookmarks, questionId];

    saveState({
      ...userState,
      bookmarks: updatedBookmarks
    });
  };

  // Consult AI coach about a question
  const handleAskCoachAboutQuestion = (question: AWSQuestion) => {
    setActiveQuestionContext(question);
    setActiveTab('coach');
  };

  const handleClearQuestionContext = () => {
    setActiveQuestionContext(null);
  };

  // Consume credits for AI generated scenarios (freemium model simulation)
  const handleConsumeCredit = (): boolean => {
    if (userState.isDevModeEnabled || userState.subscriptionStatus === 'pro' || userState.subscriptionStatus === 'enterprise') {
      return true; // Bypass credit deduction for premium subscriptions or active Dev Mode
    }
    if (userState.aiCredits > 0) {
      saveState({
        ...userState,
        aiCredits: userState.aiCredits - 1
      });
      return true;
    }
    return false;
  };

  const handleSimulatePremium = () => {
    saveState({
      ...userState,
      subscriptionStatus: 'pro',
      aiCredits: 999,
      totalCredits: 999
    });
  };

  const handleUpdateSubscription = (status: 'free' | 'pro' | 'enterprise') => {
    const refillTokens = status === 'free' ? 5 : 999;
    saveState({
      ...userState,
      subscriptionStatus: status,
      aiCredits: refillTokens,
      totalCredits: refillTokens
    });
  };

  const handleToggleDevMode = () => {
    saveState({
      ...userState,
      isDevModeEnabled: !userState.isDevModeEnabled
    });
  };

  const handleRefillCredits = (count: number) => {
    saveState({
      ...userState,
      aiCredits: count,
      totalCredits: Math.max(userState.totalCredits, count)
    });
  };

  const handleToggleSimulate503 = () => {
    saveState({
      ...userState,
      simulate503: !userState.simulate503
    });
  };

  const handleAddGeneratedQuestion = (question: AWSQuestion) => {
    // Dynamic generated questions are passed to session questions but don't strictly require permanent db registration
  };

  // Record a completed Mock Exam attempt
  const handleSaveAttempt = (attempt: ExamAttempt) => {
    const isPassing = (attempt.score / attempt.total) >= 0.7;
    // Earn 3 credits upon passing
    const addedCredits = isPassing ? 3 : 0;

    saveState({
      ...userState,
      attempts: [attempt, ...userState.attempts],
      aiCredits: Math.min(10, userState.aiCredits + addedCredits)
    });
  };

  // Save personal study notes (Self-Knowledge)
  const handleSaveNote = (topic: string, domainId: string, content: string) => {
    const newNote: StudyNote = {
      id: `note_${Date.now()}`,
      examType: userState.examType,
      domainId,
      topic,
      content,
      createdAt: new Date().toLocaleDateString()
    };

    saveState({
      ...userState,
      notes: [newNote, ...userState.notes]
    });
  };

  const handleDeleteNote = (noteId: string) => {
    saveState({
      ...userState,
      notes: userState.notes.filter(note => note.id !== noteId)
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* 1. PRIMARY SYSTEM APP HEADER */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-800 text-white z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
          
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-slate-950 font-display font-black text-lg shadow-md shrink-0">
              AWS
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold font-display tracking-tight text-white leading-none">
                AWS AI Practice System
              </h1>
              <span className="text-[10px] font-mono text-slate-400">
                Syllabus-Grounding Core
              </span>
            </div>
          </div>

          {/* Active Diagnostic Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${aiEngineReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{aiEngineReady ? 'GEMINI LINKED' : 'OFFLINE SYLLABUS'}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{userState.aiCredits} AI Tokens</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. SUB-NAVIGATION NAVIGATION STRIP */}
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-start space-x-1 py-2">
          
          <button
            id="nav-tab-dashboard"
            onClick={() => {
              setActiveTab('dashboard');
              handleClearQuestionContext();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Syllabus Overview
          </button>

          <button
            id="nav-tab-practice"
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Practice Board
          </button>

          <button
            id="nav-tab-simulator"
            onClick={() => {
              setActiveTab('simulator');
              handleClearQuestionContext();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            AWS Exam Simulator
          </button>

          <button
            id="nav-tab-flashcards"
            onClick={() => {
              setActiveTab('flashcards');
              handleClearQuestionContext();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'flashcards'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Terminology Flashcards
          </button>

          <button
            id="nav-tab-coach"
            onClick={() => setActiveTab('coach')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'coach'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Training Coach
          </button>

          <button
            id="nav-tab-review"
            onClick={() => {
              setActiveTab('review');
              handleClearQuestionContext();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'review'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            Personal Review Center
          </button>

        </div>
      </nav>

      {/* 3. CORE DISPLAY BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="relative">
          {activeTab === 'dashboard' && (
            <Dashboard
              userState={userState}
              onChangeExam={handleChangeExam}
              onNavigateToTab={setActiveTab}
              onSimulatePremium={handleSimulatePremium}
              aiEngineReady={aiEngineReady}
              onUpdateSubscription={handleUpdateSubscription}
              onToggleDevMode={handleToggleDevMode}
              onRefillCredits={handleRefillCredits}
              onToggleSimulate503={handleToggleSimulate503}
            />
          )}

          {activeTab === 'practice' && (
            <PracticeMode
              userState={userState}
              onAnswerQuestion={handleAnswerQuestion}
              onToggleBookmark={handleToggleBookmark}
              onAskCoachAboutQuestion={handleAskCoachAboutQuestion}
              onConsumeCredit={handleConsumeCredit}
              aiEngineReady={aiEngineReady}
              onAddGeneratedQuestion={handleAddGeneratedQuestion}
            />
          )}

          {activeTab === 'simulator' && (
            <ExamSimulator
              userState={userState}
              onSaveAttempt={handleSaveAttempt}
            />
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsHub
              userState={userState}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {activeTab === 'coach' && (
            <AICoach
              userState={userState}
              activeQuestionContext={activeQuestionContext}
              onClearQuestionContext={handleClearQuestionContext}
              aiEngineReady={aiEngineReady}
            />
          )}

          {activeTab === 'review' && (
            <ReviewCenter
              userState={userState}
              onRemoveBookmark={handleToggleBookmark}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onNavigateToTab={setActiveTab}
              onAskCoachAboutQuestion={handleAskCoachAboutQuestion}
            />
          )}
        </div>

      </main>

      {/* 4. SYSTEM APP FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">AWS Exam Practice Assistant MVP</span>
            <span className="text-slate-300">|</span>
            <span>Grounding on official CLF-C02 & AIF-C01 blueprints</span>
          </div>

          <div className="flex gap-4">
            <a 
              href="https://aws.amazon.com/certification/certified-cloud-practitioner/" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-slate-800 inline-flex items-center gap-1 transition-colors"
            >
              AWS CLF Exam Guide
              <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="https://aws.amazon.com/certification/certified-ai-practitioner/" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-slate-800 inline-flex items-center gap-1 transition-colors"
            >
              AWS AIF Exam Guide
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
