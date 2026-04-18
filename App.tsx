/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode, FormEvent } from 'react';
import { 
  Search, 
  Target, 
  ClipboardList, 
  MessageSquare, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Award, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Star,
  Trash2,
  Menu,
  X,
  Info,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  User as UserIcon,
  MapPin,
  Users,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  differenceInDays,
  isAfter,
  isBefore,
  startOfDay
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Category, Goal, Task, Review, ExploreItem, User, StudyGroup, GoalEvent } from './types';
import { exploreItems } from './data/exploreData';
import { getGoalInformation } from './lib/gemini';

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  loading = false,
  type = 'button'
}: { 
  children: ReactNode; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const variants = {
    primary: 'bg-bento-primary text-white hover:opacity-90 shadow-sm',
    secondary: 'bg-bento-bg text-bento-text-main border border-bento-border hover:bg-white',
    ghost: 'bg-transparent text-bento-text-sub hover:bg-bento-bg',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', id }: { children: ReactNode; className?: string; id?: string; key?: string | number }) => (
  <div id={id} className={`bg-bento-card rounded-[20px] border border-bento-border p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'indigo' }: { children: ReactNode; variant?: 'indigo' | 'green' | 'amber' | 'blue' }) => {
  const variants = {
    indigo: 'bg-indigo-50 text-bento-primary',
    green: 'bg-emerald-50 text-bento-accent',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-bento-primary'
  };
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${variants[variant]}`}>
      {children}
    </span>
  );
};

// --- Calendar Components ---

