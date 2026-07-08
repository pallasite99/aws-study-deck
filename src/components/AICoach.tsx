import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Send, GraduationCap, MessageSquare, AlertCircle, 
  Trash2, HelpCircle, Shield, Cpu, Database, Coins, 
  Compass, HelpCircle as QuestionIcon, Award, ArrowRight, User
} from 'lucide-react';
import { AWSQuestion, UserState } from '../types';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface AICoachProps {
  userState: UserState;
  activeQuestionContext: AWSQuestion | null;
  onClearQuestionContext: () => void;
  aiEngineReady: boolean;
}

// Structured learning library for instant sidebar research
const STUDY_TOPICS = [
  {
    category: "AI & Machine Learning",
    icon: <Cpu className="w-4.5 h-4.5 text-pink-500" />,
    items: [
      { label: "Amazon Bedrock vs SageMaker", prompt: "Explain Bedrock vs SageMaker and the target audience for each." },
      { label: "Bedrock Guardrails & Safety", prompt: "Explain Amazon Bedrock Guardrails, content filters, and PII redaction." },
      { label: "RAG & Knowledge Bases", prompt: "What is Retrieval-Augmented Generation (RAG) and S3 integration in Amazon Bedrock?" }
    ]
  },
  {
    category: "Cloud Architecture & Security",
    icon: <Shield className="w-4.5 h-4.5 text-indigo-500" />,
    items: [
      { label: "Shared Responsibility Model", prompt: "Explain the AWS Shared Responsibility Model. Give examples of who secures what." },
      { label: "AWS KMS & Key Management", prompt: "What is AWS KMS? Explain symmetric keys and how it integrates with CloudTrail." },
      { label: "WAF vs AWS Shield DDoS", prompt: "Compare AWS WAF (Layer 7) vs AWS Shield (Layer 3/4 DDoS protection) for edge security." }
    ]
  },
  {
    category: "Database & Compute",
    icon: <Database className="w-4.5 h-4.5 text-blue-500" />,
    items: [
      { label: "RDS vs Aurora vs DynamoDB", prompt: "Explain AWS database choices: RDS relational, Aurora cloud-native, and DynamoDB NoSQL." },
      { label: "EC2 vs AWS Lambda vs Fargate", prompt: "Compare EC2, AWS Lambda serverless functions, and AWS Fargate serverless containers." },
      { label: "CloudWatch vs CloudTrail Logs", prompt: "What is the difference between CloudWatch metrics and CloudTrail audit logs?" }
    ]
  },
  {
    category: "Pricing & Billing",
    icon: <Coins className="w-4.5 h-4.5 text-amber-500" />,
    items: [
      { label: "AWS Billing Tools & Budgets", prompt: "How do AWS Budgets, Cost Explorer, and Consolidated Billing help optimize costs?" },
      { label: "EC2 Spot vs Reserved Instances", prompt: "Explain EC2 pricing models: On-Demand, Reserved Instances, and Spot savings." }
    ]
  }
];

const FOLLOWUP_OPTIONS = [
  { text: "Explain with a real analogy 💡", type: "analogy" },
  { text: "Give me an exam-style question on this 📝", type: "question" },
  { text: "What is the key takeaway for the exam? 🎯", type: "takeaway" }
];

