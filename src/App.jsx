import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, CheckCircle, Plus, Trophy, Target, Zap, Trash2, Maximize2, Minimize2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Activity, X, TrendingUp, Clock, BarChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import confetti from 'canvas-confetti';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, parseISO, subDays, subYears, eachMonthOfInterval, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Helper para Capitalizar ---
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Componente do Eixo X Customizado (Pequeno) ---
const CustomXAxisTick = ({ x, y, payload }) => {
  const isTodayTick = isSameDay(new Date(), new Date(payload.value));
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={16} 
        textAnchor="middle" 
        fill={isTodayTick ? '#8b5cf6' : '#64748b'}
        fontWeight={isTodayTick ? 'bold' : '500'}
        fontSize={11}
        fontFamily="sans-serif"
      >
        {/* Mostra apenas 3 letras do dia para economizar espaço */}
        {capitalize(format(new Date(payload.value), 'EEE', { locale: ptBR }).substring(0, 3))}
      </text>
    </g>
  );
};

// --- UI Components ---
const Card = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-slate-800/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl transition-all duration-300 hover:border-primary/30 hover:shadow-primary/10 relative overflow-hidden ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''} ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-slate-800/60 transition-all group">
    <div className={`p-3 rounded-xl ${color} bg-opacity-20 text-white shadow-inner group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
    </div>
  </div>
);

const Button = ({ onClick, variant = "primary", children, className = "" }) => {
  const base = "px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-95 transform tracking-wide";
  const styles = variant === "primary" 
    ? "bg-gradient-to-r from-primary to-violet-600 hover:shadow-primary/50 hover:brightness-110 text-white shadow-primary/20" 
    : "bg-slate-700/50 hover:bg-slate-600 text-slate-200 border border-white/10 hover:border-white/20";
  return <button onClick={onClick} className={`${base} ${styles} ${className}`}>{children}</button>;
};

// --- Range Selector Button ---
const RangeButton = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      active 
      ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105' 
      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
    }`}
  >
    {label}
  </button>
);

