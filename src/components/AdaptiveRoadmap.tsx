import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Map, Compass, AlertCircle, CheckCircle, ArrowRight, BookOpen, 
  Sparkles, FileText, Award, Calendar, HelpCircle, Flame, ShieldAlert,
  ChevronRight, BrainCircuit, GraduationCap, ArrowUpRight, BarChart2
} from 'lucide-react';
import { AWSExamType, UserState, ExamDomain } from '../types';
import { AWS_DOMAINS, PREBUILT_QUESTIONS } from '../data/awsQuestions';

interface AdaptiveRoadmapProps {
  userState: UserState;
  onNavigateToTab: (tabId: string) => void;
  onSelectDomain?: (domainId: string) => void;
}

export default function AdaptiveRoadmap({
  userState,
  onNavigateToTab,
  onSelectDomain
}: AdaptiveRoadmapProps) {
  const currentExam = userState.examType;
  const domains = AWS_DOMAINS[currentExam];

  // Helper: filter answered keys for the active exam
  const answeredKeys = Object.keys(userState.answers).filter(key => {
    if (key.startsWith('clf_') && currentExam === 'CLF-C02') return true;
    if (key.startsWith('aif_') && currentExam === 'AIF-C01') return true;
    if (key.startsWith('gen_')) {
      // Check if this generated question corresponds to active exam
      return true; 
    }
    return false;
  });

  const totalAnswered = answeredKeys.length;
  const correctAnswers = answeredKeys.filter(key => userState.answers[key].isCorrect).length;
  const overallAccuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

  // Domain statistics helpers
  const getDomainStats = (domainId: string) => {
    const domainQuestions = PREBUILT_QUESTIONS.filter(q => q.domainId === domainId);
    const domainQuestionIds = domainQuestions.map(q => q.id);
    const answeredInDomain = answeredKeys.filter(key => domainQuestionIds.includes(key));
    
    const count = answeredInDomain.length;
    const correct = answeredInDomain.filter(key => userState.answers[key].isCorrect).length;
    const accuracy = count > 0 ? Math.round((correct / count) * 100) : 0;
    
    // Weighted priority for knowledge gap analysis:
    // High weight domains with low accuracy or zero practice are flagged first
    // If unpracticed (count === 0), we treat accuracy as 0 but priority is high
    const weight = domains.find(d => d.id === domainId)?.percentage || 10;
    const gapScore = count === 0 ? 100 : (100 - accuracy);
    const priority = Math.round(gapScore * (weight / 100));

    return {
      count,
      correct,
      accuracy,
      priority,
      unpracticed: count === 0
    };
  };

  // Compile all domain gap statuses
  const domainGaps = domains.map(domain => {
    const stats = getDomainStats(domain.id);
    return {
      domain,
      ...stats
    };
  }).sort((a, b) => b.priority - a.priority); // Highest gap priority first

  // Check if we have any gaps
  const criticalGaps = domainGaps.filter(g => g.unpracticed || g.accuracy < 75);

  // Dynamic Roadmap Steps
  const steps = [
    {
      id: 'step_terminology',
      title: 'Phase 1: Terminology & Core Architecture',
      subtitle: 'Build mental schemas with standard terminology definitions.',
      description: 'Review vocabulary, core service definitions, and shared boundaries before tackling situational questions.',
      requirement: 'Answer at least 2 syllabus questions and browse Terminology Flashcards.',
      status: totalAnswered >= 2 ? 'completed' : 'active',
      progress: Math.min(100, Math.round((totalAnswered / 2) * 100)),
      badgeText: totalAnswered >= 2 ? 'COMPLETED' : 'IN PROGRESS',
      actionLabel: 'Study Terminology Flashcards',
      actionTab: 'flashcards',
      tip: 'Modern cognitive science shows that learning definitions first drastically reduces question comprehension times.'
    },
    {
      id: 'step_domain_drills',
      title: 'Phase 2: Syllabus Domain Drills',
      subtitle: 'Achieve base-level accuracy across all weight categories.',
      description: 'Practice at least one scenario-based practice item within every single AWS syllabus domain to map out your baseline.',
      requirement: 'Practice questions in all domains.',
      status: (() => {
        if (totalAnswered < 2) return 'locked';
        const practicedCount = domains.filter(d => getDomainStats(d.id).count > 0).length;
        return practicedCount === domains.length ? 'completed' : 'active';
      })(),
      progress: Math.min(100, Math.round((domains.filter(d => getDomainStats(d.id).count > 0).length / domains.length) * 100)),
      badgeText: (() => {
        if (totalAnswered < 2) return 'LOCKED';
        const practicedCount = domains.filter(d => getDomainStats(d.id).count > 0).length;
        return practicedCount === domains.length ? 'COMPLETED' : 'IN PROGRESS';
      })(),
      actionLabel: 'Go to Practice Board',
      actionTab: 'practice',
      tip: 'Completing questions across all domains is key to detecting your hidden knowledge blind spots early.'
    },
    {
      id: 'step_scenario_mastery',
      title: 'Phase 3: Adaptive Scenario Mastery',
      subtitle: 'Hone high-order analytical skills on ambiguous scenarios.',
      description: 'Engage with custom AI-generated scenarios tailored to your weak points. Push your total practice volume to 10+ questions.',
      requirement: 'Solve 10 total practice scenarios.',
      status: (() => {
        const practicedCount = domains.filter(d => getDomainStats(d.id).count > 0).length;
        if (practicedCount < domains.length) return 'locked';
        return totalAnswered >= 10 ? 'completed' : 'active';
      })(),
      progress: Math.min(100, Math.round((totalAnswered / 10) * 100)),
      badgeText: (() => {
        const practicedCount = domains.filter(d => getDomainStats(d.id).count > 0).length;
        if (practicedCount < domains.length) return 'LOCKED';
        return totalAnswered >= 10 ? 'COMPLETED' : 'IN PROGRESS';
      })(),
      actionLabel: 'Query AI Training Coach',
      actionTab: 'coach',
      tip: 'Situational exam questions often blend 2 or 3 domains together. AI coaching is the absolute fastest way to master these overlaps.'
    },
    {
      id: 'step_simulator_conditioning',
      title: 'Phase 4: Full-Length Exam Conditioning',
      subtitle: 'Build operational stamina and time management routines.',
      description: 'Take a comprehensive timed mock examination under standard test configurations in the integrated AWS simulator.',
      requirement: 'Complete 1 simulated exam attempt.',
      status: (() => {
        if (totalAnswered < 10) return 'locked';
        return userState.attempts && userState.attempts.length > 0 ? 'completed' : 'active';
      })(),
      progress: userState.attempts && userState.attempts.length > 0 ? 100 : 0,
      badgeText: (() => {
        if (totalAnswered < 10) return 'LOCKED';
        return userState.attempts && userState.attempts.length > 0 ? 'COMPLETED' : 'READY';
      })(),
      actionLabel: 'Launch Exam Simulator',
      actionTab: 'simulator',
      tip: 'The simulator enforces strict time bounds. Conditioning helps bypass test anxiety and reinforces recall speed.'
    },
    {
      id: 'step_ready',
      title: 'Phase 5: Peak Passing Confidence',
      subtitle: 'Validate passing thresholds and solidify compliance.',
      description: 'Sustain a passing accuracy (>70%) across full examinations. Refine edge-case concepts utilizing personal revision logs.',
      requirement: 'Achieve score >= 70% in the Mock Simulator.',
      status: (() => {
        if (!userState.attempts || userState.attempts.length === 0) return 'locked';
        const bestScore = Math.max(...userState.attempts.map(a => (a.score / a.total) * 100));
        return bestScore >= 70 ? 'completed' : 'active';
      })(),
      progress: (() => {
        if (!userState.attempts || userState.attempts.length === 0) return 0;
        const bestScore = Math.max(...userState.attempts.map(a => (a.score / a.total) * 100));
        return Math.min(100, Math.round((bestScore / 70) * 100));
      })(),
      badgeText: (() => {
        if (!userState.attempts || userState.attempts.length === 0) return 'LOCKED';
        const bestScore = Math.max(...userState.attempts.map(a => (a.score / a.total) * 100));
        return bestScore >= 70 ? 'CERTIFIED' : 'ALMOST THERE';
      })(),
      actionLabel: 'Review Saved Study Notes',
      actionTab: 'review',
      tip: 'Before sitting for the actual AWS test center exam, review your custom study logs to consolidate short-term memory.'
    }
  ];

  // Helper to handle navigation and inject domain if needed
  const handleActionClick = (tabId: string, domainId?: string) => {
    if (domainId && onSelectDomain) {
      onSelectDomain(domainId);
    }
    onNavigateToTab(tabId);
  };

  return (
    <div className="space-y-8" id="adaptive-roadmap-container">
      
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs px-3 py-1 rounded-full font-mono">
                <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '20s' }} />
                GRE-INSPIRED PREP METHODOLOGY
              </span>
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1 rounded-full font-mono">
                ADAPTIVE LEARNING
              </span>
            </div>
            
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Adaptive Study Roadmap & Gaps
            </h1>
            <p className="text-slate-300 text-sm max-w-xl font-sans">
              Analyze weak domains, unlock progressive study checkpoints, and receive personalized recommended booster plans based on your direct learning telemetry.
            </p>
          </div>

          {/* Overall Status Widget */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shrink-0 flex flex-col justify-center min-w-[200px] text-center">
            <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Exam Readiness Index</span>
            <div className="py-2">
              <span className="text-4xl font-extrabold font-display bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                {overallAccuracy}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${overallAccuracy}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-2">
              {totalAnswered} Question Sessions Logged
            </span>
          </div>
        </div>
      </div>

      {/* 2. Grid for Gaps & Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: KNOWLEDGE GAPS ANALYZER (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Syllabus Knowledge Gaps
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Calculated via target syllabus weighting & historical accuracy
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic Message */}
            {criticalGaps.length === 0 ? (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-800">No Major Knowledge Gaps!</h4>
                <p className="text-xs text-slate-600 leading-normal font-sans">
                  Stellar job! You have demonstrated high accuracy across all practiced syllabus sections. Maintain this pace and tackle full simulated mock exams.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-sans">
                  The following areas are diagnosed as high priority. To unlock your full passing score, execute the dynamic booster actions recommended below:
                </p>

                {/* Priority Gaps List */}
                <div className="space-y-4">
                  {domainGaps.map((gap, index) => {
                    // Decide badging
                    let statusLabel = 'HEALTHY';
                    let statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    let isCritical = false;

                    if (gap.unpracticed) {
                      statusLabel = 'UNPRACTICED';
                      statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
                      isCritical = true;
                    } else if (gap.accuracy < 60) {
                      statusLabel = 'CRITICAL GAP';
                      statusColor = 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse';
                      isCritical = true;
                    } else if (gap.accuracy < 75) {
                      statusLabel = 'MODERATE GAP';
                      statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                      isCritical = true;
                    }

                    return (
                      <div 
                        key={gap.domain.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCritical 
                            ? 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50' 
                            : 'bg-white border-slate-100 hover:border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-slate-400 block">
                              DOMAIN {index + 1} • WEIGHT: {gap.domain.percentage}%
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 leading-snug">
                              {gap.domain.name.replace(/^Domain \d+:\s*/i, '')}
                            </h4>
                          </div>

                          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Domain Progress and metrics */}
                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100/60 text-xs font-sans">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono">Readiness / Accuracy</span>
                            <span className={`font-bold ${gap.accuracy < 60 && !gap.unpracticed ? 'text-rose-600' : gap.accuracy >= 75 ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {gap.unpracticed ? '0%' : `${gap.accuracy}%`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono">Completed Drills</span>
                            <span className="font-bold text-slate-800">
                              {gap.count} Questions
                            </span>
                          </div>
                        </div>

                        {/* Interactive Booster Trigger Options */}
                        {isCritical && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50 flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleActionClick('practice', gap.domain.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] py-1.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              <BookOpen className="w-3 h-3" />
                              Drill Scenario Questions
                            </button>
                            <button
                              onClick={() => {
                                // Direct study note/coach shortcut with prebuilt topic context
                                handleActionClick('coach');
                              }}
                              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] py-1.5 px-3 rounded-xl transition-all cursor-pointer"
                              title="Ask AI Coach for Custom Study Plan"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Ask AI Coach
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Study Metrics / Consistency insights Card */}
          <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 text-white space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Syllabus Coverage Audit
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-normal">
              A standard GRE study pipeline emphasizes systematic breadth over random repetition. Ensure you satisfy coverage in low-weight topics to bulletproof against random test bank draws.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-mono block">Weakest Domain</span>
                <span className="text-xs font-bold text-amber-400 block mt-1 truncate">
                  {domainGaps[0]?.domain.name.split(':')[0] || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-mono block">Recommended Mode</span>
                <span className="text-xs font-bold text-indigo-300 block mt-1">
                  {totalAnswered < 4 ? 'Terminology Hub' : 'AI Coach Session'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RECURRING CHROMATIC STUDY PIPELINE (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Syllabus-Grounding Learning Roadmap
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Your dynamic pathway matching official AWS exam requirements
                  </p>
                </div>
              </div>

              <div className="text-[10px] bg-indigo-50 text-indigo-700 font-bold font-mono px-2.5 py-1 rounded-xl">
                {steps.filter(s => s.status === 'completed').length} / {steps.length} STAGES UNLOCKED
              </div>
            </div>

            {/* Stepper Pipeline Flow */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
              
              {steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isActive = step.status === 'active';
                const isLocked = step.status === 'locked';

                // Assign decorative styles
                let circleStyle = 'bg-slate-100 border-slate-200 text-slate-400';
                let cardStyle = 'border-slate-100 opacity-60 bg-slate-50/40';

                if (isCompleted) {
                  circleStyle = 'bg-emerald-500 border-emerald-500 text-white shadow-sm ring-4 ring-emerald-50';
                  cardStyle = 'border-slate-200 bg-white hover:shadow-md';
                } else if (isActive) {
                  circleStyle = 'bg-indigo-600 border-indigo-600 text-white shadow-sm ring-4 ring-indigo-50 animate-pulse';
                  cardStyle = 'border-indigo-200 bg-gradient-to-tr from-white to-indigo-50/10 shadow-sm ring-1 ring-indigo-100/50';
                }

                return (
                  <div key={step.id} className="relative">
                    
                    {/* Stepper Bubble Badge */}
                    <div className={`absolute -left-[35px] top-1.5 w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10 ${circleStyle}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Card */}
                    <div className={`p-5 rounded-2xl border transition-all duration-300 space-y-3 ${cardStyle}`}>
                      
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className={`text-sm font-bold font-display ${isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                            {step.title}
                          </h3>
                          <span className="text-[11px] text-indigo-600 font-semibold block mt-0.5">
                            {step.subtitle}
                          </span>
                        </div>

                        {/* Chromatic indicator badges */}
                        <span className={`text-[8px] tracking-widest font-mono font-black px-2 py-0.5 rounded-md ${
                          isCompleted 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : isActive 
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {step.badgeText}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        {step.description}
                      </p>

                      {/* Progress Line */}
                      {!isLocked && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                            <span>Requirement Completion: {step.requirement}</span>
                            <span className="font-semibold text-slate-700">{step.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                              style={{ width: `${step.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Mini Tip block for active stages */}
                      {isActive && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-600 leading-normal flex items-start gap-2 font-sans">
                          <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-indigo-900">Roadmap Insight:</strong> {step.tip}
                          </span>
                        </div>
                      )}

                      {/* CTA Trigger */}
                      {!isLocked && !isCompleted && (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleActionClick(step.actionTab)}
                            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                          >
                            <span>{step.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
