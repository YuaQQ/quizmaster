import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Upload, 
  Play, 
  Users, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  ArrowLeft,
  QrCode,
  User as UserIcon,
  Gamepad2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Question, Player, GameState } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATARS = [
  '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐙', '🦄', '🐝', '🦋', '🐢', '🦖'
];

export default function App() {
  const [view, setView] = useState<'landing' | 'host' | 'student'>('landing');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    roomId: '',
    status: 'idle',
    questions: [],
    timeLeft: 0,
    players: [],
    leaderboard: []
  });

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('host:room-created', (roomId) => {
      setGameState(prev => ({ ...prev, roomId, status: 'lobby' }));
    });

    newSocket.on('room:update', ({ players, status }) => {
      setGameState(prev => ({ ...prev, players, status }));
    });

    newSocket.on('player:joined', ({ roomId, player }) => {
      setGameState(prev => ({ ...prev, roomId, status: 'lobby' }));
    });

    newSocket.on('game:question', ({ question, timeLeft }) => {
      setGameState(prev => ({ 
        ...prev, 
        status: 'playing', 
        currentQuestion: question, 
        timeLeft,
        correctAnswerIndex: undefined 
      }));
    });

    newSocket.on('game:timer', (timeLeft) => {
      setGameState(prev => ({ ...prev, timeLeft }));
    });

    newSocket.on('game:results', ({ correctAnswerIndex, leaderboard, players }) => {
      setGameState(prev => ({ 
        ...prev, 
        status: 'results', 
        correctAnswerIndex, 
        leaderboard,
        players
      }));
    });

    newSocket.on('game:ended', (leaderboard) => {
      setGameState(prev => ({ ...prev, status: 'ended', leaderboard }));
    });

    newSocket.on('error', (msg) => alert(msg));

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createRoom = (questions: Question[]) => {
    socket?.emit('host:create', questions);
    setView('host');
  };

  const joinRoom = (roomId: string, nickname: string) => {
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    socket?.emit('player:join', { roomId, nickname, avatar });
    setView('student');
  };

  const startGame = () => {
    socket?.emit('host:start-game', gameState.roomId);
  };

  const submitAnswer = (answerIndex: number) => {
    socket?.emit('player:answer', { roomId: gameState.roomId, answerIndex });
  };

  return (
    <div className="min-h-screen bg-indigo-900 text-white font-sans selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <LandingView onHost={() => setView('host')} onJoin={(id, nick) => joinRoom(id, nick)} />
        )}

        {view === 'host' && (
          <HostView 
            gameState={gameState} 
            onCreateRoom={createRoom} 
            onStartGame={startGame}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'student' && (
          <StudentView 
            gameState={gameState} 
            onSubmitAnswer={submitAnswer}
            onBack={() => setView('landing')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingView({ onHost, onJoin }: { onHost: () => void, onJoin: (id: string, nick: string) => void }) {
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen p-6"
    >
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="inline-block p-4 bg-indigo-600 rounded-3xl shadow-2xl mb-4"
          >
            <Gamepad2 size={48} className="text-indigo-100" />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter italic">QUIZMASTER</h1>
          <p className="text-indigo-300 font-medium">The ultimate multiplayer quiz experience</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Game PIN" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-white/20"
            />
            <input 
              type="text" 
              placeholder="Nickname" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-white/20"
            />
            <button 
              onClick={() => onJoin(roomId, nickname)}
              disabled={!roomId || !nickname}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              JOIN GAME
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-white/30"><span className="bg-indigo-900 px-4">or</span></div>
          </div>

          <button 
            onClick={onHost}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            CREATE YOUR OWN QUIZ
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function HostView({ gameState, onCreateRoom, onStartGame, onBack }: { 
  gameState: GameState, 
  onCreateRoom: (q: Question[]) => void, 
  onStartGame: () => void,
  onBack: () => void
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-quiz', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.questions) setQuestions(data.questions);
    } catch (err) {
      alert('Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  };

  if (gameState.status === 'idle') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto p-8 space-y-8"
      >
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-all"><ArrowLeft /></button>
          <h2 className="text-3xl font-black italic tracking-tight">QUIZ CREATOR</h2>
          <div className="w-10"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] p-8 text-center space-y-4 hover:border-indigo-500/50 transition-all group relative">
              <input 
                type="file" 
                accept=".docx,.pdf" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Import from Document</h3>
                <p className="text-sm text-white/40">Upload .docx or .pdf to auto-generate questions</p>
              </div>
              {isParsing && (
                <div className="absolute inset-0 bg-indigo-900/80 backdrop-blur-sm flex items-center justify-center rounded-[2rem]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold tracking-widest uppercase">AI Parsing...</p>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswerIndex: 0, timeLimit: 30, points: 1000 }])}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={20} /> Add Question Manually
            </button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {questions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/20 py-20">
                <Edit2 size={48} className="mb-4 opacity-50" />
                <p className="font-bold">No questions yet</p>
              </div>
            ) : (
              questions.map((q, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 group"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Question {i + 1}</span>
                    <button 
                      onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input 
                    value={q.question}
                    onChange={(e) => {
                      const newQ = [...questions];
                      newQ[i].question = e.target.value;
                      setQuestions(newQ);
                    }}
                    placeholder="Enter question text..."
                    className="w-full bg-transparent border-b border-white/10 pb-2 focus:outline-none focus:border-indigo-500 transition-all font-bold text-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="relative">
                        <input 
                          value={opt}
                          onChange={(e) => {
                            const newQ = [...questions];
                            newQ[i].options[oi] = e.target.value;
                            setQuestions(newQ);
                          }}
                          className={cn(
                            "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-all",
                            q.correctAnswerIndex === oi && "border-green-500/50 bg-green-500/10"
                          )}
                        />
                        <button 
                          onClick={() => {
                            const newQ = [...questions];
                            newQ[i].correctAnswerIndex = oi;
                            setQuestions(newQ);
                          }}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/20",
                            q.correctAnswerIndex === oi ? "bg-green-500 border-green-500" : "hover:border-white/40"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {questions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-8"
          >
            <button 
              onClick={() => onCreateRoom(questions)}
              className="px-12 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Play fill="currentColor" /> CREATE GAME ROOM
            </button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {gameState.status === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12">
          <div className="flex flex-col md:flex-row items-center gap-12 max-w-5xl w-full">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl">
              <QRCodeSVG 
                value={`${window.location.origin}?room=${gameState.roomId}`} 
                size={256}
                level="H"
                includeMargin
              />
            </div>
            <div className="flex-1 text-center md:text-left space-y-6">
              <div className="space-y-1">
                <p className="text-indigo-300 font-bold tracking-widest uppercase text-sm">Join at {window.location.hostname}</p>
                <h1 className="text-8xl font-black tracking-tighter italic text-white drop-shadow-2xl">
                  {gameState.roomId}
                </h1>
              </div>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
                  <Users className="text-indigo-400" />
                  <span className="text-2xl font-black">{gameState.players.length}</span>
                  <span className="text-indigo-300 font-bold uppercase text-xs tracking-widest">Players</span>
                </div>
              </div>
              <button 
                onClick={onStartGame}
                disabled={gameState.players.length === 0}
                className="w-full md:w-auto px-12 py-5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-black text-2xl rounded-[2rem] shadow-2xl shadow-indigo-500/30 transition-all active:scale-95"
              >
                START GAME
              </button>
            </div>
          </div>

          <div className="w-full max-w-6xl grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            <AnimatePresence>
              {gameState.players.map((p) => (
                <motion.div 
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center space-y-2 hover:bg-white/10 transition-all"
                >
                  <div className="text-4xl">{p.avatar}</div>
                  <div className="font-black text-sm truncate uppercase tracking-tight">{p.nickname}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {gameState.status === 'playing' && gameState.currentQuestion && (
        <div className="flex-1 flex flex-col p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
              <Timer className="text-indigo-400" />
              <span className="text-3xl font-black tabular-nums">{gameState.timeLeft}</span>
            </div>
            <div className="text-center">
              <p className="text-indigo-300 font-bold uppercase text-xs tracking-widest mb-1">Question {gameState.currentQuestion.index + 1} of {gameState.currentQuestion.total}</p>
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((gameState.currentQuestion.index + 1) / gameState.currentQuestion.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10">
              <span className="text-2xl font-black">{gameState.players.length}</span>
              <span className="text-indigo-300 font-bold uppercase text-xs tracking-widest ml-2">Answers</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full space-y-12">
            <h2 className="text-5xl font-black text-center leading-tight drop-shadow-lg">
              {gameState.currentQuestion.text}
            </h2>
            
            <div className="grid grid-cols-2 gap-6 w-full">
              {gameState.currentQuestion.options.map((opt, i) => (
                <div 
                  key={i}
                  className={cn(
                    "p-8 rounded-[2rem] border-2 border-white/10 bg-white/5 flex items-center gap-6 transition-all",
                    "text-2xl font-bold"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black",
                    i === 0 ? "bg-red-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-yellow-500" : "bg-green-500"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState.status === 'results' && (
        <div className="flex-1 flex flex-col p-8">
          <div className="max-w-5xl mx-auto w-full space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black italic tracking-tight uppercase text-indigo-300">Leaderboard</h2>
              <div className="flex justify-center gap-8">
                {gameState.leaderboard.slice(0, 3).map((p, i) => (
                  <motion.div 
                    key={p.id}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative">
                      <div className="text-6xl">{p.avatar}</div>
                      <div className={cn(
                        "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                        i === 0 ? "bg-yellow-500 text-yellow-950" : i === 1 ? "bg-slate-300 text-slate-900" : "bg-amber-600 text-amber-950"
                      )}>
                        {i + 1}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-black uppercase tracking-tight">{p.nickname}</p>
                      <p className="text-indigo-400 font-bold">{p.score} pts</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <span className="font-black uppercase tracking-widest text-sm text-white/40">Player Rankings</span>
                <span className="font-black uppercase tracking-widest text-sm text-white/40">Score</span>
              </div>
              <div className="divide-y divide-white/5">
                {gameState.leaderboard.map((p, i) => (
                  <motion.div 
                    key={p.id}
                    layout
                    className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 font-black text-white/20 italic text-xl">{i + 1}</span>
                      <span className="text-2xl">{p.avatar}</span>
                      <span className="font-black uppercase tracking-tight">{p.nickname}</span>
                      {p.isCorrect !== undefined && (
                        p.isCorrect ? <CheckCircle2 className="text-green-500" size={16} /> : <XCircle className="text-red-500" size={16} />
                      )}
                    </div>
                    <span className="font-black text-xl tabular-nums">{p.score}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState.status === 'ended' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4"
          >
            <Trophy size={120} className="text-yellow-500 mx-auto drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]" />
            <h1 className="text-7xl font-black italic tracking-tighter">GAME OVER</h1>
            <p className="text-2xl text-indigo-300 font-bold">Final Podium</p>
          </motion.div>

          <div className="flex items-end gap-4 h-64">
            {gameState.leaderboard.slice(0, 3).sort((a, b) => {
              // Order: 2nd, 1st, 3rd
              const order = [1, 0, 2];
              return order.indexOf(gameState.leaderboard.indexOf(a)) - order.indexOf(gameState.leaderboard.indexOf(b));
            }).map((p, i) => {
              const rank = gameState.leaderboard.indexOf(p);
              const height = rank === 0 ? 'h-full' : rank === 1 ? 'h-4/5' : 'h-3/5';
              return (
                <motion.div 
                  key={p.id}
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ delay: rank * 0.2, type: "spring" }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="text-center">
                    <div className="text-5xl mb-2">{p.avatar}</div>
                    <p className="font-black uppercase text-sm">{p.nickname}</p>
                    <p className="text-indigo-400 font-bold text-xs">{p.score} pts</p>
                  </div>
                  <div className={cn(
                    "w-32 rounded-t-3xl flex items-center justify-center text-4xl font-black",
                    height,
                    rank === 0 ? "bg-yellow-500 text-yellow-950" : rank === 1 ? "bg-slate-300 text-slate-900" : "bg-amber-600 text-amber-950"
                  )}>
                    {rank + 1}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="px-12 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-xl transition-all"
          >
            BACK TO HOME
          </button>
        </div>
      )}
    </div>
  );
}

function StudentView({ gameState, onSubmitAnswer, onBack }: { 
  gameState: GameState, 
  onSubmitAnswer: (idx: number) => void,
  onBack: () => void
}) {
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    if (gameState.status === 'playing') setHasAnswered(false);
  }, [gameState.status, gameState.currentQuestion?.index]);

  if (gameState.status === 'lobby') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-8xl"
        >
          {gameState.players.find(p => p.id === gameState.players[0]?.id)?.avatar || '🎮'}
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black italic tracking-tight">YOU'RE IN!</h2>
          <p className="text-indigo-300 font-bold uppercase tracking-widest text-sm">Wait for the host to start</p>
        </div>
        <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Game PIN</p>
          <p className="text-3xl font-black tracking-widest">{gameState.roomId}</p>
        </div>
      </div>
    );
  }

  if (gameState.status === 'playing' && gameState.currentQuestion) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 font-black">
            {gameState.timeLeft}s
          </div>
          <div className="font-black text-sm text-indigo-300 uppercase tracking-widest">
            Q{gameState.currentQuestion.index + 1}
          </div>
        </div>

        {hasAnswered ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </motion.div>
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black italic">ANSWER SENT!</h3>
              <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs">Waiting for others...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 gap-4">
            {gameState.currentQuestion.options.map((_, i) => (
              <button 
                key={i}
                onClick={() => {
                  onSubmitAnswer(i);
                  setHasAnswered(true);
                }}
                className={cn(
                  "rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center",
                  i === 0 ? "bg-red-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-yellow-500" : "bg-green-500"
                )}
              >
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl font-black">
                  {String.fromCharCode(65 + i)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (gameState.status === 'results') {
    const me = gameState.players.find(p => p.id === gameState.players[0]?.id);
    const isCorrect = me?.isCorrect;

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-8 space-y-8",
          isCorrect ? "bg-green-600" : "bg-red-600"
        )}
      >
        <div className="text-center space-y-4">
          {isCorrect ? (
            <>
              <CheckCircle2 size={120} className="mx-auto drop-shadow-2xl" />
              <h2 className="text-6xl font-black italic tracking-tighter">CORRECT!</h2>
              <p className="text-2xl font-bold opacity-80">You're on fire! 🔥</p>
            </>
          ) : (
            <>
              <XCircle size={120} className="mx-auto drop-shadow-2xl" />
              <h2 className="text-6xl font-black italic tracking-tighter">WRONG</h2>
              <p className="text-2xl font-bold opacity-80">Better luck next time! 🍀</p>
            </>
          )}
        </div>
        <div className="bg-black/20 backdrop-blur-md px-8 py-4 rounded-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Your Score</p>
          <p className="text-4xl font-black">{me?.score || 0}</p>
        </div>
      </motion.div>
    );
  }

  if (gameState.status === 'ended') {
    const rank = gameState.leaderboard.findIndex(p => p.id === gameState.players[0]?.id) + 1;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
        <Trophy size={100} className="text-yellow-500" />
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black italic tracking-tight">GAME FINISHED</h2>
          <p className="text-indigo-300 font-bold uppercase tracking-widest text-sm">You finished at rank</p>
          <p className="text-8xl font-black italic tracking-tighter text-white">#{rank}</p>
        </div>
        <button 
          onClick={onBack}
          className="px-12 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-xl transition-all"
        >
          BACK TO HOME
        </button>
      </div>
    );
  }

  return null;
}
