/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Trophy, 
  Terminal as TerminalIcon, 
  Sword, 
  ShoppingBag, 
  Zap, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  VolumeX,
  User,
  Star,
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  LogIn,
  Send,
  MessageSquare,
  X,
  Play,
  Terminal,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Firebase ---
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = 'dashboard' | 'quest' | 'arena' | 'shop';

interface UserStats {
  level: number;
  xp: number;
  maxXp: number;
  streak: number;
  gold: number;
  displayName?: string;
  photoURL?: string;
}

interface Mission {
  id: string;
  level: number;
  title: string;
  description: string;
  goal: string;
  instructions: string[];
  initialCode: string;
  successCheck: (code: string) => boolean;
  rewardXp: number;
  rewardGold: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const MISSIONS: Mission[] = [
  {
    id: 'stars',
    level: 1,
    title: 'The Star Maker',
    description: 'Use your magic code to create more stars!',
    goal: 'Change the number 3 to 10 to fill the sky with stars.',
    instructions: [
      'Look for the line: let stars = 3;',
      'Change the 3 to a 10.',
      'Click "Cast Spell" to see the magic!'
    ],
    initialCode: '// Mission: Change the number of stars!\nlet stars = 3;\n\nfor (let i = 0; i < stars; i++) {\n  console.log("⭐");\n}',
    successCheck: (code) => code.includes('stars = 10') || code.includes('stars=10'),
    rewardXp: 100,
    rewardGold: 20,
    difficulty: 'Easy'
  },
  {
    id: 'message',
    level: 2,
    title: 'The Secret Message',
    description: 'The computer wants to say something special!',
    goal: 'Change the message to "I am a Coder!"',
    instructions: [
      'Look for the line: let message = "Hello";',
      'Change "Hello" to "I am a Coder!"',
      'Make sure you keep the "quotes"!'
    ],
    initialCode: '// Mission: Change the secret message!\nlet message = "Hello";\n\nconsole.log("The computer says: " + message);',
    successCheck: (code) => code.includes('"I am a Coder!"') || code.includes("'I am a Coder!'"),
    rewardXp: 200,
    rewardGold: 50,
    difficulty: 'Medium'
  },
  {
    id: 'logic',
    level: 3,
    title: 'The Happy Switch',
    description: 'Turn on the happiness with a logic switch!',
    goal: 'Change false to true to make the computer happy.',
    instructions: [
      'Look for: let isHappy = false;',
      'Change false to true.',
      'Booleans are like light switches!'
    ],
    initialCode: '// Mission: Flip the switch!\nlet isHappy = false;\n\nif (isHappy) {\n  console.log("😊 I am so happy!");\n} else {\n  console.log("😢 I am sad...");\n}',
    successCheck: (code) => code.includes('isHappy = true') || code.includes('isHappy=true'),
    rewardXp: 300,
    rewardGold: 100,
    difficulty: 'Hard'
  },
  {
    id: 'arrays',
    level: 4,
    title: 'The Treasure Chest',
    description: 'Find the gold in the treasure chest!',
    goal: 'Add "Gold" to the treasure array.',
    instructions: [
      'Look for: let treasure = ["Silver", "Bronze"];',
      'Add "Gold" to the list.',
      'Example: ["Silver", "Bronze", "Gold"]'
    ],
    initialCode: '// Mission: Fill the chest with Gold!\nlet treasure = ["Silver", "Bronze"];\n\nconsole.log("Chest contains: " + treasure.join(", "));\n\nif (treasure.includes("Gold")) {\n  console.log("💰 You found the Gold!");\n} else {\n  console.log("❌ No gold here yet...");\n}',
    successCheck: (code) => code.includes('"Gold"') || code.includes("'Gold'"),
    rewardXp: 400,
    rewardGold: 150,
    difficulty: 'Medium'
  },
  {
    id: 'functions',
    level: 5,
    title: 'The Magic Machine',
    description: 'Teach the machine how to double any number!',
    goal: 'Make the function return number * 2.',
    instructions: [
      'Look for: return number;',
      'Change it to: return number * 2;',
      'Functions are like magic recipes!'
    ],
    initialCode: '// Mission: Double the power!\nfunction double(number) {\n  return number;\n}\n\nlet result = double(5);\nconsole.log("5 doubled is: " + result);\n\nif (result === 10) {\n  console.log("⚡ The machine is working!");\n} else {\n  console.log("❌ The machine is broken...");\n}',
    successCheck: (code) => code.includes('number * 2') || code.includes('number*2'),
    rewardXp: 500,
    rewardGold: 200,
    difficulty: 'Hard'
  },
  {
    id: 'objects',
    level: 6,
    title: 'The Magic Map',
    description: 'Update the map to find the hidden castle!',
    goal: 'Change the castle property to "Visible".',
    instructions: [
      'Look for: castle: "Hidden"',
      'Change it to: castle: "Visible"',
      'Objects store information in pairs!'
    ],
    initialCode: '// Mission: Reveal the castle!\nlet map = {\n  forest: "Green",\n  castle: "Hidden"\n};\n\nconsole.log("Map says castle is: " + map.castle);\n\nif (map.castle === "Visible") {\n  console.log("🏰 The castle has appeared!");\n} else {\n  console.log("❌ Still hidden...");\n}',
    successCheck: (code) => code.includes('"Visible"') || code.includes("'Visible'"),
    rewardXp: 600,
    rewardGold: 250,
    difficulty: 'Medium'
  },
  {
    id: 'loops',
    level: 7,
    title: 'The Infinite Staircase',
    description: 'Climb the stairs using a loop!',
    goal: 'Make the loop run 5 times.',
    instructions: [
      'Look for: i < 1',
      'Change it to: i < 5',
      'Loops help us do things many times!'
    ],
    initialCode: '// Mission: Climb 5 steps!\nlet steps = 0;\nfor (let i = 0; i < 1; i++) {\n  steps++;\n  console.log("Climbing step " + steps + "...");\n}\n\nif (steps === 5) {\n  console.log("🏃 You reached the top!");\n} else {\n  console.log("❌ You are still at the bottom...");\n}',
    successCheck: (code) => code.includes('i < 5') || code.includes('i<5'),
    rewardXp: 700,
    rewardGold: 300,
    difficulty: 'Hard'
  },
  {
    id: 'riddle',
    level: 8,
    title: 'The Gatekeeper\'s Riddle',
    description: 'Answer the riddle to pass the gate!',
    goal: 'Set the answer to 42.',
    instructions: [
      'Look for: let answer = 0;',
      'Change it to: let answer = 42;',
      'The answer to everything!'
    ],
    initialCode: '// Mission: Solve the riddle!\nlet answer = 0;\n\nif (answer === 42) {\n  console.log("🔓 The gate opens!");\n} else {\n  console.log("🔒 The gatekeeper shakes his head...");\n}',
    successCheck: (code) => code.includes('answer = 42') || code.includes('answer=42'),
    rewardXp: 800,
    rewardGold: 350,
    difficulty: 'Medium'
  },
  {
    id: 'alchemy',
    level: 9,
    title: 'The Alchemist\'s Brew',
    description: 'Mix the potion correctly!',
    goal: 'Set blue + red to equal 10.',
    instructions: [
      'Look for: let blue = 2;',
      'Change blue to 5 and red to 5.',
      'Math is the secret to alchemy!'
    ],
    initialCode: '// Mission: Mix the potion!\nlet blue = 2;\nlet red = 3;\n\nlet total = blue + red;\nconsole.log("Total ingredients: " + total);\n\nif (total === 10) {\n  console.log("🧪 The potion glows brightly!");\n} else {\n  console.log("❌ The potion is bubbling dangerously...");\n}',
    successCheck: (code) => (code.includes('blue = 5') || code.includes('blue=5')) && (code.includes('red = 5') || code.includes('red=5')),
    rewardXp: 900,
    rewardGold: 400,
    difficulty: 'Hard'
  },
  {
    id: 'final',
    level: 10,
    title: 'The Code Master\'s Trial',
    description: 'The final test of your skills!',
    goal: 'Create a function that returns "Master".',
    instructions: [
      'Look for: return "Novice";',
      'Change it to: return "Master";',
      'You are almost a Code Master!'
    ],
    initialCode: '// Mission: The Final Trial!\nfunction getRank() {\n  return "Novice";\n}\n\nlet rank = getRank();\nconsole.log("Your rank is: " + rank);\n\nif (rank === "Master") {\n  console.log("🏆 CONGRATULATIONS! You are a Code Master!");\n} else {\n  console.log("❌ Keep practicing!");\n}',
    successCheck: (code) => code.includes('"Master"') || code.includes("'Master'"),
    rewardXp: 1000,
    rewardGold: 500,
    difficulty: 'Hard'
  }
];

// --- ChatBot Component ---
import { GoogleGenAI } from "@google/genai";

const ChatBot = ({ userStats, currentMission }: { userStats: UserStats | null, currentMission: Mission }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: "Hi Hero! I'm Codey, your AI mentor. Need help with your mission?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are Codey, a friendly AI mentor for a gamified coding platform called CodeQuest.
        The user is a child aged 7-10.
        Current User Stats: Level ${userStats?.level}, XP ${userStats?.xp}/${userStats?.maxXp}.
        Current Mission: ${currentMission.title} - ${currentMission.description}.
        Mission Goal: ${currentMission.goal}
        Mission Instructions: ${currentMission.instructions.join(', ')}

        User asked: "${userMessage}"

        Provide a very short, encouraging, and helpful response. 
        Don't give the answer directly, but guide them towards it.
        Use emojis and keep it simple.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setMessages(prev => [...prev, { role: 'bot', text: response.text || "I'm a bit confused, try asking again!" }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Oops! My magic circuits are fuzzy. Try again later!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 h-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success-emerald rounded-full animate-pulse" />
                <span className="font-bold text-slate-200">Codey AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Codey..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
      >
        {isOpen ? <X className="text-white" /> : <MessageSquare className="text-white" />}
      </motion.button>
    </div>
  );
};

// --- Components ---

const ProgressBar = ({ value, max, color = 'bg-level-up-gold' }: { value: number, max: number, color?: string }) => (
  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${(value / max) * 100}%` }}
      className={cn("h-full shadow-[0_0_10px_rgba(250,204,21,0.5)]", color)}
    />
  </div>
);

const GlassCard = ({ children, className, neon = false, ...props }: { children: React.ReactNode, className?: string, neon?: boolean } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    {...props}
    className={cn(
      "glass-panel p-6 transition-all duration-300",
      neon && "neon-border-gold",
      className
    )}
  >
    {children}
  </div>
);

const SuccessRitual = () => {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <div className="text-center">
        <motion.h2 
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl font-bold neon-text-gold mb-4"
        >
          LEVEL UP!
        </motion.h2>
        <p className="text-2xl text-success-emerald font-medium">Mission Accomplished, Warrior!</p>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission>(MISSIONS[0]);
  const [code, setCode] = useState(MISSIONS[0].initialCode);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'encouragement', message: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);

  // --- Auth & Data Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Check if user exists in Firestore, if not create
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const initialStats: UserStats = {
            level: 1,
            xp: 0,
            maxXp: 100, // Lowered to 100 so first mission (100 XP) levels them up!
            streak: 0,
            gold: 50,
            displayName: currentUser.displayName || 'Hero',
            photoURL: currentUser.photoURL || undefined
          };
          await setDoc(userRef, {
            ...initialStats,
            uid: currentUser.uid,
            email: currentUser.email,
            createdAt: serverTimestamp()
          });
        } else {
          // Update profile info if it changed
          await updateDoc(userRef, {
            displayName: currentUser.displayName || 'Hero',
            photoURL: currentUser.photoURL || undefined
          });
        }
      } else {
        setStats(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserStats;
        
        // FIX: If user is Level 1 and has a high maxXp (from old session), fix it
        if (data.level === 1 && data.maxXp > 100) {
          updateDoc(userRef, { maxXp: 100 });
          return;
        }

        setStats(data);
        
        // Update current mission if level changed and we haven't selected one
        const availableMissions = MISSIONS.filter(m => m.level <= data.level);
        const latestMission = availableMissions[availableMissions.length - 1];
        if (latestMission && latestMission.id !== currentMission.id) {
          // Only auto-switch if they are on a lower level mission
          if (currentMission.level < latestMission.level) {
            setCurrentMission(latestMission);
            setCode(latestMission.initialCode);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user, currentMission.id]);

  // Real Leaderboard Fetch
  useEffect(() => {
    if (view === 'arena' || view === 'dashboard') {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('xp', 'desc'), limit(10));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const leaders = snapshot.docs.map(doc => doc.data() as UserStats);
        
        // If no real users yet, add some "System Warriors" so it's not empty
        if (leaders.length < 8) {
          const mocks: UserStats[] = [
            { level: 15, xp: 5200, maxXp: 6000, streak: 12, gold: 1200, displayName: 'MasterMind' },
            { level: 12, xp: 3800, maxXp: 4500, streak: 8, gold: 800, displayName: 'CodeCobra' },
            { level: 10, xp: 2500, maxXp: 3000, streak: 5, gold: 500, displayName: 'LogicLegend' },
            { level: 9, xp: 2100, maxXp: 2800, streak: 4, gold: 400, displayName: 'PixelPirate' },
            { level: 8, xp: 1800, maxXp: 2500, streak: 3, gold: 300, displayName: 'ByteKnight' },
            { level: 7, xp: 1500, maxXp: 2200, streak: 3, gold: 250, displayName: 'DataDancer' },
            { level: 5, xp: 1200, maxXp: 2000, streak: 2, gold: 150, displayName: 'SyntaxSlayer' },
            { level: 4, xp: 900, maxXp: 1500, streak: 1, gold: 100, displayName: 'ScriptScout' }
          ];
          // Filter out mocks that have the same name as real users to avoid duplicates
          const uniqueMocks = mocks.filter(m => !leaders.some(l => l.displayName === m.displayName));
          setLeaderboard([...leaders, ...uniqueMocks].sort((a, b) => b.xp - a.xp).slice(0, 10));
        } else {
          setLeaderboard(leaders);
        }
      }, (error) => {
        console.error("Leaderboard error:", error);
        // Fallback to mocks on error
        setLeaderboard([
          { level: 15, xp: 5200, maxXp: 6000, streak: 12, gold: 1200, displayName: 'MasterMind' },
          { level: 12, xp: 3800, maxXp: 4500, streak: 8, gold: 800, displayName: 'CodeCobra' },
          { level: 10, xp: 2500, maxXp: 3000, streak: 5, gold: 500, displayName: 'LogicLegend' },
          { level: 8, xp: 1800, maxXp: 2500, streak: 3, gold: 300, displayName: 'ByteKnight' },
          { level: 5, xp: 1200, maxXp: 2000, streak: 2, gold: 150, displayName: 'SyntaxSlayer' }
        ]);
      });
      
      return () => unsubscribe();
    }
  }, [view]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleRunCode = async () => {
    if (!user || !stats) return;

    if (currentMission.successCheck(code)) {
      setFeedback({ type: 'success', message: 'Amazing! You solved the mission! 🌟' });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      
      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      let newXp = stats.xp + currentMission.rewardXp;
      let newLevel = stats.level;
      let newMaxXp = stats.maxXp;

      // Level Up Logic
      while (newXp >= newMaxXp) {
        newLevel += 1;
        newXp = newXp - newMaxXp;
        newMaxXp = Math.floor(newMaxXp * 1.5);
      }

      await updateDoc(userRef, {
        xp: newXp,
        level: newLevel,
        maxXp: newMaxXp,
        gold: stats.gold + currentMission.rewardGold
      });
    } else {
      setFeedback({ 
        type: 'encouragement', 
        message: 'Almost there, Hero! Check the instructions and try again!' 
      });
    }
  };

  const startMission = (mission: Mission) => {
    setCurrentMission(mission);
    setCode(mission.initialCode);
    setView('quest');
    setFeedback(null);
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Command Center' },
    { id: 'quest', icon: BookOpen, label: 'Quests' },
    { id: 'arena', icon: Users, label: 'The Arena' },
    { id: 'shop', icon: ShoppingBag, label: 'Power-Ups' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-24 bg-slate-900/50 border-r border-cyber-border flex flex-col items-center py-8 gap-8 z-20">
        <div className="w-12 h-12 bg-level-up-gold rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)] mb-4">
          <TerminalIcon className="text-cyber-navy w-8 h-8" />
        </div>
        
        <div className="flex flex-row md:flex-col gap-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 group relative",
                view === item.id ? "bg-level-up-gold text-cyber-navy" : "text-slate-500 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 text-slate-500 hover:text-slate-200 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
          {user ? (
            <button 
              onClick={handleLogout}
              className="p-3 text-slate-500 hover:text-red-400 transition-colors group relative"
            >
              <LogOut className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                Logout
              </span>
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              className="p-3 text-level-up-gold hover:text-white transition-colors group relative"
            >
              <LogIn className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                Login
              </span>
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-cyber-border flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="text-slate-400 w-6 h-6" />
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto p-4 md:p-8">
        {/* Background Atmosphere */}
        <div className="fixed inset-0 pointer-events-none opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-level-up-gold/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success-emerald/10 blur-[120px] rounded-full" />
        </div>

        <AnimatePresence mode="wait">
          {!isAuthReady ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-level-up-gold border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : !user ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="h-full flex items-center justify-center"
            >
              <GlassCard className="max-w-md w-full text-center space-y-8 py-12" neon>
                <div className="w-20 h-20 bg-level-up-gold rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.4)] mx-auto">
                  <TerminalIcon className="text-cyber-navy w-12 h-12" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Start Your <span className="neon-text-gold">Adventure!</span></h2>
                  <p className="text-slate-400">Join CodeQuest to collect gold and become a Coding Hero!</p>
                </div>
                <button 
                  onClick={handleLogin}
                  className="w-full py-4 bg-level-up-gold text-cyber-navy font-bold rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                >
                  <LogIn className="w-5 h-5" />
                  Enter the Game
                </button>
              </GlassCard>
            </motion.div>
          ) : view === 'dashboard' && stats ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Hi, <span className="neon-text-gold">{user.displayName?.split(' ')[0] || 'Hero'}</span>! 👋</h1>
                  <p className="text-slate-400">Ready to learn something new today? You have 3 fun missions!</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-cyber-border">
                    <Flame className="text-orange-500 w-5 h-5" />
                    <span className="font-bold text-white">{stats.streak} Day Streak</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-cyber-border">
                    <Star className="text-level-up-gold w-5 h-5" />
                    <span className="font-bold text-white">{stats.gold} Gold</span>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="md:col-span-2" neon>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Zap className="text-level-up-gold w-5 h-5" />
                      Level {stats.level} Progress
                    </h3>
                    <span className="text-slate-400 text-sm">{stats.xp} / {stats.maxXp} XP</span>
                  </div>
                  <ProgressBar value={stats.xp} max={stats.maxXp} />
                  <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                      <div className="text-xs text-slate-500 uppercase mb-1">Rank</div>
                      <div className="font-bold text-level-up-gold">Script Sensei</div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                      <div className="text-xs text-slate-500 uppercase mb-1">Global</div>
                      <div className="font-bold text-white">#1,240</div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                      <div className="text-xs text-slate-500 uppercase mb-1">Quests</div>
                      <div className="font-bold text-white">42</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="flex flex-col justify-center items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-success-emerald/20 flex items-center justify-center neon-border-emerald">
                    <Trophy className="text-success-emerald w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Daily Challenge</h3>
                    <p className="text-sm text-slate-400 mb-4">Complete a quick quiz to keep your streak alive!</p>
                    <button 
                      onClick={() => setView('quest')}
                      className="w-full py-2 bg-success-emerald text-cyber-navy font-bold rounded-lg hover:bg-success-emerald/80 transition-colors"
                    >
                      Start Quiz
                    </button>
                  </div>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Sword className="text-slate-400 w-6 h-6" />
                    Active Missions
                  </h2>
                  <div className="space-y-4">
                    {MISSIONS.filter(m => m.level <= stats.level).map((mission) => (
                      <div 
                        key={mission.id} 
                        onClick={() => startMission(mission)}
                        className="group p-4 bg-slate-800/30 border border-cyber-border rounded-xl hover:border-level-up-gold/50 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold group-hover:text-level-up-gold transition-colors">{mission.title}</h4>
                            <div className="flex gap-3 mt-1">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Zap className="w-3 h-3" /> {mission.rewardXp} XP
                              </span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded uppercase font-bold",
                                mission.difficulty === 'Easy' ? "bg-success-emerald/20 text-success-emerald" : 
                                mission.difficulty === 'Medium' ? "bg-encouragement-amber/20 text-encouragement-amber" : "bg-red-500/20 text-red-500"
                              )}>
                                {mission.difficulty}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="text-slate-600 group-hover:text-level-up-gold transition-colors" />
                        </div>
                      </div>
                    ))}
                    {stats.level < 3 && (
                      <div className="p-4 bg-slate-900/20 border border-dashed border-cyber-border rounded-xl opacity-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-slate-500">Locked Mission</h4>
                            <p className="text-xs text-slate-600">Reach Level {stats.level + 1} to unlock!</p>
                          </div>
                          <Zap className="text-slate-700 w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Users className="text-slate-400 w-6 h-6" />
                    Top Warriors
                  </h2>
                  <div className="glass-panel overflow-hidden">
                    {leaderboard.length > 0 ? leaderboard.map((warrior, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border-b border-cyber-border last:border-0">
                        <div className="w-8 text-slate-500 font-mono">0{i+1}</div>
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                          {warrior.photoURL ? (
                            <img src={warrior.photoURL} alt={warrior.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm truncate max-w-[100px]">{warrior.displayName || 'Hero'}</div>
                          <div className="text-[10px] text-slate-500">Level {warrior.level}</div>
                        </div>
                        <div className="text-level-up-gold font-bold text-xs">{warrior.xp} XP</div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500 text-sm">Searching for legends...</div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          ) : view === 'quest' && stats ? (
            <motion.div
              key="quest"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-white">Mission: <span className="text-level-up-gold">{currentMission.title}</span></h2>
                  <p className="text-slate-400">{currentMission.description}</p>
                </div>
                <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-white flex items-center gap-2">
                  Go Back
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
                {/* Terminal Editor */}
                <div className="lg:col-span-2 flex flex-col bg-slate-950 rounded-xl border border-cyber-border overflow-hidden shadow-2xl">
                  <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-cyber-border">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="text-xs font-mono text-slate-500">{currentMission.id}.js</div>
                    <div className="w-12" />
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 bg-transparent p-6 font-mono text-success-emerald focus:outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="p-4 bg-slate-900 border-t border-cyber-border flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span className="animate-pulse text-success-emerald">●</span> Magic Ready!
                    </div>
                    <button 
                      onClick={handleRunCode}
                      className="px-6 py-2 bg-level-up-gold text-cyber-navy font-bold rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 transition-transform"
                    >
                      Cast Spell! ✨
                    </button>
                  </div>
                </div>

                {/* Mission Briefing */}
                <div className="space-y-6">
                  <GlassCard className="h-full">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <AlertCircle className="text-level-up-gold w-5 h-5" />
                      Your Goal
                    </h3>
                    <div className="space-y-4 text-slate-300 leading-relaxed">
                      <p>{currentMission.goal}</p>
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyber-border">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">How to win</h4>
                        <ul className="text-sm space-y-2">
                          {currentMission.instructions.map((inst, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-level-up-gold mt-0.5" />
                              {inst}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Prizes</h4>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1 text-level-up-gold font-bold">
                            <Zap className="w-4 h-4" /> {currentMission.rewardXp} XP
                          </div>
                          <div className="flex items-center gap-1 text-white font-bold">
                            <Star className="w-4 h-4 text-level-up-gold" /> {currentMission.rewardGold} Gold
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>

              {/* Feedback Overlay */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
                  >
                    <div className={cn(
                      "p-4 rounded-xl border flex items-center gap-4 shadow-2xl backdrop-blur-md",
                      feedback.type === 'success' ? "bg-success-emerald/20 border-success-emerald text-success-emerald" : "bg-encouragement-amber/20 border-encouragement-amber text-encouragement-amber"
                    )}>
                      {feedback.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
                      <p className="font-medium">{feedback.message}</p>
                      <button onClick={() => setFeedback(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : view === 'shop' && stats ? (
            <motion.div
              key="shop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white">Power-Up <span className="text-level-up-gold">Shop</span></h2>
                  <p className="text-slate-400">Trade your hard-earned gold for legendary enhancements.</p>
                </div>
                <div className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 rounded-xl border border-cyber-border">
                  <Star className="text-level-up-gold w-6 h-6" />
                  <span className="text-2xl font-bold text-white">{stats.gold}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'Neon Ghost Theme', price: 500, desc: 'A vibrant UI overhaul with glowing accents.', icon: Zap, color: 'text-purple-400' },
                  { name: 'Logic Legend Badge', price: 1200, desc: 'A prestigious badge for your profile.', icon: Trophy, color: 'text-level-up-gold' },
                  { name: 'Streak Freeze', price: 300, desc: 'Protect your streak for 24 hours.', icon: Flame, color: 'text-orange-500' },
                  { name: 'Double XP Booster', price: 800, desc: 'Earn 2x XP for the next 3 missions.', icon: Star, color: 'text-success-emerald' },
                  { name: 'Cyber Katana Icon', price: 1500, desc: 'Exclusive profile icon for elite warriors.', icon: Sword, color: 'text-red-400' },
                ].map((item, i) => (
                  <GlassCard key={i} className="group hover:scale-[1.02] transition-transform cursor-pointer">
                    <div className={cn("w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-4 group-hover:neon-border-gold transition-all", item.color)}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold mb-1">{item.name}</h4>
                    <p className="text-sm text-slate-400 mb-6">{item.desc}</p>
                    <button className="w-full py-2 bg-slate-800 hover:bg-level-up-gold hover:text-cyber-navy font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                      <Star className="w-4 h-4" /> {item.price} Gold
                    </button>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          ) : view === 'arena' && stats ? (
            <motion.div
              key="arena"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-2">The <span className="neon-text-gold">Arena</span></h2>
                <p className="text-slate-400">Where legends are forged and syntax is perfected.</p>
              </div>

              <div className="space-y-4">
                {leaderboard.length > 0 ? leaderboard.map((warrior, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-6 p-6 glass-panel hover:neon-border-gold transition-all group"
                  >
                    <div className="text-2xl font-mono text-slate-600 group-hover:text-level-up-gold transition-colors">#{i+1}</div>
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-cyber-border flex items-center justify-center overflow-hidden shrink-0">
                      {warrior.photoURL ? (
                        <img src={warrior.photoURL} alt={warrior.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold">{warrior.displayName || 'Hero'}</h4>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-slate-800", 
                          i === 0 ? "text-level-up-gold" : i === 1 ? "text-slate-300" : "text-orange-400"
                        )}>
                          {i === 0 ? 'Grand Master' : i === 1 ? 'Elite Warrior' : 'Code Crusader'}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-slate-500">
                        <span>Level {warrior.level}</span>
                        <span>•</span>
                        <span>{warrior.xp} Total XP</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="flex gap-1">
                        {[1, 2, 3].map(s => <Star key={s} className={cn("w-4 h-4", i < 3 ? "text-level-up-gold fill-level-up-gold" : "text-slate-700")} />)}
                      </div>
                      <span className="text-xs text-slate-500 mt-1">{i < 3 ? 'Elite Warrior' : 'Warrior'}</span>
                    </div>
                  </motion.div>
                )) : (
                  <div className="p-12 text-center text-slate-500">No legends found in the arena yet.</div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Success Ritual Overlay */}
        <AnimatePresence>
          {showSuccess && <SuccessRitual />}
        </AnimatePresence>
      </main>
      {/* ChatBot */}
      <ChatBot userStats={stats} currentMission={currentMission} />
    </div>
  );
}