// --- Modal Component ---
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div className="bg-[#0f172a] w-full max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 p-6 relative custom-scrollbar">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default function App() {
  // --- Estados ---
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tasks')) || [];
      return saved.map(t => ({ ...t, date: t.date || new Date().toISOString() }));
    } catch (e) { return []; }
  });

  const [newTask, setNewTask] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  
  // Estado do Range do Gráfico (7d, 14d, 30d, 1y, 5y, all)
  const [chartRange, setChartRange] = useState('7d');

  const [seconds, setSeconds] = useState(0);
  const [studySessions, setStudySessions] = useState(() => JSON.parse(localStorage.getItem('sessions')) || []);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => { localStorage.setItem('tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('sessions', JSON.stringify(studySessions)); }, [studySessions]);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // --- Lógica de Datas ---
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  // --- DADOS PARA O GRÁFICO PEQUENO (Sempre 7 dias) ---
  const smallChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return {
        rawDate: d.toISOString(),
        minutes: 0
      };
    });

    return last7Days.map(dayBase => {
      const session = studySessions.find(s => isSameDay(new Date(s.timestamp), parseISO(dayBase.rawDate)));
      return { ...dayBase, minutes: session ? session.minutes : 0 };
    });
  }, [studySessions]);

  // --- DADOS PARA O GRÁFICO GRANDE (Analytics Pro) ---
  const bigChartData = useMemo(() => {
    const now = new Date();
    let dataPoints = [];
    let isMonthly = false;

    // 1. Definir Intervalo
    if (chartRange === '7d') dataPoints = eachDayOfInterval({ start: subDays(now, 6), end: now });
    else if (chartRange === '14d') dataPoints = eachDayOfInterval({ start: subDays(now, 13), end: now });
    else if (chartRange === '30d') dataPoints = eachDayOfInterval({ start: subDays(now, 29), end: now });
    else if (chartRange === '1y') {
      dataPoints = eachMonthOfInterval({ start: subYears(now, 1), end: now });
      isMonthly = true;
    }
    else if (chartRange === '5y') {
      dataPoints = eachMonthOfInterval({ start: subYears(now, 5), end: now });
      isMonthly = true;
    }
    else if (chartRange === 'all') {
      // Pega a primeira sessão ou 1 ano atrás se vazio
      const firstSession = studySessions.length > 0 ? new Date(studySessions[0].timestamp) : subYears(now, 1);
      // Se tiver mais de 3 meses de dados, agrupa por mês, senão por dia
      const diffTime = Math.abs(now - firstSession);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 90) {
        dataPoints = eachMonthOfInterval({ start: firstSession, end: now });
        isMonthly = true;
      } else {
        dataPoints = eachDayOfInterval({ start: firstSession, end: now });
      }
    }

    // 2. Mapear e Agregar Dados
    return dataPoints.map(date => {
      let totalMin = 0;

      if (isMonthly) {
        // Soma todas as sessões daquele MÊS
        const sessionsInMonth = studySessions.filter(s => isSameMonth(new Date(s.timestamp), date));
        totalMin = sessionsInMonth.reduce((acc, s) => acc + s.minutes, 0);
      } else {
        // Soma sessões do DIA (caso haja múltiplas no mesmo dia)
        const sessionsInDay = studySessions.filter(s => isSameDay(new Date(s.timestamp), date));
        totalMin = sessionsInDay.reduce((acc, s) => acc + s.minutes, 0);
      }

      return {
        rawDate: date.toISOString(),
        label: isMonthly ? capitalize(format(date, 'MMM/yy', { locale: ptBR })) : capitalize(format(date, 'dd/MM', { locale: ptBR })),
        minutes: totalMin,
        fullLabel: isMonthly ? capitalize(format(date, 'MMMM yyyy', { locale: ptBR })) : capitalize(format(date, "dd 'de' MMMM", { locale: ptBR }))
      };
    });
  }, [studySessions, chartRange]);


  // Actions
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const onDateClick = (day) => setSelectedDate(day);

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, gravity: 0.8, colors: ['#8b5cf6', '#10b981', '#f43f5e'] });
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const taskDate = selectedDate.toISOString(); 
    setTasks([...tasks, { id: Date.now(), text: newTask, completed: false, date: taskDate }]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        if (!t.completed) triggerConfetti();
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (seconds > 60) {
      const minutes = Math.floor(seconds / 60);
      setStudySessions(prev => [...prev, { minutes: minutes, timestamp: Date.now() }]);
    }
    setSeconds(0);
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const tasksForSelectedDate = tasks.filter(t => t.date && isSameDay(parseISO(t.date), selectedDate));
  const totalXP = studySessions.reduce((acc, curr) => acc + (curr.minutes * 10), 0) + (tasks.filter(t => t.completed).length * 50);
  const level = Math.floor(totalXP / 1000) + 1;
  const progressToNextLevel = (totalXP % 1000) / 10;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalMinutes = studySessions.reduce((acc, curr) => acc + curr.minutes, 0);
  const averageMinutes = studySessions.length > 0 ? Math.round(totalMinutes / studySessions.length) : 0;

  return (
    <div className={`min-h-screen bg-[#0f172a] text-slate-100 font-sans transition-all duration-700 overflow-x-hidden ${zenMode ? 'bg-black' : ''}`}>
      
      {/* --- MODAL DE ANALYTICS AVANÇADO --- */}
      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)}>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Activity className="text-primary" size={32}/> Relatório de Evolução
              </h2>
              <p className="text-slate-400 mt-1">Analise seu progresso através do tempo.</p>
            </div>
            
            {/* Range Selectors */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 gap-1">
              <RangeButton label="7D" active={chartRange === '7d'} onClick={() => setChartRange('7d')} />
              <RangeButton label="14D" active={chartRange === '14d'} onClick={() => setChartRange('14d')} />
              <RangeButton label="30D" active={chartRange === '30d'} onClick={() => setChartRange('30d')} />
              <div className="w-px bg-white/10 mx-1 h-6 self-center"></div>
              <RangeButton label="1 Ano" active={chartRange === '1y'} onClick={() => setChartRange('1y')} />
              <RangeButton label="5 Anos" active={chartRange === '5y'} onClick={() => setChartRange('5y')} />
              <RangeButton label="Tudo" active={chartRange === 'all'} onClick={() => setChartRange('all')} />
            </div>
          </div>

          {/* Gráfico Grande Modal */}
          <div className="bg-slate-800/30 p-6 rounded-3xl border border-white/5 h-[400px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bigChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis 
                  dataKey="label" 
                  stroke="#94a3b8" 
                  tick={{fontSize: 12}} 
                  dy={10} 
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} 
                  cursor={{ stroke: '#8b5cf6' }}
                  labelFormatter={(value, payload) => {
                    if (payload && payload.length > 0) {
                      return payload[0].payload.fullLabel;
                    }
                    return value;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="#8b5cf6" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorMinModal)" 
                  activeDot={{ r: 8, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <Clock size={20} /> Tempo Total (Período)
              </div>
              <div className="text-3xl font-bold text-white">
                {(bigChartData.reduce((acc, curr) => acc + curr.minutes, 0) / 60).toFixed(1)} <span className="text-sm font-normal text-slate-500">horas</span>
              </div>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <TrendingUp size={20} /> Melhor Registro
              </div>
              <div className="text-3xl font-bold text-emerald-400 capitalize">
                {bigChartData.length > 0 && bigChartData.reduce((max, curr) => curr.minutes > max.minutes ? curr : max, bigChartData[0]).minutes} <span className="text-sm font-normal text-slate-500">min</span>
              </div>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <Zap size={20} /> Frequência
              </div>
              <div className="text-3xl font-bold text-yellow-400">
                {bigChartData.filter(d => d.minutes > 0).length} <span className="text-sm font-normal text-slate-500">dias ativos</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[130px] transition-all duration-1000 ${isTimerRunning ? 'scale-125 opacity-60' : 'opacity-30'}`} />
        {!zenMode && <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />}
      </div>

      <div className={`max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-500 ${zenMode ? 'max-w-3xl py-20' : ''}`}>
        
        {/* Header */}
        <header className="flex items-center justify-between gap-6">
          {!zenMode && (
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
                Dev<span className="text-primary">Focus</span>
              </h1>
              <p className="text-slate-400 mt-1 md:mt-2 text-sm md:text-base font-medium">Planeje. Execute. Evolua.</p>
            </div>
          )}
          
          <div className="flex items-center gap-4 ml-auto">
             <button 
              onClick={() => setZenMode(!zenMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all border ${
                zenMode ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-800/40 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800 hover:border-white/20'
              }`}
            >
              {zenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              <span className="hidden md:inline">{zenMode ? 'Sair do Foco' : 'Modo Zen'}</span>
            </button>

            {!zenMode && (
              <div className="hidden md:flex bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 items-center gap-4 shadow-lg">
                <Trophy className="text-yellow-400 drop-shadow-lg" size={20} />
                <div>
                  <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">Nível {level}</div>
                  <div className="w-24 h-1.5 bg-slate-700/50 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full" style={{ width: `${progressToNextLevel}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Stats Row */}
        {!zenMode && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Zap} label="Foco Hoje" value={`${totalMinutes}m`} color="bg-yellow-500" />
            <StatCard icon={CheckCircle} label="Feitas" value={completedTasks} color="bg-emerald-500" />
            <StatCard icon={Target} label="Pendentes" value={tasks.length - completedTasks} color="bg-blue-500" />
            <StatCard icon={CalendarIcon} label="Do Dia" value={tasksForSelectedDate.length} color="bg-purple-500" />
          </div>
        )}

        <div className={`grid gap-6 md:gap-8 ${zenMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          
          {/* ESQUERDA: Timer e Gráfico */}
          <div className={`space-y-6 ${zenMode ? 'lg:col-span-1' : 'lg:col-span-4'}`}>
            
            {/* Timer */}
            <Card className={`relative overflow-hidden flex flex-col items-center justify-center py-12 text-center border-2 transition-all duration-500 ${isTimerRunning ? 'border-primary/50 shadow-[0_0_50px_rgba(139,92,246,0.3)] bg-slate-800/60' : 'border-white/5 bg-slate-800/40'}`}>
              <div className="relative mb-8 group">
                <div className={`absolute inset-0 bg-primary/20 rounded-full blur-3xl transition-opacity duration-700 ${isTimerRunning ? 'opacity-100' : 'opacity-0'}`} />
                {isTimerRunning && (
                  <div className="absolute inset-0 rounded-full border border-primary/30 animate-[ping_3s_linear_infinite]" />
                )}
                <div className={`w-60 h-60 rounded-full border-8 flex items-center justify-center relative z-10 transition-all duration-500 backdrop-blur-sm ${isTimerRunning ? 'border-primary bg-black/30' : 'border-slate-700 bg-black/20 group-hover:border-slate-600'}`}>
                   <span className={`text-5xl font-mono font-bold tracking-tighter transition-colors duration-300 ${isTimerRunning ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'text-slate-200'}`}>
                     {formatTime(seconds)}
                   </span>
                </div>
              </div>
              <div className="w-full px-8 z-10">
                {!isTimerRunning ? (
                  <Button onClick={() => setIsTimerRunning(true)} className="w-full py-4 text-lg shadow-xl shadow-primary/10">
                    <Play size={22} fill="currentColor" /> INICIAR FOCO
                  </Button>
                ) : (
                  <Button onClick={stopTimer} variant="secondary" className="w-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border-red-500/20">
                    <Pause size={22} fill="currentColor" /> PAUSAR
                  </Button>
                )}
              </div>
            </Card>

            {/* GRÁFICO INTERATIVO (BOTÃO) */}
            {!zenMode && (
              <Card 
                onClick={() => setIsStatsOpen(true)} 
                className="p-5 flex flex-col relative group cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
                
                <div className="flex justify-between items-center mb-4 z-10">
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 tracking-wide group-hover:text-primary transition-colors">
                    <Activity size={16} className="text-primary"/> RITMO DE ESTUDO
                  </h3>
                  <Maximize2 size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="w-full h-[200px] min-h-[200px] pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    {/* CORREÇÃO DA MARGEM PARA NÃO CORTAR O LABEL */}
                    <AreaChart data={smallChartData} margin={{ top: 5, right: 15, left: 15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="rawDate" 
                        tick={<CustomXAxisTick />} 
                        axisLine={false} 
                        tickLine={false} 
                        interval={0} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="minutes" 
                        stroke="#8b5cf6" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorMin)"
                        dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#fff', stroke: '#8b5cf6' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute bottom-4 left-0 w-full text-center text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  Clique para ver detalhes
                </div>
              </Card>
            )}
          </div>

          {/* DIREITA: Calendário e Lista */}
          <div className={`space-y-6 ${zenMode ? 'hidden' : 'lg:col-span-8'}`}>
            
            {/* Calendário */}
            <Card className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white capitalize tracking-tight flex items-center gap-3">
                  <CalendarIcon className="text-primary" size={24} />
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl border border-white/5">
                  <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1 text-xs font-bold bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">Hoje</button>
                  <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20}/></button>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-4">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-slate-500 text-xs font-bold py-2 uppercase tracking-widest">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {generateCalendarDays().map((day, dayIdx) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const dayTasks = tasks.filter(t => t.date && isSameDay(parseISO(t.date), day));
                  const hasPending = dayTasks.some(t => !t.completed);
                  const hasCompleted = dayTasks.some(t => t.completed);

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => onDateClick(day)}
                      className={`
                        relative h-14 md:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border
                        ${!isCurrentMonth ? 'text-slate-700 border-transparent' : 'text-slate-300 border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-500'}
                        ${isSelected ? 'bg-primary/20 border-primary text-white ring-2 ring-primary/30 shadow-[0_0_20px_rgba(139,92,246,0.2)] scale-105 z-10' : ''}
                        ${isToday(day) && !isSelected ? 'bg-slate-800 text-white font-bold border-slate-600' : ''}
                      `}
                    >
                      <span className="text-sm md:text-base">{format(day, 'd')}</span>
                      
                      <div className="flex gap-1 mt-1.5 h-2">
                        {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]"></div>}
                        {hasCompleted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Lista de Tarefas */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-xl text-white flex items-center gap-3">
                    <Target className="text-emerald-400" size={24} /> 
                    Metas para {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1 pl-9">
                    {tasksForSelectedDate.length === 0 ? "Nenhuma meta agendada." : `${tasksForSelectedDate.length} missões ativas.`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder={`O que vamos conquistar dia ${format(selectedDate, 'dd')}?`}
                  className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 text-lg text-white"
                />
                <button onClick={addTask} className="bg-primary hover:bg-violet-600 text-white px-6 rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/30">
                  <Plus size={28} />
                </button>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar p-2 -m-2">
                {tasksForSelectedDate.map((task) => (
                  <div 
                    key={task.id} 
                    className={`group flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                      task.completed 
                        ? 'bg-slate-900/30 border-transparent opacity-50' 
                        : 'bg-slate-800/40 border-slate-700/50 hover:border-primary/40 hover:bg-slate-800/80 hover:shadow-lg hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          task.completed ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-slate-500 hover:border-primary text-transparent'
                        }`}
                      >
                        {task.completed && <CheckCircle size={16} className="text-white" strokeWidth={4} />}
                      </button>
                      <span className={`font-medium text-lg transition-all ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {task.text}
                      </span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-xl">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}