const CalendarView = ({ 
  goals, 
  onAddEvent, 
  onUpdateEvent, 
  onDeleteEvent 
}: { 
  goals: Goal[], 
  onAddEvent: (goalId: string, event: Omit<GoalEvent, 'id'>) => void,
  onUpdateEvent: (goalId: string, event: GoalEvent) => void,
  onDeleteEvent: (goalId: string, eventId: string) => void
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ goalId: string; event: GoalEvent } | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const allEvents = goals.flatMap(g => [
    ...(g.deadline ? [{ 
      id: `${g.id}-deadline`, 
      title: `${g.title} (결과발표/마감)`, 
      date: g.deadline, 
      type: 'deadline' as const,
      goalTitle: g.title,
      goalId: g.id,
      color: 'bg-red-500',
      isDeadline: true
    }] : []),
    ...(g.events || []).map(e => ({
      ...e,
      goalTitle: g.title,
      goalId: g.id,
      color: e.type === 'exam' ? 'bg-indigo-500' : e.type === 'schedule' ? 'bg-emerald-500' : 'bg-red-500',
      isDeadline: false
    }))
  ]);

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const goalId = formData.get('goalId') as string;
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const type = formData.get('type') as any;

    if (goalId && title && date) {
      if (editingEvent) {
        onUpdateEvent(goalId, { id: editingEvent.event.id, title, date, type });
      } else {
        onAddEvent(goalId, { title, date, type });
      }
      handleClose();
    }
  };

  const handleDelete = () => {
    if (editingEvent) {
      onDeleteEvent(editingEvent.goalId, editingEvent.event.id);
      handleClose();
    }
  };

  const handleClose = () => {
    setShowAddEvent(false);
    setSelectedDate(null);
    setEditingEvent(null);
  };

  return (
    <div className="space-y-6">
      <Card className="!p-8 bg-white border-none shadow-xl rounded-[32px] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-3xl font-black tracking-tighter text-bento-text-main">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h3>
            <p className="text-bento-text-sub font-bold mt-1">등록된 주요 일정 {allEvents.filter(e => isSameMonth(parseISO(e.date), currentMonth)).length}개가 이번 달에 있습니다.</p>
          </div>
          <div className="flex items-center gap-4">
             <Button 
                onClick={() => {
                  setSelectedDate(new Date());
                  setShowAddEvent(true);
                  setEditingEvent(null);
                }} 
                className="rounded-2xl bg-bento-primary text-white py-2.5 px-6 shadow-lg shadow-blue-200"
              >
                <Plus className="w-4 h-4" /> 일정 추가
             </Button>
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={prevMonth}
                className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-bento-text-sub hover:text-bento-primary"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 font-black text-xs uppercase tracking-widest text-bento-text-sub hover:text-bento-primary"
              >
                Today
              </button>
              <button 
                onClick={nextMonth}
                className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-bento-text-sub hover:text-bento-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 mb-2">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
            <div key={day} className={`py-4 text-center text-[10px] font-black tracking-[0.2em] ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
          {days.map((day, idx) => {
            const dayEvents = allEvents.filter(e => isSameDay(parseISO(e.date), day));
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => {
                  setSelectedDate(day);
                  setShowAddEvent(true);
                  setEditingEvent(null);
                }}
                className={`min-h-[120px] bg-white p-3 transition-colors hover:bg-slate-50 relative overflow-hidden cursor-pointer group ${!isCurrentMonth ? 'opacity-30' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg ${
                    isToday ? 'bg-bento-primary text-white shadow-lg shadow-blue-200' : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <Plus className="w-3 h-3 text-bento-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-1.5">
                  {dayEvents.map(event => (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((event as any).isDeadline) return; // Deadline is immutable here
                        setEditingEvent({ goalId: (event as any).goalId, event: event as GoalEvent });
                        setShowAddEvent(true);
                        setSelectedDate(parseISO(event.date));
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-white leading-tight truncate ${(event as any).isDeadline ? 'cursor-default' : 'hover:scale-105 transition-transform'} ${event.color}`}
                      title={`${event.goalTitle}: ${event.title}`}
                    >
                      {event.title}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Event Modal Overlay */}
        <AnimatePresence>
           {showAddEvent && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md p-10 flex flex-col items-center justify-center"
              >
                 <button 
                  onClick={handleClose}
                  className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-all"
                 >
                    <X />
                 </button>

                 <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                       <h4 className="text-2xl font-black tracking-tight">{editingEvent ? '일정 수정' : '새로운 일정 추가'}</h4>
                       <p className="text-bento-text-sub font-bold mt-1">
                          {selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko }) : ''}의 일정을 {editingEvent ? '수정' : '등록'}합니다.
                       </p>
                    </div>

                    {goals.length === 0 ? (
                       <div className="text-center py-10">
                          <p className="text-sm font-bold text-slate-400 mb-4">등록된 목표가 없습니다. 먼저 목표를 등록해주세요!</p>
                          <Button variant="secondary" onClick={handleClose}>목표 관리로 이동</Button>
                       </div>
                    ) : (
                       <form onSubmit={handleAddSubmit} className="space-y-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-bento-text-sub uppercase tracking-widest ml-1">날짜</label>
                             <input 
                                type="date"
                                name="date"
                                defaultValue={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                                required 
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-bento-primary/10 transition-all font-bold"
                             />
                          </div>
                          
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-bento-text-sub uppercase tracking-widest ml-1">관련 목표 선택</label>
                             <select name="goalId" defaultValue={editingEvent?.goalId} required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-bento-primary/10 transition-all font-bold appearance-none">
                                {goals.map(g => (
                                   <option key={g.id} value={g.id}>{g.title}</option>
                                ))}
                             </select>
                          </div>

                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-bento-text-sub uppercase tracking-widest ml-1">일정 내용</label>
                             <input 
                                name="title" 
                                defaultValue={editingEvent?.event.title}
                                required 
                                placeholder="예: 1차 필기시험, 서류 마감일 등"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-bento-primary/10 transition-all font-bold"
                             />
                          </div>

                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-bento-text-sub uppercase tracking-widest ml-1">일정 유형</label>
                             <div className="grid grid-cols-3 gap-2">
                                {[
                                   { val: 'exam', label: '시험', color: 'bg-indigo-500' },
                                   { val: 'schedule', label: '스케줄', color: 'bg-emerald-500' },
                                   { val: 'deadline', label: '마감', color: 'bg-red-500' }
                                ].map(t => (
                                   <label key={t.val} className="relative cursor-pointer">
                                      <input type="radio" name="type" value={t.val} defaultChecked={editingEvent ? editingEvent.event.type === t.val : t.val === 'schedule'} className="peer sr-only" />
                                      <div className={`py-3 px-2 rounded-xl border border-transparent peer-checked:border-bento-primary bg-slate-50 text-center font-black text-[10px] transition-all hover:bg-white`}>
                                         <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${t.color}`} />
                                         {t.label}
                                      </div>
                                   </label>
                                ))}
                             </div>
                          </div>

                          <div className="flex flex-col gap-3 pt-6">
                             <div className="flex gap-4">
                                <Button variant="ghost" className="flex-1" onClick={handleClose}>취소</Button>
                                <Button type="submit" className="flex-[2] bg-bento-primary text-white shadow-lg shadow-blue-200">{editingEvent ? '업데이트' : '일정 등록하기'}</Button>
                             </div>
                             {editingEvent && (
                                <Button variant="danger" className="w-full py-4 rounded-2xl" onClick={handleDelete}>
                                   <Trash2 className="w-4 h-4" /> 일정 삭제하기
                                </Button>
                             )}
                          </div>
                       </form>
                    )}
                 </div>
              </motion.div>
           )}
        </AnimatePresence>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-none shadow-lg">
          <h4 className="font-black text-sm mb-4 flex items-center gap-2">
             <Clock className="w-4 h-4 text-red-500" /> 다가오는 D-Day
          </h4>
          <div className="space-y-3">
             {allEvents
               .filter(e => isAfter(parseISO(e.date), startOfDay(new Date())))
               .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
               .slice(0, 4)
               .map(e => {
                  const dDay = differenceInDays(parseISO(e.date), startOfDay(new Date()));
                  return (
                    <div key={e.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${e.color}`} />
                          <div>
                             <p className="text-[11px] font-bold text-bento-text-main leading-none">{e.title}</p>
                             <p className="text-[10px] text-bento-text-sub mt-1">{format(parseISO(e.date), 'yyyy년 MM월 dd일')}</p>
                          </div>
                       </div>
                       <span className="text-sm font-black text-bento-primary">D-{dDay}</span>
                    </div>
                  );
               })
             }
             {allEvents.length === 0 && (
               <p className="text-xs text-slate-400 py-4 text-center">예정된 일정이 없습니다.</p>
             )}
          </div>
        </Card>

        <Card className="bg-bento-primary text-white border-none shadow-lg overflow-hidden relative">
           <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                 <h4 className="font-black text-sm opacity-60 uppercase tracking-widest mb-6">스케줄 팁</h4>
                 <h3 className="text-xl font-black leading-tight">
                    달력에서 날짜를 직접 클릭하면<br/>
                    해당 일자의 새로운 일정을 즉시 등록할 수 있습니다.
                 </h3>
              </div>
              <p className="text-[10px] font-bold mt-10">스마트한 일정 관리로 목표 달성 확률을 높여보세요!</p>
           </div>
           <Calendar className="absolute -bottom-8 -right-8 w-40 h-40 opacity-10 rotate-12" />
        </Card>
      </div>
    </div>
  );
};

// --- App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'explore' | 'goals' | 'reviews' | 'profile' | 'calendar'>('explore');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [trendingIndex, setTrendingIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [entryPath, setEntryPath] = useState<'register' | 'motivation' | 'app'>('register');
  const [motivationQuote, setMotivationQuote] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const quotes = [
    "오늘의 노력이 내일의 당신을 만듭니다.",
    "포기하지 마세요. 시작은 언제나 힘들기 마련입니다.",
    "당신의 꿈은 당신의 행동에 달려 있습니다.",
    "작은 성취가 모여 큰 성공을 이룹니다.",
    "자신을 믿으세요. 당신은 생각보다 강합니다.",
    "실패는 성공으로 가는 과정일 뿐입니다.",
    "꿈을 향한 도전은 그 자체로 아름답습니다.",
    "오늘 할 일을 내일로 미루지 마세요.",
    "빛나는 미래는 오늘 준비하는 자의 것입니다.",
    "당신은 우리 중 가장 빛날 별입니다."
  ];

  // Logic for Motivation Screen
  useEffect(() => {
    if (entryPath === 'motivation') {
      setMotivationQuote(quotes[Math.floor(Math.random() * quotes.length)]);
      const timer = setTimeout(() => {
        // Option to auto-enter or wait for click. Let's wait for click for user experience.
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [entryPath]);

  const trendingKeywords = [
    { rank: 1, keyword: '정보처리기사 2회', status: 'up' },
    { rank: 2, keyword: '토익 만점 수기', status: 'same' },
    { rank: 3, keyword: '삼성 드림클래스', status: 'new' },
    { rank: 4, keyword: '데이터분석 준전문가', status: 'up' },
    { rank: 5, keyword: '네이버 상반기 공채', status: 'down' },
    { rank: 6, keyword: '오픽 AL', status: 'up' },
    { rank: 7, keyword: '컴활 1급 실기', status: 'same' },
    { rank: 8, keyword: 'HSK 6급', status: 'new' },
    { rank: 9, keyword: 'SQLD 기출문제', status: 'up' },
    { rank: 10, keyword: '대외활동 추천', status: 'down' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTrendingIndex(prev => (prev + 1) % trendingKeywords.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [trendingKeywords.length]);

  // Persistence
  useEffect(() => {
    const savedGoals = localStorage.getItem('campus-step-goals');
    const savedReviews = localStorage.getItem('campus-step-reviews');
    const savedUser = localStorage.getItem('campus-step-user');
    const savedStudyGroups = localStorage.getItem('campus-step-study-groups');
    
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedReviews) setReviews(JSON.parse(savedReviews));
    if (savedStudyGroups) setStudyGroups(JSON.parse(savedStudyGroups));
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setEntryPath('motivation');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('campus-step-goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('campus-step-reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('campus-step-study-groups', JSON.stringify(studyGroups));
  }, [studyGroups]);

  const handleRegister = (name: string, school: string, grade: string, location: string) => {
    const newUser: User = { name, school, grade, location };
    setUser(newUser);
    localStorage.setItem('campus-step-user', JSON.stringify(newUser));
    setEntryPath('motivation');
  };

  const updateProfile = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('campus-step-user', JSON.stringify(updatedUser));
    setIsEditingProfile(false);
  };

  // Actions
  const handleAddGoal = async (title: string, category: Category, desc: string) => {
    setIsGenerating(true);
    const info = await getGoalInformation(title, desc);
    const newGoal: Goal = {
      id: Date.now().toString(),
      title,
      category,
      description: desc,
      progress: 0,
      tasks: [],
      info,
      createdAt: new Date().toISOString()
    };
    setGoals([newGoal, ...goals]);
    setIsGenerating(false);
    setIsAddingGoal(false);
    setNewGoalTitle('');
    setActiveTab('goals');
  };

  const addTask = (goalId: string, taskTitle: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const newTask: Task = {
          id: Date.now().toString(),
          title: taskTitle,
          completed: false
        };
        const updatedTasks = [...goal.tasks, newTask];
        const progress = Math.round((updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 100);
        return { ...goal, tasks: updatedTasks, progress };
      }
      return goal;
    }));
  };

  const toggleTask = (goalId: string, taskId: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const updatedTasks = goal.tasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        const progress = Math.round((updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 100);
        return { ...goal, tasks: updatedTasks, progress };
      }
      return goal;
    }));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const addEventToGoal = (goalId: string, event: Omit<GoalEvent, 'id'>) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const newEvent = { ...event, id: Date.now().toString() };
        return { ...goal, events: [...(goal.events || []), newEvent] };
      }
      return goal;
    }));
  };

  const updateEventInGoal = (goalId: string, event: GoalEvent) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const updatedEvents = (goal.events || []).map(e => e.id === event.id ? event : e);
        return { ...goal, events: updatedEvents };
      }
      return goal;
    }));
  };

  const deleteEventFromGoal = (goalId: string, eventId: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const updatedEvents = (goal.events || []).filter(e => e.id !== eventId);
        return { ...goal, events: updatedEvents };
      }
      return goal;
    }));
  };

  const updateGoalDeadline = (goalId: string, deadline: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        return { ...goal, deadline };
      }
      return goal;
    }));
  };

  const createStudyGroup = (goalId: string, title: string, desc: string) => {
    if (!user) return;
    const newGroup: StudyGroup = {
      id: Date.now().toString(),
      goalId,
      title,
      location: user.location,
      members: [user.name],
      maxMembers: 6,
      description: desc,
      createdAt: new Date().toISOString()
    };
    setStudyGroups([newGroup, ...studyGroups]);
  };

  const joinStudyGroup = (groupId: string) => {
    if (!user) return;
    setStudyGroups(prev => prev.map(group => {
      if (group.id === groupId && !group.members.includes(user.name) && group.members.length < group.maxMembers) {
        return { ...group, members: [...group.members, user.name] };
      }
      return group;
    }));
  };

  const addNewReview = (review: Omit<Review, 'id' | 'createdAt'>) => {
    const fullReview: Review = {
      ...review,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setReviews([fullReview, ...reviews]);
  };

  // Filtered Items
  const filteredExplore = exploreItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (entryPath === 'register') {
    return (
      <div className="min-h-screen bg-bento-bg flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-10 text-center shadow-2xl border-none">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-bento-primary/10 rounded-3xl flex items-center justify-center">
                <Target className="w-10 h-10 text-bento-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tighter mb-2 text-bento-text-main">CampusStep</h1>
            <p className="text-bento-text-sub mb-10 font-bold">당신만의 커리어 로드맵, 여기서 시작됩니다.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleRegister(
                formData.get('name') as string, 
                formData.get('school') as string,
                formData.get('grade') as string,
                formData.get('location') as string
              );
            }} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-black text-bento-text-sub uppercase tracking-widest ml-1">이름</label>
                <input 
                  name="name"
                  required
                  placeholder="예: 홍길동"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-bento-primary focus:bg-white outline-none transition-all font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-bento-text-sub uppercase tracking-widest ml-1">학교</label>
                  <input 
                    name="school"
                    required
                    placeholder="예: 한국대학교"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-bento-primary focus:bg-white outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-bento-text-sub uppercase tracking-widest ml-1">학년</label>
                  <select 
                    name="grade"
                    required
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-bento-primary focus:bg-white outline-none transition-all font-bold text-sm appearance-none"
                  >
                    <option value="1학년">1학년</option>
                    <option value="2학년">2학년</option>
                    <option value="3학년">3학년</option>
                    <option value="4학년">4학년</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-bento-text-sub uppercase tracking-widest ml-1">지역 (시/군/구)</label>
                <input 
                  name="location"
                  required
                  placeholder="예: 서울시 강남구"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-bento-primary focus:bg-white outline-none transition-all font-bold"
                />
              </div>
              <Button type="submit" className="w-full py-5 text-lg mt-6 bg-bento-primary text-white shadow-lg shadow-blue-200">
                시작하기
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (entryPath === 'motivation') {
    return (
      <div className="min-h-screen bg-bento-primary flex items-center justify-center p-6 text-white font-sans overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl text-center space-y-12"
        >
          <div className="space-y-4">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl font-black text-white/60 lowercase tracking-widest"
            >
              hello, {user?.name}
            </motion.p>
            <motion.h2 
              key={motivationQuote}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="text-4xl md:text-6xl font-black leading-tight tracking-tight px-4"
            >
              "{motivationQuote}"
            </motion.h2>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
          >
            <button 
              onClick={() => setEntryPath('app')}
              className="group flex flex-col items-center gap-4 mx-auto"
            >
              <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-bento-primary transition-all duration-500 animate-bounce">
                <ChevronRight className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity">Enter Workspace</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bento-bg font-sans text-bento-text-main flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-bento-card border-b border-bento-border py-3 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Target className="text-bento-primary w-6 h-6" />
          <h1 className="font-extrabold text-xl tracking-tighter">CampusStep</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-6 h-6 text-bento-text-sub" />
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={`fixed md:sticky top-0 left-0 bottom-0 z-50 w-64 bg-bento-card border-r border-bento-border flex flex-col transition-all h-screen ${isSidebarOpen ? 'block' : 'hidden md:flex'}`}
          >
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="text-bento-primary w-8 h-8" />
                <h1 className="font-extrabold text-2xl tracking-tighter">PathFinder</h1>
              </div>
              <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6 text-bento-text-sub" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2">
              <SidebarItem 
                active={activeTab === 'explore'} 
                icon={<Search className="w-5 h-5" />} 
                label="탐색하기" 
                onClick={() => { setActiveTab('explore'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                active={activeTab === 'goals'} 
                icon={<ClipboardList className="w-5 h-5" />} 
                label="목표 관리" 
                onClick={() => { setActiveTab('goals'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                active={activeTab === 'calendar'} 
                icon={<Calendar className="w-5 h-5" />} 
                label="달력 스케줄" 
                onClick={() => { setActiveTab('calendar'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                active={activeTab === 'reviews'} 
                icon={<MessageSquare className="w-5 h-5" />} 
                label="커뮤니티" 
                onClick={() => { setActiveTab('reviews'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                active={activeTab === 'profile'} 
                icon={<UserIcon className="w-5 h-5" />} 
                label="내 정보" 
                onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
              />
            </nav>

            <div className="p-6">
              <Button 
                className="w-full bg-bento-primary text-white" 
                onClick={() => setIsAddingGoal(true)}
              >
                <Plus className="w-5 h-5" />
                새 목표 추가
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          
          <header className="mb-10 px-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black">안녕하세요, {user?.name}님! 👋</h2>
              <p className="text-bento-text-sub mt-1 font-medium">{user?.school} {user?.grade}의 빛나는 커리어를 응원합니다.</p>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'explore' && (
              <motion.div 
                key="explore"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid grid-cols-12 gap-6"
              >
                {/* Main Search Bento Card */}
                <div className="col-span-12 md:col-span-8 grid grid-cols-1 gap-6">
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2 text-lg">🔍 커리어 탐색</h3>
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full overflow-hidden h-7">
                        <span className="text-[10px] font-black text-bento-primary">LIVE</span>
                        <AnimatePresence mode="wait">
                          <motion.span 
                            key={trendingIndex}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="text-[11px] font-bold text-bento-text-main"
                          >
                            {trendingKeywords[trendingIndex].rank}. {trendingKeywords[trendingIndex].keyword}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="relative mb-6">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-bento-text-sub w-5 h-5" />
                      <input 
                        type="text" 
                        placeholder="관심 있는 자격증이나 대외활동을 검색해보세요"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-bento-primary focus:bg-white outline-none transition-all text-sm font-semibold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-bento-text-sub uppercase tracking-widest mb-3">추천 키워드</h4>
                      <div className="flex flex-wrap gap-2">
                        {['#정보처리기사', '#삼성 드림클래스', '#구글 인턴십', '#데이터분석', '#토익900'].map(tag => (
                          <button 
                            key={tag} 
                            onClick={() => setSearchQuery(tag.replace('#', ''))}
                            className="text-[12px] px-3 py-1 bg-white border border-bento-border rounded-lg text-bento-text-sub font-bold hover:border-bento-primary hover:text-bento-primary transition-colors active:scale-95"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Explore Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {filteredExplore.map(item => (
                      <div key={item.id} className="group">
                        <Card className="hover:border-bento-primary group-hover:shadow-md transition-all h-full flex flex-col">
                          <div className="flex items-center justify-between mb-3">
                             <CategoryIcon category={item.category} className="w-5 h-5 opacity-80" />
                             <Badge variant={item.category === 'certification' ? 'indigo' : item.category === 'activity' ? 'green' : 'amber'}>
                                {item.category === 'certification' ? '자격증' : item.category === 'activity' ? '대외활동' : '공모전'}
                              </Badge>
                          </div>
                          <h4 className="font-bold text-lg mb-2 group-hover:text-bento-primary transition-colors leading-tight">{item.title}</h4>
                          <p className="text-bento-text-sub text-xs leading-relaxed flex-1">{item.description}</p>
                          <Button 
                            variant="secondary" 
                            className="w-full text-xs mt-4 py-2"
                            onClick={() => handleAddGoal(item.title, item.category, item.description)}
                            loading={isGenerating && newGoalTitle === item.title}
                          >
                            목표 정보 확인하기
                          </Button>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real-time Trending Bento Card */}
                <div className="col-span-12 md:col-span-4 space-y-6">
                  <Card className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold flex items-center gap-2">🔥 실시간 인기 목표</h3>
                      <span className="text-[10px] font-bold text-slate-400">10분 전 갱신</span>
                    </div>
                    <div className="space-y-4 flex-1">
                      {trendingKeywords.map((item) => (
                        <div key={item.rank} className="flex items-center justify-between group cursor-pointer" onClick={() => setSearchQuery(item.keyword)}>
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-black w-4 ${item.rank <= 3 ? 'text-bento-primary' : 'text-slate-300'}`}>{item.rank}</span>
                            <span className="text-sm font-bold group-hover:text-bento-primary transition-colors">{item.keyword}</span>
                          </div>
                          <div className="flex items-center">
                            {item.status === 'up' && <ArrowUp className="w-3 h-3 text-red-500" />}
                            {item.status === 'down' && <ArrowDown className="w-3 h-3 text-blue-500" />}
                            {item.status === 'same' && <Minus className="w-3 h-3 text-slate-300" />}
                            {item.status === 'new' && <span className="text-[10px] font-black text-bento-accent">NEW</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Stat Card */}
                  <Card className="bg-slate-50 border-none">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <span className="block text-2xl font-black text-bento-primary">{goals.length}</span>
                          <span className="text-[10px] font-bold text-bento-text-sub uppercase">My Goals</span>
                        </div>
                        <div className="text-center border-l border-slate-200">
                          <span className="block text-2xl font-black text-bento-primary">{reviews.length}</span>
                          <span className="text-[10px] font-bold text-bento-text-sub uppercase">My Reviews</span>
                        </div>
                     </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div 
                key="goals"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {goals.length === 0 ? (
                  <Card className="col-span-12 flex flex-col items-center justify-center py-20 bg-white/50 border-dashed border-2">
                    <ClipboardList className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">설정된 목표가 없습니다</h3>
                    <p className="text-slate-400 text-sm mt-1 mb-6">탐색 탭에서 도전할 항목을 찾아보세요!</p>
                    <Button onClick={() => setActiveTab('explore')}>정보 탐색하기</Button>
                  </Card>
                ) : (
                  <>
                    {/* Active Goal Summary (Bento Card Blue) */}
                    <Card className="col-span-12 md:col-span-4 bg-bento-primary text-white border-none min-h-[200px] flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold">📊 현재 목표 달성률</h3>
                          <span className="text-xl font-black">{goals[0]?.progress || 0}%</span>
                        </div>
                        <p className="text-sm opacity-90 leading-tight">
                          {goals[0]?.title} 달성까지<br/>앞으로 {goals[0]?.tasks.filter(t => !t.completed).length}개의 할 일이 남았습니다.
                        </p>
                      </div>
                      <div className="h-2 w-full bg-white/20 rounded-full mt-4 overflow-hidden">
                        <motion.div 
                          className="h-full bg-white" 
                          initial={{ width: 0 }}
                          animate={{ width: `${goals[0]?.progress || 0}%` }}
                        />
                      </div>
                    </Card>

                    {/* All Goals List */}
                    <div className="col-span-12 md:col-span-8 grid grid-cols-1 gap-8">
                       {goals.map(goal => (
                         <div key={goal.id} className="space-y-4">
                            {/* Goal Header Card */}
                            <Card className="!p-4 border-b-4 border-b-bento-primary">
                               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                        <CategoryIcon category={goal.category} className="w-5 h-5" />
                                     </div>
                                     <div>
                                        <h4 className="font-bold text-lg leading-tight">{goal.title}</h4>
                                        <p className="text-[10px] font-black text-bento-primary uppercase tracking-widest">{goal.category}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="flex flex-col items-end">
                                        <span className="text-sm font-black text-bento-primary">{goal.progress}%</span>
                                        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                           <div className="h-full bg-bento-primary transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                                        </div>
                                     </div>
                                     <button 
                                        onClick={() => deleteGoal(goal.id)} 
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </button>
                                  </div>
                               </div>
                            </Card>

                            {/* Goal Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {/* Info Column */}
                               <Card className="flex flex-col h-full bg-white/60">
                                  <h5 className="text-[11px] font-black text-bento-text-sub uppercase tracking-widest mb-4 flex items-center gap-2">
                                     <Info className="w-3.5 h-3.5 text-bento-primary" /> 목표 상세 정보
                                  </h5>
                                  <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                     {goal.info ? (
                                        <div className="prose prose-sm max-w-none text-bento-text-main prose-headings:font-bold prose-headings:text-bento-text-main prose-headings:mt-4 prose-headings:mb-2 prose-p:text-[13px] prose-p:leading-relaxed prose-li:text-[13px]">
                                           <ReactMarkdown>{goal.info}</ReactMarkdown>
                                        </div>
                                     ) : (
                                        <p className="text-xs text-slate-400 italic py-10 text-center">정보를 불러오는 중입니다...</p>
                                     )}
                                  </div>
                               </Card>

                               {/* Tasks Column */}
                               <Card className="flex flex-col h-full">
                                  <div className="flex items-center justify-between mb-4">
                                     <h5 className="text-[11px] font-black text-bento-text-sub uppercase tracking-widest flex items-center gap-2">
                                        <ClipboardList className="w-3.5 h-3.5 text-bento-primary" /> 내 To-do 리스트
                                     </h5>
                                     <span className="text-[10px] font-bold text-bento-primary px-2 py-0.5 bg-blue-50 rounded-lg">
                                        {goal.tasks.filter(t => t.completed).length}/{goal.tasks.length} 완료
                                     </span>
                                  </div>

                                  <div className="flex-1 space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                     {goal.tasks.length === 0 ? (
                                        <div className="py-10 text-center space-y-2">
                                           <Circle className="w-8 h-8 text-slate-100 mx-auto" strokeWidth={1} />
                                           <p className="text-[11px] text-slate-400 italic">아직 할 일이 없습니다.<br/>직접 계획을 추가해보세요!</p>
                                        </div>
                                     ) : (
                                        goal.tasks.map(task => (
                                           <div 
                                              key={task.id} 
                                              className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all border border-transparent ${task.completed ? 'bg-slate-50/50' : 'bg-white hover:border-slate-100 hover:shadow-sm'}`}
                                           >
                                              <button 
                                                 onClick={() => toggleTask(goal.id, task.id)}
                                                 className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                    task.completed 
                                                       ? 'bg-bento-primary border-bento-primary shadow-sm shadow-blue-200' 
                                                       : 'border-slate-200 hover:border-bento-primary bg-white'
                                                 }`}
                                              >
                                                 {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                                              </button>
                                              <span className={`text-[13px] flex-1 ${task.completed ? 'line-through text-slate-400' : 'font-semibold text-bento-text-main'}`}>
                                                 {task.title}
                                              </span>
                                           </div>
                                        ))
                                     )}
                                  </div>

                                  {/* Add Task Input Area */}
                                  <div className="pt-4 border-t border-slate-50">
                                     <div className="flex gap-2">
                                        <input 
                                           type="text" 
                                           placeholder="새로운 할 일 추가..."
                                           className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-bento-primary/20 focus:bg-white transition-all font-semibold"
                                           onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                 const target = e.target as HTMLInputElement;
                                                 if (target.value.trim()) {
                                                    addTask(goal.id, target.value);
                                                    target.value = '';
                                                 }
                                              }
                                           }}
                                        />
                                        <button 
                                           className="bg-bento-primary text-white p-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                           onClick={(e) => {
                                              const input = e.currentTarget.previousSibling as HTMLInputElement;
                                              if (input.value.trim()) {
                                                 addTask(goal.id, input.value);
                                                 input.value = '';
                                              }
                                           }}
                                        >
                                           <Plus className="w-4 h-4" />
                                        </button>
                                     </div>
                                  </div>
                               </Card>
                            </div>

                            {/* Study Groups Section */}
                            <Card className="!bg-slate-50/50">
                               <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-3">
                                     <div className="p-2 bg-bento-primary/10 rounded-lg">
                                        <Users className="w-4 h-4 text-bento-primary" />
                                     </div>
                                     <div>
                                        <h5 className="font-bold text-sm">내 주변 스터디 그룹 ({user?.location})</h5>
                                        <p className="text-[10px] text-bento-text-sub">이 목표를 함께 달성할 주변 동료를 찾아보세요.</p>
                                     </div>
                                  </div>
                                  <div className="flex gap-2">
                                     <Button 
                                       className="py-1.5 px-4 text-[11px]" 
                                       variant="secondary"
                                       onClick={() => {
                                         const title = prompt('일정 이름을 입력하세요 (예: 1차 시험일, 서류 마감일):');
                                         const dateStr = prompt('날짜를 입력하세요 (YYYY-MM-DD):');
                                         const type = prompt('일정 종류 (exam: 시험, schedule: 스케줄, deadline: 마감):');
                                         if (title && dateStr) {
                                           addEventToGoal(goal.id, {
                                             title,
                                             date: dateStr,
                                             type: (type as any) || 'schedule'
                                           });
                                         }
                                       }}
                                     >
                                       <Calendar className="w-3 h-3" /> 일정 추가
                                     </Button>
                                     <Button 
                                       className="py-1.5 px-4 text-[11px]" 
                                       variant="secondary"
                                       onClick={() => {
                                         const title = prompt('스터디 모임 이름을 입력하세요:');
                                         const desc = prompt('상세 내용을 입력하세요:');
                                         if (title && desc) createStudyGroup(goal.id, title, desc);
                                       }}
                                     >
                                       <Plus className="w-3 h-3" /> 모임 만들기
                                     </Button>
                                  </div>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {studyGroups.filter(sg => sg.goalId === goal.id && sg.location === user?.location).length === 0 ? (
                                     <div className="col-span-full py-6 text-center">
                                        <p className="text-xs text-slate-400">학습 지역 내에 등록된 스터디 모임이 없습니다.</p>
                                     </div>
                                  ) : (
                                     studyGroups
                                       .filter(sg => sg.goalId === goal.id && sg.location === user?.location)
                                       .map(group => (
                                          <div key={group.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                             <div>
                                                <div className="flex justify-between items-start mb-2">
                                                   <h6 className="font-bold text-sm">{group.title}</h6>
                                                   <span className="text-[10px] font-bold text-bento-primary bg-blue-50 px-2 py-0.5 rounded-full">
                                                      {group.members.length}/{group.maxMembers}
                                                   </span>
                                                </div>
                                                <p className="text-[11px] text-bento-text-sub line-clamp-2 mb-3">{group.description}</p>
                                             </div>
                                             <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50">
                                                <div className="flex -space-x-2">
                                                   {group.members.slice(0, 3).map((m, i) => (
                                                      <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">
                                                         {m[0]}
                                                      </div>
                                                   ))}
                                                   {group.members.length > 3 && (
                                                      <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-400">
                                                         +{group.members.length - 3}
                                                      </div>
                                                   )}
                                                </div>
                                                <button 
                                                   onClick={() => joinStudyGroup(group.id)}
                                                   disabled={group.members.includes(user?.name || '') || group.members.length >= group.maxMembers}
                                                   className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                                                      group.members.includes(user?.name || '') 
                                                         ? 'bg-slate-100 text-slate-400 cursor-default' 
                                                         : 'bg-bento-primary text-white hover:bg-blue-600'
                                                   }`}
                                                >
                                                   {group.members.includes(user?.name || '') ? '참여 중' : '참여하기'}
                                                </button>
                                             </div>
                                          </div>
                                       ))
                                  )}
                               </div>
                            </Card>
                         </div>
                       ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <CalendarView 
                  goals={goals} 
                  onAddEvent={addEventToGoal} 
                  onUpdateEvent={updateEventInGoal}
                  onDeleteEvent={deleteEventFromGoal}
                />
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div 
                key="reviews"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* Form Bento Item */}
                <div className="col-span-12 md:col-span-4">
                  <ReviewForm onAddReview={addNewReview} />
                </div>

                {/* Reviews List */}
                <div className="col-span-12 md:col-span-8 space-y-4">
                  <header className="mb-2 px-2">
                    <h3 className="font-bold flex items-center gap-2">⭐ 선배들의 후기</h3>
                  </header>
                  {reviews.length === 0 ? (
                    <Card className="flex items-center justify-center py-20 text-slate-400 text-sm">등록된 후기가 없습니다.</Card>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id}>
                        <Card className="bg-white hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                               <h5 className="font-bold text-bento-primary text-sm tracking-tight">{review.goalTitle}</h5>
                               <div className="flex gap-1 mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                  ))}
                               </div>
                            </div>
                            <span className="text-[10px] text-bento-text-sub font-bold px-2 py-1 bg-slate-100 rounded-md uppercase">{review.difficulty}</span>
                          </div>
                          <p className="text-sm leading-relaxed mb-4 italic">"{review.content}"</p>
                          <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                             <div className="flex gap-4">
                               <div className="text-[11px]">
                                  <span className="text-bento-text-sub block">작성자</span>
                                  <span className="font-bold">{review.author}</span>
                               </div>
                               <div className="text-[11px]">
                                  <span className="text-bento-text-sub block">준비기간</span>
                                  <span className="font-bold">{review.prepPeriod}</span>
                               </div>
                             </div>
                             <time className="text-[10px] text-slate-300 font-medium">{new Date(review.createdAt).toLocaleDateString()}</time>
                          </div>
                        </Card>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-2xl mx-auto py-10 px-4"
              >
                <motion.div
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.1 }}
                >
                  <Card className="p-0 shadow-2xl overflow-hidden relative border-none bg-white">
                     {/* Header Background */}
                     <div className="h-32 bg-gradient-to-r from-bento-primary to-blue-400 relative">
                        <div className="absolute -bottom-12 left-10">
                           <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-lg">
                              <div className="w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center text-bento-primary">
                                 <UserIcon size={40} strokeWidth={1.5} />
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="pt-16 pb-10 px-10">
                        <div className="flex justify-between items-start mb-10">
                           <div>
                              <h3 className="text-3xl font-black tracking-tight">{user?.name}</h3>
                              <p className="text-bento-text-sub font-bold flex items-center gap-2 mt-1">
                                 <Award className="w-4 h-4 text-bento-primary" /> {user?.school} • {user?.grade}
                              </p>
                           </div>
                           {!isEditingProfile && (
                              <Button variant="secondary" onClick={() => setIsEditingProfile(true)} className="rounded-2xl px-6 py-2.5">
                                 정보 수정
                              </Button>
                           )}
                        </div>

                        {!isEditingProfile ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="!p-6 bg-slate-50 border-none rounded-3xl group hover:bg-slate-100 transition-colors">
                                 <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <MapPin className="w-5 h-5 text-bento-primary" />
                                 </div>
                                 <p className="text-[10px] font-black text-bento-text-sub uppercase tracking-widest mb-1">활동 지역</p>
                                 <p className="text-lg font-bold">{user?.location}</p>
                              </Card>
                              <Card className="!p-6 bg-slate-50 border-none rounded-3xl group hover:bg-slate-100 transition-colors">
                                 <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <Clock className="w-5 h-5 text-bento-primary" />
                                 </div>
                                 <p className="text-[10px] font-black text-bento-text-sub uppercase tracking-widest mb-1">참여 중인 목표</p>
                                 <p className="text-lg font-bold">{goals.length}개</p>
                              </Card>
                           </div>
                        ) : (
                           <form onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              updateProfile({
                                 name: formData.get('name') as string,
                                 school: formData.get('school') as string,
                                 grade: formData.get('grade') as string,
                                 location: formData.get('location') as string
                              });
                           }} className="space-y-6 bg-slate-50 p-8 rounded-[32px]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="space-y-1">
                                    <label className="text-[11px] font-black text-bento-text-sub uppercase tracking-widest ml-1">이름</label>
                                    <input name="name" defaultValue={user?.name} required className="w-full px-5 py-4 bg-white rounded-2xl outline-none focus:ring-4 focus:ring-bento-primary/10 transition-all font-bold border border-transparent focus:border-bento-primary/20" />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[11px] font-black text-bento-text-sub uppercase tracking-widest ml-1">지역</label>
                                    <input name="location" defaultValue={user?.location} required className="w-full px-5 py-4 bg-white rounded-2xl outline-none focus:ring-4 focus:ring-bento-primary/10 transition-all font-bold border border-transparent focus:border-bento-primary/20" />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[11px] font-black text-bento-text-sub uppercase tracking-widest ml-1">학교</label>
                                    <input name="school" defaultValue={user?.school} required className="w-full px-5 py-4 bg-white rounded-2xl outline-none focus:ring-4 focus:ring-bento-primary/10 transition-all font-bold border border-transparent focus:border-bento-primary/20" />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[11px] font-black text-bento-text-sub uppercase tracking-widest ml-1">학년</label>
                                    <select name="grade" defaultValue={user?.grade} className="w-full px-5 py-4 bg-white rounded-2xl outline-none focus:ring-4 focus:ring-bento-primary/10 transition-all font-bold border border-transparent focus:border-bento-primary/20 appearance-none">
                                       <option value="1학년">1학년</option>
                                       <option value="2학년">2학년</option>
                                       <option value="3학년">3학년</option>
                                       <option value="4학년">4학년</option>
                                       <option value="기타">기타</option>
                                    </select>
                                 </div>
                              </div>
                              <div className="flex gap-4 pt-4">
                                 <Button variant="secondary" className="flex-1 py-4 font-bold" onClick={() => setIsEditingProfile(false)}>취소</Button>
                                 <Button type="submit" className="flex-[2] py-4 bg-bento-primary text-white font-bold shadow-lg shadow-blue-200">저장 및 업데이트</Button>
                              </div>
                           </form>
                        )}
                     </div>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Goal Modal */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsAddingGoal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] w-full max-w-lg p-8 relative shadow-2xl"
            >
              <button 
                onClick={() => setIsAddingGoal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-bento-text-sub" />
              </button>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold">🎯 새로운 도구 설정</h3>
                  <p className="text-bento-text-sub text-sm mt-1">나만의 커리어 목표를 적고 로드맵을 만드세요.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bento-text-sub uppercase tracking-widest pl-1">목표 이름</label>
                    <input 
                      type="text" 
                      placeholder="예: 실무 SQL 자격증 취득"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-bento-primary outline-none transition-all font-semibold"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-bento-text-sub uppercase tracking-widest pl-1">상세 내용</label>
                    <textarea 
                      placeholder="구체적인 목표와 동기를 작성해주세요."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-bento-primary transition-all min-h-[100px] text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsAddingGoal(false)}>취소</Button>
                  <Button 
                    className="flex-[2] bg-bento-primary text-white" 
                    onClick={() => handleAddGoal(newGoalTitle, 'custom', '사용자 정의 목표')}
                    disabled={!newGoalTitle}
                    loading={isGenerating}
                  >
                    AI 로드맵 생성
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper UI Components ---

const SidebarItem = ({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
      active 
        ? 'bg-bento-active-bg text-bento-primary shadow-sm' 
        : 'text-bento-text-sub hover:bg-bento-bg hover:text-bento-text-main'
    }`}
  >
    <span className={`${active ? 'text-bento-primary' : 'text-bento-text-sub'}`}>
      {icon}
    </span>
    {label}
  </button>
);

const CategoryIcon = ({ category, className = '' }: { category: Category; className?: string }) => {
  switch (category) {
    case 'certification': return <Award className={`text-bento-primary ${className}`} />;
    case 'activity': return <TrendingUp className={`text-bento-accent ${className}`} />;
    case 'competition': return <Star className={`text-amber-500 ${className}`} />;
    default: return <Target className={`text-blue-500 ${className}`} />;
  }
};

const ReviewForm = ({ onAddReview }: { onAddReview: (r: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    author: '',
    goalTitle: '',
    difficulty: 'medium' as const,
    prepPeriod: '',
    studyMethod: '',
    content: '',
    rating: 5
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAddReview(formData);
    setIsOpen(false);
    setFormData({
      author: '',
      goalTitle: '',
      difficulty: 'medium',
      prepPeriod: '',
      studyMethod: '',
      content: '',
      rating: 5
    });
  };

  return (
    <Card className="bg-slate-50 border-dashed border-2 border-bento-border shadow-none">
      {!isOpen ? (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-bento-primary">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold">당신의 경험을 나누세요</h4>
            <p className="text-xs text-bento-text-sub">다른 사용자들에게 큰 도움이 됩니다.</p>
          </div>
          <Button variant="secondary" className="px-6" onClick={() => setIsOpen(true)}>후기 쓰기</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input 
              required
              placeholder="닉네임" 
              className="w-full px-4 py-2 rounded-lg bg-white border border-bento-border text-sm font-semibold outline-none focus:border-bento-primary transition-colors"
              value={formData.author}
              onChange={e => setFormData({...formData, author: e.target.value})}
            />
            <input 
              required
              placeholder="대사 목표 (예: 토익)" 
              className="w-full px-4 py-2 rounded-lg bg-white border border-bento-border text-sm font-semibold outline-none focus:border-bento-primary transition-colors"
              value={formData.goalTitle}
              onChange={e => setFormData({...formData, goalTitle: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-2">
               <select 
                className="px-4 py-2 rounded-lg bg-white border border-bento-border text-sm font-semibold outline-none"
                value={formData.difficulty}
                onChange={e => setFormData({...formData, difficulty: e.target.value as any})}
              >
                <option value="easy">쉬움</option>
                <option value="medium">보통</option>
                <option value="hard">어려움</option>
              </select>
              <input 
                required
                placeholder="준비 기간" 
                className="px-4 py-2 rounded-lg bg-white border border-bento-border text-sm font-semibold outline-none"
                value={formData.prepPeriod}
                onChange={e => setFormData({...formData, prepPeriod: e.target.value})}
              />
            </div>
          </div>
          <textarea 
            required
            placeholder="실제 합격 노하우나 조언" 
            className="w-full px-4 py-2 rounded-lg bg-white border border-bento-border text-sm min-h-[100px] outline-none"
            value={formData.content}
            onChange={e => setFormData({...formData, content: e.target.value})}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(v => (
                <button key={v} type="button" onClick={() => setFormData({...formData, rating: v})}>
                  <Star className={`w-4 h-4 ${v <= formData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-xs" type="button" onClick={() => setIsOpen(false)}>취소</Button>
              <Button type="submit" className="text-xs">등록</Button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
};
