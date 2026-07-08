import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Award, Zap, CheckCircle, HelpCircle, GraduationCap, 
  Server, Sparkles, TrendingUp, RefreshCw, Shield, Cpu, Coins, 
  Database, AlertTriangle, Check, Settings, Activity, Terminal, Sliders, ZapOff,
  Flame, Target, Lock, Unlock
} from 'lucide-react';
import { AWSExamType, UserState, ExamDomain } from '../types';
import { AWS_DOMAINS, PREBUILT_QUESTIONS } from '../data/awsQuestions';

interface DashboardProps {
  userState: UserState;
  onChangeExam: (exam: AWSExamType) => void;
  onNavigateToTab: (tabId: string) => void;
  onSimulatePremium: () => void;
  aiEngineReady: boolean;
  onUpdateSubscription: (status: 'free' | 'pro' | 'enterprise') => void;
  onToggleDevMode: () => void;
  onRefillCredits: (count: number) => void;
  onToggleSimulate503: () => void;
}

export default function Dashboard({
  userState,
  onChangeExam,
  onNavigateToTab,
  onSimulatePremium,
  aiEngineReady,
  onUpdateSubscription,
  onToggleDevMode,
  onRefillCredits,
  onToggleSimulate503
}: DashboardProps) {
  const currentExam = userState.examType;
  const domains = AWS_DOMAINS[currentExam];

  // Simulated metrics for developer fun
  const [latency, setLatency] = useState<number>(180);
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => {
        const offset = Math.floor(Math.random() * 40) - 20;
        const target = userState.simulate503 ? 0 : (userState.subscriptionStatus === 'pro' ? 140 : 220);
        return Math.max(0, target + offset);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [userState.subscriptionStatus, userState.simulate503]);

  // Calculate statistics
  const prebuiltTotal = PREBUILT_QUESTIONS.filter(q => q.examType === currentExam).length;
  
  // Calculate answered questions for this exam
  const answeredKeys = Object.keys(userState.answers).filter(key => {
    if (key.startsWith('clf_') && currentExam === 'CLF-C02') return true;
    if (key.startsWith('aif_') && currentExam === 'AIF-C01') return true;
    if (key.startsWith('gen_')) return true;
    return false;
  });

  const totalAnswered = answeredKeys.length;
  const correctAnswers = answeredKeys.filter(key => userState.answers[key].isCorrect).length;
  const accuracyRate = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

  // Domain readiness calculators
  const getDomainReadiness = (domainId: string) => {
    const domainQuestions = PREBUILT_QUESTIONS.filter(q => q.domainId === domainId);
    const domainQuestionIds = domainQuestions.map(q => q.id);
    const answeredInDomain = answeredKeys.filter(key => {
      if (domainQuestionIds.includes(key)) return true;
      return false; 
    });

    if (answeredInDomain.length === 0) return 0;
    const correctInDomain = answeredInDomain.filter(key => userState.answers[key].isCorrect).length;
    return Math.round((correctInDomain / answeredInDomain.length) * 100);
  };

  const getDomainAnswerCount = (domainId: string) => {
    const domainQuestionIds = PREBUILT_QUESTIONS.filter(q => q.domainId === domainId).map(q => q.id);
    return answeredKeys.filter(key => domainQuestionIds.includes(key)).length;
  };

  // Overall readiness based on weighted domains
  const overallReadiness = Math.round(
    domains.reduce((acc, d) => acc + (getDomainReadiness(d.id) * (d.percentage / 100)), 0)
  );

  const activeSubscription = userState.subscriptionStatus || 'free';
  const devModeActive = !!userState.isDevModeEnabled;
  const simulatedOutage = !!userState.simulate503;

  // 1. Calculate Daily Practice Streak
  const calculateDailyStreak = (): number => {
    const dates = Object.values(userState.answers)
      .map(a => a.timestamp)
      .filter((t): t is string => !!t)
      .map(t => t.split('T')[0]); // Get YYYY-MM-DD
    
    if (dates.length === 0) return 0;
    
    const uniqueSortedDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a)); // Descending order (today first)
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // If the user hasn't practiced today or yesterday, the streak is 0
    if (uniqueSortedDates[0] !== todayStr && uniqueSortedDates[0] !== yesterdayStr) {
      return 0;
    }
    
    let streak = 1;
    for (let i = 0; i < uniqueSortedDates.length - 1; i++) {
      const d1 = new Date(uniqueSortedDates[i]);
      const d2 = new Date(uniqueSortedDates[i+1]);
      const diffTime = Math.abs(d1.getTime() - d2.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else if (diffDays > 1) {
        break; // Streak broken
      }
    }
    return streak;
  };

  // 2. Calculate Correct Answer Streak (Consecutive correct answers)
  const calculateCorrectStreak = (): number => {
    const sortedAnswers = Object.values(userState.answers)
      .filter(a => !!a.timestamp)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()); // latest first
    
    let streak = 0;
    for (const ans of sortedAnswers) {
      if (ans.isCorrect) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const dailyStreak = calculateDailyStreak();
  const correctStreak = calculateCorrectStreak();
  
  // Count CLF questions answered
  const clfAnswered = Object.keys(userState.answers).filter(key => {
    const prebuilt = PREBUILT_QUESTIONS.find(q => q.id === key);
    if (prebuilt) return prebuilt.examType === 'CLF-C02';
    return key.startsWith('clf_') || (key.startsWith('gen_') && userState.examType === 'CLF-C02');
  }).length;

  // Count AIF questions answered
  const aifAnswered = Object.keys(userState.answers).filter(key => {
    const prebuilt = PREBUILT_QUESTIONS.find(q => q.id === key);
    if (prebuilt) return prebuilt.examType === 'AIF-C01';
    return key.startsWith('aif_') || (key.startsWith('gen_') && userState.examType === 'AIF-C01');
  }).length;

  // High Mock Exam Score
  const bestMockScore = userState.attempts && userState.attempts.length > 0
    ? Math.max(...userState.attempts.map(a => (a.score / a.total) * 100))
    : 0;

  // Bookmarks count
  const bookmarksCount = userState.bookmarks.length;

  const badges = [
    {
      id: 'badge_clf_1',
      title: 'Cloud Novice',
      description: 'Answer at least 1 CLF-C02 Practitioner question.',
      unlocked: clfAnswered >= 1,
      current: clfAnswered,
      target: 1,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      iconClass: 'text-amber-500',
      category: 'Cloud Practitioner'
    },
    {
      id: 'badge_clf_10',
      title: 'Cloud Specialist',
      description: 'Complete 10 CLF-C02 syllabus practice questions.',
      unlocked: clfAnswered >= 10,
      current: clfAnswered,
      target: 10,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      iconClass: 'text-orange-500',
      category: 'Cloud Practitioner'
    },
    {
      id: 'badge_aif_1',
      title: 'AI Apprentice',
      description: 'Answer at least 1 AIF-C01 AI Practitioner question.',
      unlocked: aifAnswered >= 1,
      current: aifAnswered,
      target: 1,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      iconClass: 'text-blue-500',
      category: 'AI Practitioner'
    },
    {
      id: 'badge_aif_10',
      title: 'AI Architect',
      description: 'Complete 10 AIF-C01 syllabus practice questions.',
      unlocked: aifAnswered >= 10,
      current: aifAnswered,
      target: 10,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      iconClass: 'text-indigo-500',
      category: 'AI Practitioner'
    },
    {
      id: 'badge_mock_pass',
      title: 'Apex Practitioner',
      description: 'Achieve a score of >= 70% in any Mock Exam attempt.',
      unlocked: bestMockScore >= 70,
      current: Math.round(bestMockScore),
      target: 70,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-500',
      category: 'Exam Simulator'
    },
    {
      id: 'badge_streak_3',
      title: 'Streak Sentinel',
      description: 'Practice 3 consecutive days to build healthy study habits.',
      unlocked: dailyStreak >= 3,
      current: dailyStreak,
      target: 3,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      iconClass: 'text-rose-500',
      category: 'Consistency'
    },
    {
      id: 'badge_correct_5',
      title: 'Precision Sniper',
      description: 'Answer 5 practice questions correct in a row.',
      unlocked: correctStreak >= 5,
      current: correctStreak,
      target: 5,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      iconClass: 'text-teal-500',
      category: 'Precision'
    },
    {
      id: 'badge_term_scholar',
      title: 'Term Scholar',
      description: 'Save 3 complex terminology concepts or bookmarks.',
      unlocked: bookmarksCount >= 3,
      current: bookmarksCount,
      target: 3,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      iconClass: 'text-violet-500',
      category: 'Study Prep'
    }
  ];

  return (
    <div className="space-y-8" id="dashboard-tab">
      
      {/* Top Banner: AWS Cert Options & Dev Mode Trigger */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1 rounded-full font-mono">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AWS SYLLABUS DIRECTORY
              </span>
              
              <button
                id="toggle-dev-mode-btn"
                onClick={onToggleDevMode}
                className={`inline-flex items-center gap-1.5 border text-xs px-3 py-1 rounded-full font-mono transition-all duration-200 cursor-pointer ${
                  devModeActive 
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
                title="Toggle Dev Control Suite"
              >
                <Settings className={`w-3.5 h-3.5 ${devModeActive ? 'animate-spin' : ''}`} />
                <span>DEV MODE: {devModeActive ? 'ACTIVE' : 'OFF'}</span>
              </button>
            </div>
            
            <h1 className="text-3xl font-bold font-display tracking-tight text-white">
              AWS Certification Practice Hub
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Elevate your preparation with real-time AI-generated scenario questions matching the latest CLF-C02 and AIF-C01 domains.
            </p>
          </div>

          {/* Exam Switcher */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-center shrink-0">
            <button
              id="switch-to-clf"
              onClick={() => onChangeExam('CLF-C02')}
              className={`px-5 py-3 rounded-xl font-display font-semibold text-xs tracking-wider transition-all duration-300 cursor-pointer ${
                currentExam === 'CLF-C02'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              CLF-C02 Practitioner
            </button>
            <button
              id="switch-to-aif"
              onClick={() => onChangeExam('AIF-C01')}
              className={`px-5 py-3 rounded-xl font-display font-semibold text-xs tracking-wider transition-all duration-300 cursor-pointer ${
                currentExam === 'AIF-C01'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              AIF-C01 AI Practitioner
            </button>
          </div>
        </div>
      </div>

      {/* DEV MODE INSTRUMENTATION CONSOLE */}
      {devModeActive && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 text-white shadow-lg space-y-6 relative"
          id="dev-mode-panel"
        >
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-rose-400">AWS Prep System Instrumentation Console</h3>
                <p className="text-xs text-slate-400">Simulate sustained demand, bypass tiers, and inspect multi-model fallback resiliency patterns.</p>
              </div>
            </div>
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-md text-[10px] font-bold font-mono">
              BYPASS STATUS: ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Outage simulator switch */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono uppercase">
                  <ZapOff className="w-4 h-4" />
                  Simulate Gemini Congestion (503)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  Forces the next generation or chat request to crash with a 503 Service Congestion error. Tests the automatic fallback logic.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Sustained Congestion:</span>
                <button
                  id="simulate-503-toggle"
                  onClick={onToggleSimulate503}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                    simulatedOutage 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  {simulatedOutage ? '⚠️ OUTAGE ENABLED' : 'STABLE CONNECTIVITY'}
                </button>
              </div>
            </div>

            {/* Credit Injection Panel */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono uppercase">
                  <Sliders className="w-4 h-4" />
                  Token Refiller & Slider
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  Manually inject any token count into your practice session. Useful to override limits during development runs.
                </p>
              </div>

              <div className="pt-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => onRefillCredits(0)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-slate-800"
                >
                  Reset (0)
                </button>
                <button 
                  onClick={() => onRefillCredits(10)}
                  className="bg-slate-900 hover:bg-amber-500/10 text-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-slate-800"
                >
                  +10 Tokens
                </button>
                <button 
                  onClick={() => onRefillCredits(100)}
                  className="bg-slate-900 hover:bg-amber-500/10 text-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-slate-800"
                >
                  +100 Tokens
                </button>
                <button 
                  onClick={() => onRefillCredits(9999)}
                  className="bg-slate-900 hover:bg-amber-500/20 text-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-slate-800 font-bold"
                >
                  Pro Bypass (9999)
                </button>
              </div>
            </div>

            {/* Live Model Telemetry logs */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 font-mono uppercase">
                  <Activity className="w-4 h-4" />
                  Real-time Resilient Telemetry
                </div>
                <div className="space-y-1.5 pt-2 text-[10px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Active Provider:</span>
                    <span className="text-slate-200">Google GenAI Node</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model Sequence:</span>
                    <span className="text-slate-200">2.5-flash ➔ 1.5-flash</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Simulation Outage Flag:</span>
                    <span className={simulatedOutage ? "text-rose-400 font-bold" : "text-emerald-400"}>
                      {simulatedOutage ? "CRASH_ACTIVE" : "NOMINAL_HEALTH"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated RTT:</span>
                    <span className={simulatedOutage ? "text-slate-500" : "text-slate-200"}>
                      {simulatedOutage ? "ERR (503)" : `${latency}ms`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono border-t border-slate-900 pt-2 text-center">
                Resilience Engine Status: Active Listening
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* Grid: Quotas, Subscriptions & Cloud Connectivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Unified Practice Engine & Subscription Hub */}
        <div id="freemium-panel" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 lg:col-span-2">
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono tracking-wider uppercase">Subscription Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-widest ${
                    activeSubscription === 'pro' 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : activeSubscription === 'enterprise'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-slate-150 text-slate-700'
                  }`}>
                    {activeSubscription.toUpperCase()} PLAN
                  </span>
                </div>
                <h3 className="text-lg font-bold font-display text-slate-800">AWS Scenario Generator Engine</h3>
              </div>

              <div className="shrink-0">
                {(activeSubscription === 'pro' || activeSubscription === 'enterprise' || devModeActive) ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    UNLIMITED AI TOKENS ACTIVE
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1.5 shadow-sm">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    {userState.aiCredits} / {userState.totalCredits} Tokens Remaining
                  </span>
                )}
              </div>
            </div>

            {/* Quota Gauge */}
            {!(activeSubscription === 'pro' || activeSubscription === 'enterprise' || devModeActive) && (
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(userState.aiCredits / userState.totalCredits) * 100}%` }}
                  ></div>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  You are currently utilizing the **Free Plan** with limited credits. Generate complex custom scenarios across domains or chat with our coach. Passing Mock Exams replenishes tokens automatically!
                </p>
              </div>
            )}

            {/* Premium Selector Cards */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Choose subscription level:</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Free plan */}
                <button
                  onClick={() => onUpdateSubscription('free')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    activeSubscription === 'free' 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div>
                    <h5 className="font-bold text-sm">Free Study</h5>
                    <p className={`text-[10px] leading-snug pt-1 ${activeSubscription === 'free' ? 'text-slate-300' : 'text-slate-500'}`}>
                      5 startup tokens, robust multi-model fallback, full syllabus database access.
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-between text-xs font-bold">
                    <span>$0.00</span>
                    {activeSubscription === 'free' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                </button>

                {/* CloudPrep Pro */}
                <button
                  id="upgrade-to-pro-btn"
                  onClick={() => onUpdateSubscription('pro')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    activeSubscription === 'pro' 
                      ? 'bg-amber-500/15 border-amber-500 text-slate-900' 
                      : 'bg-white hover:bg-amber-500/5 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    Most Popular
                  </div>
                  <div>
                    <h5 className="font-bold text-sm flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Prep Pro
                    </h5>
                    <p className={`text-[10px] leading-snug pt-1 ${activeSubscription === 'pro' ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      Unlimited AI scenarios, real-time latency monitors, full coach access.
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-between text-xs font-bold">
                    <span>$9.99 / mo</span>
                    {activeSubscription === 'pro' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                </button>

                {/* Enterprise */}
                <button
                  onClick={() => onUpdateSubscription('enterprise')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    activeSubscription === 'enterprise' 
                      ? 'bg-indigo-50 border-indigo-500 text-slate-950' 
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div>
                    <h5 className="font-bold text-sm flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      Enterprise
                    </h5>
                    <p className={`text-[10px] leading-snug pt-1 ${activeSubscription === 'enterprise' ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      Custom corporate logins, direct integration simulation guides.
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-between text-xs font-bold">
                    <span>Corporate SLA</span>
                    {activeSubscription === 'enterprise' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              Secure processing handled via local simulation. Refill anytime.
            </span>
            <button
              id="dashboard-practice-shortcut"
              onClick={() => onNavigateToTab('practice')}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Go to Scenario Practice Mode
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Overview Stats (Stacked Right) */}
        <div id="study-stats-panel" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs text-slate-400 font-mono tracking-wider uppercase">Performance Index</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-between border border-slate-100">
                <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Attempted</div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold font-display text-slate-800">{totalAnswered}</div>
                  <div className="text-[10px] text-slate-500">logged</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-between border border-slate-100">
                <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Avg Accuracy</div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold font-display text-emerald-600">{accuracyRate}%</div>
                  <div className="text-[10px] text-slate-500">target is 70%</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-between border border-slate-100">
                <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Prebuilt</div>
                <div className="space-y-1">
                  <div className="text-xl font-bold font-display text-slate-800">{prebuiltTotal} Qs</div>
                  <div className="text-[10px] text-slate-500">offline database</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-between border border-slate-100">
                <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Bookmarks</div>
                <div className="space-y-1">
                  <div className="text-xl font-bold font-display text-amber-600">{userState.bookmarks.length} Qs</div>
                  <div className="text-[10px] text-slate-500">saved study</div>
                </div>
              </div>
            </div>
          </div>

          {/* Readiness Meter */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Syllabus Readiness</span>
                <div className="text-lg font-bold font-display text-slate-800">
                  {overallReadiness}% Complete
                </div>
              </div>
              <div className="relative w-11 h-11">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${currentExam === 'CLF-C02' ? 'text-amber-500' : 'text-blue-600'}`}
                    strokeDasharray={`${overallReadiness}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Certification Streaks & Milestone Badges Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-inner" id="gamification-panel">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4 text-indigo-500" />
              GAMIFIED PRACTICE REWARDS
            </div>
            <h2 className="text-xl font-bold font-display text-slate-800">
              Syllabus Streaks & Milestone Badges
            </h2>
            <p className="text-slate-500 text-xs font-sans">
              Earn status badges and maintain study streaks based on active practice questions, bookmarks, and mock exam scores.
            </p>
          </div>

          <div className="flex gap-4 shrink-0 bg-white border border-slate-150 p-3 rounded-2xl shadow-sm">
            {/* Daily Practice Streak Item */}
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl flex items-center justify-center ${dailyStreak > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-100 text-slate-400'}`}>
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-[9px] font-mono uppercase text-slate-400">Daily Streak</div>
                <div className="text-sm font-black font-display text-slate-800">
                  {dailyStreak} {dailyStreak === 1 ? 'Day' : 'Days'}
                </div>
              </div>
            </div>

            <div className="w-px h-8 bg-slate-200 self-center"></div>

            {/* Precision Streak Item */}
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl flex items-center justify-center ${correctStreak > 0 ? 'bg-teal-50 text-teal-500 border border-teal-100' : 'bg-slate-100 text-slate-400'}`}>
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-mono uppercase text-slate-400">Accuracy Run</div>
                <div className="text-sm font-black font-display text-slate-800">
                  {correctStreak} Correct
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Streak Prompt Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm text-xs md:text-sm">
          <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            💡
          </div>
          <div className="text-slate-600 leading-relaxed font-sans">
            {dailyStreak === 0 ? (
              <span>Your study streak is currently idle. Answer at least one practice question today to activate your **1-Day practice streak**!</span>
            ) : dailyStreak >= 3 ? (
              <span>Awesome consistency! You are on a **{dailyStreak}-day study run**. You are unlocking deep cognitive retention. Keep going!</span>
            ) : (
              <span>Nice start! You are on a **{dailyStreak}-day study run**. Answer daily to build bulletproof cloud mastery.</span>
            )}
            {correctStreak >= 3 && (
              <span className="block mt-1 font-semibold text-teal-600">
                🎯 Laser Focus: You answered the last {correctStreak} questions correctly in a row!
              </span>
            )}
          </div>
        </div>

        {/* Badges Grid */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Milestone Progress Collection</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {badges.map((badge) => {
              return (
                <div 
                  key={badge.id}
                  id={badge.id}
                  className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                    badge.unlocked 
                      ? 'bg-white border-slate-250 shadow-sm hover:shadow-md' 
                      : 'bg-slate-100/60 border-slate-200/50 opacity-75'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        badge.unlocked 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {badge.category}
                      </span>

                      {badge.unlocked ? (
                        <div className={`p-1.5 rounded-lg border ${badge.color}`}>
                          <Award className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold font-display ${badge.unlocked ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                        {badge.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-normal pt-1 font-sans">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  {/* Badge Progress Tracker */}
                  <div className="space-y-1 pt-2 border-t border-slate-100/80">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-400">Progress</span>
                      <span className={`font-semibold ${badge.unlocked ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {badge.current > badge.target ? badge.target : badge.current} / {badge.target}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${badge.unlocked ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        style={{ width: `${Math.min((badge.current / badge.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Unlocked stamp */}
                  {badge.unlocked && (
                    <div className="absolute top-0 right-2 -mt-2 bg-emerald-500 text-white text-[7px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded-full uppercase shadow-sm">
                      UNLOCKED
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Syllabus Domains Breakdown Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold font-display text-slate-800">
            Syllabus Domain Weightings & Readiness
          </h2>
          <span className="text-slate-500 text-xs font-mono">
            Passing Threshold: 700 / 1000 points
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {domains.map((domain, idx) => {
            const readiness = getDomainReadiness(domain.id);
            const answeredInDomain = getDomainAnswerCount(domain.id);

            return (
              <motion.div
                key={domain.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-400 font-mono">
                        WEIGHT: {domain.percentage}%
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">
                        {domain.name}
                      </h4>
                    </div>
                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600 text-xs font-bold font-mono">
                      Domain {idx + 1}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {domain.description}
                  </p>
                </div>

                {/* Topics Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {domain.topics.slice(0, 3).map((topic, tIdx) => (
                    <span key={tIdx} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-sans">
                      {topic}
                    </span>
                  ))}
                  {domain.topics.length > 3 && (
                    <span className="text-[10px] text-slate-400 italic font-sans px-1">
                      +{domain.topics.length - 3} more
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-500">Readiness: {readiness}%</span>
                    <span className="text-slate-400">{answeredInDomain} questions answered</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        currentExam === 'CLF-C02' ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${readiness}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick Practice CTA */}
                <button
                  id={`practice-shortcut-${domain.id}`}
                  onClick={() => {
                    userState.selectedDomainId = domain.id;
                    onNavigateToTab('practice');
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs py-2 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Practice Domain {idx + 1}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
