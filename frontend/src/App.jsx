import React, { useState, useRef, useEffect } from "react";

// API base for Hugging Face Space
const API_URL = "https://mozzic-debate_pal.hf.space";

// Voice and language configurations
const VOICES = {
  "Yoruba": {
    "Female": ["sade", "funmi"],
    "Male": ["segun", "femi"]
  },
  "Hausa": {
    "Female": ["amina", "zainab"],
    "Male": ["hasan", "aliyu"]
  },
  "Igbo": {
    "Female": ["ngozi", "amara"],
    "Male": ["obinna", "ebuka"]
  },
  "English": {
    "Female": ["lucy", "lina", "kani"],
    "Male": ["john", "jude", "henry"]
  }
};

const LANGUAGE_CODES = {
  "English": "en",
  "Yoruba": "yo",
  "Hausa": "ha",
  "Igbo": "ig"
};

const App = () => {
  // Core state management
  const [debateSession, setDebateSession] = useState({
    topic: "Artificial intelligence should be heavily regulated by government",
    stance: "For",
    language: "English", 
    gender: "Male",
    isActive: false,
    currentRound: 1,
    sessionId: null,
    timeLeft: 300 // 5 minutes
  });
  
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [statusMessage, setStatusMessage] = useState("Click 'Start New Round' to begin the debate!");
  const [timerDisplay, setTimerDisplay] = useState("05:00");
  const [isLoading, setIsLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  
  // Timer management
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setDebateSession(prev => {
        const newTimeLeft = prev.timeLeft - 1;
        setTimerDisplay(formatTime(newTimeLeft));
        
        if (newTimeLeft <= 0) {
          clearInterval(timerRef.current);
          handleSubmitRound(); // Auto-submit when time expires
          return { ...prev, timeLeft: 0 };
        }
        
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);
  };
  
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start new debate round
  const handleStartRound = async () => {
    const newSessionId = `session_${Date.now()}`;
    
    setDebateSession(prev => ({
      ...prev,
      isActive: true,
      sessionId: newSessionId,
      timeLeft: 300,
      currentRound: 1
    }));
    
    setMessages([]);
    setUserInput("");
    setAiResponse("");
    setCurrentAudio(null);
    setTimerDisplay("05:00");
    
    try {
      // Call Gradio's start round function
      const response = await fetch(`${API_URL}/call/on_start_round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            debateSession.topic,
            debateSession.stance, 
            debateSession.language,
            debateSession.gender,
            newSessionId
          ]
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const [statusMsg, timerVal] = result.data;
          setStatusMessage(statusMsg);
          setTimerDisplay(timerVal);
        }
      }
    } catch (error) {
      console.log("Start round API call failed, using local timer");
    }
    
    const roundMsg = `🎯 ROUND ${debateSession.currentRound} STARTED!\n\nTopic: ${debateSession.topic}\nYour stance: ${debateSession.stance}\n\nYou have 5 minutes to present your arguments. The timer will auto-submit when time expires.`;
    setStatusMessage(roundMsg);
    
    startTimer();
  };

  // Submit round and get AI response
  const handleSubmitRound = async () => {
    if (!userInput.trim() && !debateSession.isActive) return;
    
    stopTimer();
    setIsLoading(true);
    
    // Simulate API delay for realistic demo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Generate contextual AI response based on topic and stance
      const opponent_stance = debateSession.stance.toLowerCase() === "for" ? "against" : "for";
      const topic = debateSession.topic.toLowerCase();
      
      let aiResponse;
      if (topic.includes("ai") || topic.includes("artificial intelligence")) {
        if (opponent_stance === "against") {
          aiResponse = `I understand your support for AI regulation, but I believe market-driven solutions are more effective. Heavy government regulation could stifle innovation and push development to countries with fewer restrictions. The tech industry has shown it can self-regulate through ethical AI initiatives and industry standards. Additionally, regulation often lags behind technology, making rules obsolete before they're implemented.`;
        } else {
          aiResponse = `While innovation is important, your argument overlooks the significant risks of unregulated AI. We've seen how social media algorithms can manipulate behavior and spread misinformation. AI systems making decisions about loans, hiring, and criminal justice need oversight to prevent discrimination. Other industries like pharmaceuticals and aviation are heavily regulated for public safety - AI should be no different.`;
        }
      } else if (topic.includes("remote work")) {
        if (opponent_stance === "against") {
          aiResponse = `Remote work may seem convenient, but it fundamentally undermines collaboration and company culture. In-person interactions foster creativity and spontaneous problem-solving that video calls cannot replicate. Many studies show decreased productivity and innovation in fully remote teams. Additionally, remote work creates inequality between those with proper home setups and those without.`;
        } else {
          aiResponse = `Your points about collaboration have merit, but remote work offers substantial benefits that outweigh these concerns. Companies like GitLab and Buffer have proven that remote-first cultures can be highly productive. Remote work reduces commute time, increases work-life balance, and allows companies to hire the best talent regardless of location. The key is implementing proper remote work practices, not abandoning the model entirely.`;
        }
      } else {
        // Generic response template
        const genericResponses = [
          `While your arguments have some validity, the ${opponent_stance} position offers a more practical approach to ${debateSession.topic}. Consider the economic implications and long-term sustainability of implementing such policies. Historical precedents suggest that alternative approaches have yielded better outcomes.`,
          `I appreciate your perspective on ${debateSession.topic}, but I believe you're overlooking crucial counterarguments. The ${opponent_stance} stance addresses several flaws in your reasoning, particularly regarding implementation challenges and unintended consequences that could arise.`,
          `Your position on ${debateSession.topic} raises interesting points, however, the ${opponent_stance} viewpoint provides a more balanced solution. We must consider stakeholder impacts, resource allocation, and measurable outcomes when evaluating policy effectiveness.`
        ];
        aiResponse = genericResponses[Math.floor(Math.random() * genericResponses.length)];
      }
      
      setAiResponse(aiResponse);
      setStatusMessage(`✅ Round ${debateSession.currentRound} completed!\n\n🤖 AI Response:\n${aiResponse}\n\n${debateSession.currentRound < 2 ? `🎯 Ready for Round ${debateSession.currentRound + 1}?` : '🏁 DEBATE COMPLETED!\n\nThank you for the debate!'}`);
      
      // Add messages to chat
      if (userInput.trim()) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: "user",
          text: userInput,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "ai", 
        text: aiResponse,
        audio: null, // Demo mode - no audio
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      // Update round status
      setDebateSession(prev => ({
        ...prev,
        currentRound: prev.currentRound < 2 ? prev.currentRound + 1 : prev.currentRound,
        isActive: prev.currentRound < 2,
        timeLeft: prev.currentRound < 2 ? 300 : 0
      }));
      
      // Reset timer for next round
      if (debateSession.currentRound < 2) {
        setTimerDisplay("05:00");
        setTimeout(() => {
          if (debateSession.isActive) {
            startTimer();
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error("Demo error:", error);
      setAiResponse("Demo mode active - AI responses are simulated for showcase purposes.");
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Please allow microphone access to use voice recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      setIsLoading(true);
      
      // Demo mode: Simulate transcription delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, show that recording was captured
      const demoTranscriptions = [
        "I believe this topic is important because it affects how we interact with technology in our daily lives.",
        "From an economic perspective, the implementation costs need to be carefully considered before moving forward.",
        "The historical context shows that similar policies have had mixed results in other countries.",
        "We must balance innovation with responsible oversight to achieve the best outcomes for society."
      ];
      
      const randomTranscription = demoTranscriptions[Math.floor(Math.random() * demoTranscriptions.length)];
      setUserInput(randomTranscription);
      
    } catch (error) {
      console.error("Demo transcription:", error);
      setUserInput("Voice recording captured - please edit this text with your actual argument");
    } finally {
      setIsLoading(false);
    }
  };

  // Play audio response
  const playAudio = (audioUrl) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(console.error);
    }
  };

  // Update timer display manually
  const updateTimer = () => {
    setTimerDisplay(formatTime(debateSession.timeLeft));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-800">Debate Sparring Partner - Live Demo</h1>
          <p className="text-slate-600 text-sm mt-1">
            Interactive UI Demo | Smart AI responses | Voice recording simulation | Portfolio showcase
          </p>
          <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full inline-block">
            Demo Mode - Showcasing UI/UX capabilities
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Setup Row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Debate Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Debate Topic
                </label>
                <input
                  type="text"
                  value={debateSession.topic}
                  onChange={(e) => setDebateSession(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the debate resolution..."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Stance
                  </label>
                  <select
                    value={debateSession.stance}
                    onChange={(e) => setDebateSession(prev => ({ ...prev, stance: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="For">For</option>
                    <option value="Against">Against</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Language
                  </label>
                  <select
                    value={debateSession.language}
                    onChange={(e) => setDebateSession(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.keys(LANGUAGE_CODES).map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    AI Voice
                  </label>
                  <select
                    value={debateSession.gender}
                    onChange={(e) => setDebateSession(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Timer and Controls */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Timer & Controls</h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-blue-600 mb-2">
                  {timerDisplay}
                </div>
                <p className="text-sm text-slate-600">Time Remaining</p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={handleStartRound}
                  disabled={debateSession.isActive}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  🚀 Start New Round
                </button>
                
                <button
                  onClick={handleSubmitRound}
                  disabled={!debateSession.isActive || isLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  ✅ Submit Round
                </button>
                
                <button
                  onClick={updateTimer}
                  className="w-full bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300 font-medium transition-colors text-sm"
                >
                  🕒 Check Timer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Debate Interface */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Status and Input */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-slate-800 mb-4">📋 Debate Status</h3>
              <div className="bg-slate-50 rounded-lg p-4 h-48 overflow-y-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                  {statusMessage}
                </pre>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-slate-800 mb-4">✍️ Your Argument</h3>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Present your argument here... (5 minutes to write)"
                className="w-full h-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSubmitRound}
                  disabled={!debateSession.isActive || isLoading || !userInput.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isLoading ? "Processing..." : "Submit Argument"}
                </button>
                
                {!recording ? (
                  <button
                    onClick={startRecording}
                    disabled={isLoading}
                    className="bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300 disabled:opacity-50 font-medium transition-colors"
                  >
                    🎤 Record
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 font-medium transition-colors animate-pulse"
                  >
                    ⏹ Stop
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - AI Response */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-slate-800 mb-4">🤖 AI Counter-Argument</h3>
              <div className="bg-slate-50 rounded-lg p-4 h-48 overflow-y-auto">
                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                  {aiResponse || "AI response will appear here after you submit your argument..."}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-slate-800 mb-4">🎵 AI Audio Response</h3>
              <div className="bg-slate-50 rounded-lg p-4 h-20 flex items-center justify-center">
                {currentAudio ? (
                  <button
                    onClick={() => playAudio(currentAudio)}
                    className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    ▶️ Play Audio
                  </button>
                ) : (
                  <p className="text-slate-500 text-sm">Audio will be available after AI responds</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conversation History */}
        {messages.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-slate-800 mb-4">💬 Conversation History</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-md px-4 py-2 rounded-lg ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}>
                    <div className="text-sm">{message.text}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-75">{message.timestamp}</span>
                      {message.audio && (
                        <button
                          onClick={() => playAudio(message.audio)}
                          className="text-xs hover:underline ml-2"
                        >
                          🔊 Play
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Test Prompts */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
          <details className="cursor-pointer">
            <summary className="font-semibold text-slate-800 mb-4">🧪 Test Prompts & Examples</summary>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-slate-800 mb-2">🤖 AI & Technology:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                  <li>"Artificial intelligence should be heavily regulated by government"</li>
                  <li>"Social media platforms should be liable for user-generated content"</li>
                  <li>"Cryptocurrencies should replace traditional banking systems"</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-slate-800 mb-2">🌍 Social Issues:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                  <li>"Universal basic income should be implemented globally"</li>
                  <li>"Climate change policies should prioritize economic growth"</li>
                  <li>"Private healthcare systems are better than public ones"</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-slate-800 mb-2">How the 3-Round System Works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-4">
                  <li><strong>Round 1 (5 min):</strong> Present your opening arguments</li>
                  <li><strong>Round 2 (5 min):</strong> Respond to AI's counter-arguments and add new points</li>
                  <li><strong>Final:</strong> AI delivers comprehensive closing argument addressing all your points</li>
                </ol>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default App;