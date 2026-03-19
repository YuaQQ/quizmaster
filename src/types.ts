export interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  timeLimit: number;
  points: number;
  image?: string;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  isCorrect?: boolean;
  lastAnswerTime?: number;
}

export interface GameState {
  roomId: string;
  status: 'idle' | 'lobby' | 'playing' | 'results' | 'ended';
  questions: Question[];
  currentQuestion?: {
    text: string;
    options: string[];
    timeLimit: number;
    index: number;
    total: number;
  };
  timeLeft: number;
  players: Player[];
  correctAnswerIndex?: number;
  leaderboard: Player[];
}