export default function AICoach({
  userState,
  activeQuestionContext,
  onClearQuestionContext,
  aiEngineReady
}: AICoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>(STUDY_TOPICS[0].category);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Load chat history from localStorage on startup
  useEffect(() => {
    const saved = localStorage.getItem(`aws_practice_chat_${userState.examType}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load saved chat history:", err);
      }
    } else {
      // Default welcome greeting
      setMessages([
        {
          role: 'model',
          content: `Hello! I am your AI AWS Training Coach, powered by **Gemini**. 
I specialize in guiding students to ace their AWS **CLF-C02** and **AIF-C01** certifications.

Ask me about any services, billing models, architectural diagrams, or click one of the preloaded study topics in the sidebar to start!`
        }
      ]);
    }
  }, [userState.examType]);

  // Persist chat history to localStorage
  const saveChatHistory = (msgs: Message[]) => {
    localStorage.setItem(`aws_practice_chat_${userState.examType}`, JSON.stringify(msgs));
  };

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  }, [messages, isTyping]);

  // Load active question context if incoming from Practice Tab
  useEffect(() => {
    if (activeQuestionContext) {
      const explainPrompt = `Can you explain why the correct option is the best choice for this question? 
Question: "${activeQuestionContext.questionText}" 
Scenario Context: "${activeQuestionContext.scenario}"
Options: ${activeQuestionContext.options.join(', ')}
Correct Answer: "${activeQuestionContext.options[activeQuestionContext.correctAnswerIndex]}"`;

      setInputText(explainPrompt);
    }
  }, [activeQuestionContext]);

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setInputText('');
    setIsTyping(true);

    // If context was used, clear it in the main state
    if (activeQuestionContext) {
      onClearQuestionContext();
    }

    try {
      const response = await fetch('/api/study-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          examType: userState.examType,
          currentQuestion: activeQuestionContext,
          simulate503: !!userState.simulate503
        })
      });

      const data = await response.json();
      const nextMsgs: Message[] = [...updatedMessages, { role: 'model', content: data.reply }];
      setMessages(nextMsgs);
      saveChatHistory(nextMsgs);

    } catch (err) {
      console.error(err);
      const nextMsgs: Message[] = [...updatedMessages, { 
        role: 'model', 
        content: "⚠️ I ran into a connection glitch reaching the AWS Coaching Node. Let's try sending that query again!" 
      }];
      setMessages(nextMsgs);
      saveChatHistory(nextMsgs);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear your current conversation history?")) {
      const initial: Message[] = [
        {
          role: 'model',
          content: `Chat cleared! Ask me anything about AWS ${userState.examType} or select one of the study topics to continue learning!`
        }
      ];
      setMessages(initial);
      saveChatHistory(initial);
    }
  };

  // Click handler for suggestion chips
  const handleFollowUpClick = (followUpText: string) => {
    const lastTutorReply = [...messages].reverse().find(m => m.role === 'model')?.content || "";
    // Extract first line or service term to ground follow-up
    const serviceMatch = lastTutorReply.match(/###\s*(.*)/) || lastTutorReply.match(/Amazon\s+(\w+)/) || lastTutorReply.match(/AWS\s+(\w+)/);
    const serviceContext = serviceMatch ? ` regarding ${serviceMatch[1].replace(/[^\w\s-]/g, '').trim()}` : "";
    
    let prompt = "";
    if (followUpText.includes("analogy")) {
      prompt = `Could you explain the previous concept${serviceContext} using a creative real-world analogy? Make it simple and memorable for the exam.`;
    } else if (followUpText.includes("question")) {
      prompt = `Draft a high-quality, exam-style scenario question (with 4 multiple-choice options and explanation) testing my knowledge of the previous concept${serviceContext}.`;
    } else {
      prompt = `What are the absolute top 3 key takeaways I must memorize for the AWS ${userState.examType} exam regarding the previous concept${serviceContext}?`;
    }

    handleSendMessage(prompt);
  };

  // --- Inline formatting parsers for clean Markdown-lite rendering ---
  function renderBoldFormatting(text: string) {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) parts.push(textBefore);
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold text-slate-900 dark:text-amber-400">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    const textAfter = text.substring(lastIndex);
    if (textAfter) parts.push(textAfter);

    return parts;
  }

  function renderInlineMarkdown(text: string) {
    const codeRegex = /`([^`]+)`/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(...renderBoldFormatting(textBefore));
      }
      parts.push(
        <code key={`code-${match.index}`} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-xs font-mono border border-slate-200 dark:border-slate-700">
          {match[1]}
        </code>
      );
      lastIndex = codeRegex.lastIndex;
    }

    const textAfter = text.substring(lastIndex);
    if (textAfter) {
      parts.push(...renderBoldFormatting(textAfter));
    }

    return parts;
  }

  function renderMarkdownContent(text: string) {
    let isOfflineMode = false;
    let cleanText = text;

    if (cleanText.includes("⚠️ *[Local Expert Study Guide - Running in Offline/Sandbox Mode]*")) {
      isOfflineMode = true;
      cleanText = cleanText.replace("⚠️ *[Local Expert Study Guide - Running in Offline/Sandbox Mode]*", "").trim();
    } else if (cleanText.includes("⚠️ *[Cloud Network Congestion - Switched to High-Fidelity Local Grounding Mode]*")) {
      isOfflineMode = true;
      cleanText = cleanText.replace("⚠️ *[Cloud Network Congestion - Switched to High-Fidelity Local Grounding Mode]*", "").trim();
    }

    const paragraphs = cleanText.split('\n\n');

    return (
      <div className="space-y-3.5">
        {isOfflineMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-sans leading-relaxed shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold font-display text-amber-900 dark:text-amber-400">AWS Local Study Grounding Active:</span> We are currently experiencing cloud computing network congestion. To ensure your preparation is fully continuous, I am serving native prebuilt training concepts offline. Keep studying!
            </div>
          </div>
        )}

        {paragraphs.map((p, pIdx) => {
          const trimmed = p.trim();
          if (!trimmed) return null;

          // 1. Markdown Tables
          if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
            const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
            if (lines.length >= 2) {
              const headers = lines[0].split('|').map(h => h.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
              const bodyRows = lines.slice(2).map(row => 
                row.split('|').map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
              );

              return (
                <div key={pIdx} className="overflow-x-auto my-3 border border-slate-150 rounded-2xl bg-white shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-3 font-bold text-slate-800 font-display">
                            {renderInlineMarkdown(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bodyRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3 text-slate-600 leading-relaxed font-sans">
                              {renderInlineMarkdown(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
          }

          // 2. Custom Markdown Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={pIdx} className="text-sm font-bold text-slate-800 font-display mt-5 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {renderInlineMarkdown(trimmed.replace('### ', ''))}
              </h3>
            );
          }
          if (trimmed.startsWith('#### ')) {
            return (
              <h4 key={pIdx} className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mt-4">
                {renderInlineMarkdown(trimmed.replace('#### ', ''))}
              </h4>
            );
          }

          // 3. Blockquotes
          if (trimmed.startsWith('> ')) {
            const content = trimmed.replace(/^>\s*/, '').replace(/\n>\s*/g, '\n');
            return (
              <blockquote key={pIdx} className="border-l-4 border-amber-500 bg-amber-50/40 p-4 rounded-r-2xl text-xs md:text-sm text-slate-600 italic font-medium my-2">
                {renderInlineMarkdown(content)}
              </blockquote>
            );
          }

          // 4. Bullet lists
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const items = trimmed.split(/\n[-*]\s+/).map(item => item.replace(/^[-*]\s+/, '').trim());
            return (
              <ul key={pIdx} className="list-none space-y-2 my-2">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-2.5 items-start text-slate-600 text-xs md:text-sm leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></span>
                    <div className="flex-1">{renderInlineMarkdown(item)}</div>
                  </li>
                ))}
              </ul>
            );
          }

          // 5. Numbered lists
          if (/^\d+\.\s+/.test(trimmed)) {
            const items = trimmed.split(/\n\d+\.\s+/).map(item => item.replace(/^\d+\.\s+/, '').trim());
            return (
              <ol key={pIdx} className="list-none space-y-2.5 my-2">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-3 items-start text-slate-600 text-xs md:text-sm leading-relaxed">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-500 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                      {itemIdx + 1}
                    </span>
                    <div className="flex-1">{renderInlineMarkdown(item)}</div>
                  </li>
                ))}
              </ol>
            );
          }

          // Standard Paragraph
          return (
            <p key={pIdx} className="text-slate-600 text-xs md:text-sm leading-relaxed font-sans">
              {renderInlineMarkdown(trimmed)}
            </p>
          );
        })}
      </div>
    );
  }

  // Find the last message and check if suggestions should be shown
  const lastMessageIsTutor = messages.length > 0 && messages[messages.length - 1].role === 'model';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px] max-h-[85vh]" id="coach-tab">
      
      {/* Sidebar - Interactive Learning Directories */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between overflow-hidden">
        
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase">Study Directories</h3>
            <h4 className="text-sm font-bold text-slate-800 font-display">Expert AWS Core Syllabus</h4>
          </div>

          {/* Directory Category Switches */}
          <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-3">
            {STUDY_TOPICS.map((topic) => (
              <button
                key={topic.category}
                onClick={() => setActiveCategory(topic.category)}
                className={`p-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === topic.category
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {topic.icon}
                <span>{topic.category.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Topic Prompts of Active Category */}
          <div className="space-y-2 pt-2">
            {STUDY_TOPICS.find(t => t.category === activeCategory)?.items.map((item, idx) => (
              <button
                key={idx}
                id={`study-item-btn-${idx}`}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isTyping}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-150 hover:border-amber-400 hover:bg-amber-500/5 text-xs text-slate-700 transition-all cursor-pointer disabled:opacity-50 flex items-start gap-2.5 group font-medium"
              >
                <Compass className="w-4 h-4 text-slate-400 group-hover:text-amber-500 shrink-0 mt-0.5 transition-colors" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 group-hover:text-slate-900 text-xs leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 group-hover:text-slate-500 truncate max-w-[180px]">Load syllabus briefing...</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer actions of Sidebar */}
        <div className="space-y-3 pt-4 border-t border-slate-150 mt-4 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>CLOUDPREP COACH v1.2</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>

          <button
            id="clear-chat-history"
            onClick={handleClearChat}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Active Chat History
          </button>
        </div>
      </div>

      {/* Primary Dialogue Arena */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl shadow-sm lg:col-span-3 flex flex-col justify-between overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="bg-white p-4 flex justify-between items-center px-6 shrink-0 border-b border-slate-200/80 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-200/50 shadow-sm">
              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-slate-800 flex items-center gap-1.5">
                AWS AI Training Coach
              </h3>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Professional Certified Prep Node</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-semibold border ${
              aiEngineReady 
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
            }`}>
              {aiEngineReady ? '● AI Live Engine Online' : '⚠️ Offline Mode Enabled'}
            </span>
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24 space-y-3"
              >
                <Compass className="w-12 h-12 text-slate-300 mx-auto animate-spin-slow" />
                <h4 className="font-display font-semibold text-slate-700">Ready to teach you AWS</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Type an AWS question in the console input, or choose a core syllabus topic to launch your personalized tutoring.
                </p>
              </motion.div>
            ) : (
              messages.map((msg, idx) => {
                const isModel = msg.role === 'model';
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 max-w-[85%] ${isModel ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                  >
                    {/* Speaker Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                      isModel 
                        ? 'bg-amber-500/10 border-amber-200/50 text-amber-500' 
                        : 'bg-slate-900 border-slate-800 text-white'
                    }`}>
                      {isModel ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Chat Bubble Container */}
                    <div className="space-y-1">
                      <div
                        className={`p-4 md:p-5 rounded-3xl leading-relaxed text-xs sm:text-sm ${
                          isModel
                            ? 'bg-white border border-slate-150 text-slate-800 rounded-tl-none shadow-sm'
                            : 'bg-slate-900 text-white rounded-tr-none shadow-md'
                        }`}
                      >
                        {isModel ? renderMarkdownContent(msg.content) : msg.content}
                      </div>

                      {/* Speaker label & timestamp */}
                      <div className={`text-[10px] text-slate-400 font-mono px-1.5 ${!isModel && 'text-right'}`}>
                        {isModel ? "CloudPrep AI Coach" : "You (Candidate)"}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[80%] mr-auto items-center"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-200/50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-white border border-slate-150 p-4 rounded-3xl rounded-tl-none flex flex-col gap-2 shadow-sm min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono italic">Consulting AWS Syllabus Specs...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={chatBottomRef}></div>
        </div>

        {/* Actionable Followup Chips Pane */}
        {lastMessageIsTutor && !isTyping && (
          <div className="px-6 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-2 items-center shrink-0">
            <span className="text-[10px] font-mono text-slate-400 mr-1 uppercase">Follow-up:</span>
            {FOLLOWUP_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleFollowUpClick(opt.text)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-amber-500/5 border border-slate-150 hover:border-amber-400 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-full transition-all cursor-pointer"
              >
                {opt.text}
              </button>
            ))}
          </div>
        )}

        {/* Incoming Active Question Context Alert Banner */}
        <AnimatePresence>
          {activeQuestionContext && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-indigo-50 border-t border-indigo-150 px-6 py-3.5 flex justify-between items-center text-xs text-indigo-900 font-sans z-10 shadow-inner"
            >
              <div className="flex items-center gap-2 truncate">
                <QuestionIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="font-bold font-display truncate">
                  Active Question Context Loaded: "{activeQuestionContext.questionText}"
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  id="clear-question-context"
                  onClick={onClearQuestionContext}
                  className="px-2.5 py-1 bg-white border border-indigo-200 hover:bg-slate-50 text-indigo-600 hover:text-indigo-800 rounded-lg font-bold text-[10px] transition-colors"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Control Bar */}
        <div className="p-4 bg-white border-t border-slate-200/80 shrink-0 z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex gap-2"
          >
            <input
              id="coach-chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me an AWS question or click a sidebar topic..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner"
            />
            <button
              id="coach-chat-send"
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-3 rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
