import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { Mic, MicOff, Phone, MapPin, Info, Globe, Instagram, Video, MessageCircle, Loader2, Sparkles, Scissors } from 'lucide-react';

import { Booking, ChatMessage, Service } from './types.ts';
import { SERVICES, SALON_NAME, SYSTEM_INSTRUCTION, SALON_WEBSITE, SALON_PHONE, SALON_ADDRESS, SALON_INSTAGRAM, SALON_TIKTOK } from './constants.ts';
import * as AudioUtils from './utils/audioUtils.ts';

import ServicesList from './components/ServicesList.tsx';
import BookingsView from './components/BookingsView.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import Visualizer from './components/Visualizer.tsx';

// --- Function Declarations for Gemini ---
const getServicesDeclaration: FunctionDeclaration = {
  name: "getServices",
  description: "Get a list of all available beauty and aesthetic services and their prices in PKR.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  }
};

const bookAppointmentDeclaration: FunctionDeclaration = {
  name: "bookAppointment",
  description: "Book an appointment for a specific service. Requires customer name, service name, date and time.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceName: { type: Type.STRING, description: "Name of the service (e.g., Hydra Facial)" },
      customerName: { type: Type.STRING, description: "Name of the customer (Female names only)" },
      date: { type: Type.STRING, description: "Date of appointment (e.g., tomorrow, Monday)" },
      time: { type: Type.STRING, description: "Time of appointment (e.g., 2 PM)" },
    },
    required: ["serviceName", "customerName", "date", "time"]
  }
};

const App: React.FC = () => {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [volume, setVolume] = useState(0);

  // --- Refs for Audio & API ---
  const sessionRef = useRef<any>(null); // To store the Active Session
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioStreamActiveRef = useRef<boolean>(false);
  
  // Transcription buffers
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  // --- Splash Screen Effect ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- Helper to execute tools ---
  const handleToolCall = async (functionCall: any) => {
    console.log("Tool Called:", functionCall.name, functionCall.args);
    let result: any = {};

    if (functionCall.name === "getServices") {
      result = { services: SERVICES.map(s => ({ name: s.name, price: s.price })) };
    } 
    else if (functionCall.name === "bookAppointment") {
      const { serviceName, customerName, date, time } = functionCall.args;
      const newBooking: Booking = {
        id: Date.now().toString(),
        serviceId: '0', 
        serviceName: serviceName as string,
        customerName: customerName as string,
        date: date as string,
        time: time as string,
        status: 'confirmed'
      };
      
      // Update React State
      setBookings(prev => [newBooking, ...prev]);
      
      result = { status: "success", message: `Appointment booked for ${customerName} for ${serviceName} on ${date} at ${time}.` };
    }

    // Send response back to model
    if (sessionRef.current) {
        const session = await sessionRef.current;
        session.sendToolResponse({
            functionResponses: {
                id: functionCall.id,
                name: functionCall.name,
                response: { result }
            }
        });
    }
  };

  // --- Connect to Gemini Live ---
  const connectToGemini = async () => {
    if (isConnecting || isActive) return;

    try {
      setIsConnecting(true);
      setError(null);

      if (!process.env.API_KEY) {
        throw new Error("API_KEY not found in environment.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 24000 }); // Output sample rate
      await ctx.resume(); // Ensure context is active
      audioContextRef.current = ctx;
      nextStartTimeRef.current = ctx.currentTime;

      // Input Context for 16kHz capture (Gemini requirement for input is flexible but 16k is standard)
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      await inputCtx.resume();
      
      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }});

      // --- Connect to Live API ---
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [getServicesDeclaration, bookAppointmentDeclaration] }],
          inputAudioTranscription: {}, // Self-transcription for user
          outputAudioTranscription: {}, // Transcription for model
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            setIsActive(true);
            setIsConnecting(false);
            audioStreamActiveRef.current = false;
            
            // Trigger the model to speak first
            // We use a slight delay for the microphone stream to prevent self-interruption
            sessionPromise.then(session => {
                session.send({ parts: [{ text: "The user has connected. Say your greeting now." }] });
            });
            
            // Setup Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume meter
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5)); // Amplify for visual

              // Prevent sending audio immediately to avoid interrupting the greeting
              if (!audioStreamActiveRef.current) return;

              // Convert to PCM 16-bit
              const pcmData = AudioUtils.float32To16BitPCM(inputData);
              const base64Data = AudioUtils.arrayBufferToBase64(pcmData);
              
              sessionPromise.then(session => {
                 session.sendRealtimeInput({
                   media: {
                     mimeType: 'audio/pcm;rate=16000',
                     data: base64Data
                   }
                 });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            
            inputSourceRef.current = source;
            processorRef.current = processor;

            // Enable audio streaming after a short delay (1 second)
            setTimeout(() => {
                audioStreamActiveRef.current = true;
                console.log("Microphone streaming enabled");
            }, 1000);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // 1. Handle Tool Calls
             if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                  await handleToolCall(fc);
                }
             }

             // 2. Handle Audio Output
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData && audioContextRef.current) {
                const actx = audioContextRef.current;
                const audioBuffer = await AudioUtils.decodeAudioData(
                  AudioUtils.base64ToUint8Array(audioData),
                  actx
                );
                
                const source = actx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(actx.destination);
                
                // Queueing logic
                const startTime = Math.max(actx.currentTime, nextStartTimeRef.current);
                source.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                
                source.onended = () => {
                   sourcesRef.current.delete(source);
                };
                sourcesRef.current.add(source);
             }

             // 3. Handle Transcriptions
             if (msg.serverContent?.inputTranscription) {
               currentInputTransRef.current += msg.serverContent.inputTranscription.text;
             }
             if (msg.serverContent?.outputTranscription) {
               currentOutputTransRef.current += msg.serverContent.outputTranscription.text;
             }

             if (msg.serverContent?.turnComplete) {
                // Flush transcripts to UI
                if (currentInputTransRef.current.trim()) {
                  setMessages(prev => [...prev, {
                    id: Date.now().toString() + 'u',
                    role: 'user',
                    text: currentInputTransRef.current,
                    timestamp: new Date()
                  }]);
                  currentInputTransRef.current = '';
                }
                if (currentOutputTransRef.current.trim()) {
                   setMessages(prev => [...prev, {
                    id: Date.now().toString() + 'm',
                    role: 'model',
                    text: currentOutputTransRef.current,
                    timestamp: new Date()
                  }]);
                   currentOutputTransRef.current = '';
                }
             }
             
             // Handle Interruption
             if (msg.serverContent?.interrupted) {
                console.log("Interrupted!");
                // Stop all playing audio
                sourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e){}
                });
                sourcesRef.current.clear();
                if (audioContextRef.current) {
                    nextStartTimeRef.current = audioContextRef.current.currentTime;
                }
                currentOutputTransRef.current = ''; // Clear stale model text
             }
          },
          onclose: () => {
            console.log("Session closed");
            disconnect();
          },
          onerror: (err: any) => {
            console.error(err);
            setError(err.message || "Connection error. Please refresh.");
            disconnect();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to connect");
      disconnect();
    }
  };

  const disconnect = () => {
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
    audioStreamActiveRef.current = false;
    
    // Stop Microphone
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }

    // Stop Audio Context
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
  };

  const toggleConnection = () => {
    if (isActive) {
      disconnect();
    } else {
      connectToGemini();
    }
  };

  // --- Render Splash Screen ---
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative mb-8 transform scale-125">
          <div className="absolute inset-0 bg-glam-rose/20 rounded-full animate-ping blur-xl"></div>
          <div className="w-24 h-24 bg-gradient-to-br from-glam-rose to-pink-600 rounded-full flex items-center justify-center shadow-2xl relative z-10">
            <Scissors className="w-10 h-10 text-white transform -rotate-45" />
          </div>
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-8 h-8 text-glam-gold animate-bounce" />
          </div>
        </div>
        
        <h1 className="text-4xl font-serif font-bold text-glam-dark mb-3 tracking-wide drop-shadow-sm">
          GLAM SALON
        </h1>
        <p className="text-glam-rose font-medium tracking-[0.2em] text-sm uppercase mb-12">
          & Aesthetics
        </p>

        <div className="flex items-center gap-3 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
          <Loader2 className="w-4 h-4 animate-spin text-glam-rose" />
          <span>Initializing Aleeza AI...</span>
        </div>
      </div>
    );
  }

  // --- Render Main App ---
  return (
    <div className="min-h-screen font-sans text-gray-800 bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-glam-pink shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-glam-dark tracking-wide truncate">
              GLAM SALON <span className="text-glam-rose">& AESTHETICS</span>
            </h1>
            <div className="flex items-center text-xs text-gray-500 gap-1">
              <MapPin className="w-3 h-3" />
              <span>{SALON_ADDRESS}</span>
            </div>
          </div>
          <div className="bg-glam-rose/10 text-glam-rose px-3 py-1 rounded-full text-xs font-bold tracking-wider border border-glam-rose/20 whitespace-nowrap">
            WOMEN ONLY
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Col: Services (Hidden on small mobile if needed, or stacked) */}
        <div className="hidden md:block md:col-span-3 h-[calc(100vh-6rem)]">
          <ServicesList />
        </div>

        {/* Center Col: Voice Interface */}
        <div className="col-span-1 md:col-span-6 flex flex-col gap-6">
          
          {/* Status Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-glam-pink text-center relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-glam-gold via-glam-rose to-glam-gold"></div>
             
             <h2 className="text-2xl font-serif font-bold mb-2 text-glam-dark">Virtual Receptionist</h2>
             <p className="text-glam-rose mb-8 font-serif text-xl font-bold">Tap the mic to start talking</p>

             <div className="flex justify-center mb-8 relative">
                {/* Pulse Effect */}
                {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-24 h-24 bg-glam-rose/20 rounded-full animate-ping"></div>
                        <div className="w-32 h-32 bg-glam-rose/10 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                    </div>
                )}
                
                <button
                  onClick={toggleConnection}
                  disabled={isConnecting}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isActive 
                      ? 'bg-white text-glam-rose border-2 border-glam-rose scale-110' 
                      : isConnecting 
                        ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-wait'
                        : 'bg-glam-rose text-white shadow-xl shadow-glam-rose/40 animate-pulse scale-105'
                  }`}
                >
                  {isConnecting ? (
                    <Loader2 className="w-8 h-8 animate-spin text-glam-rose" />
                  ) : isActive ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
             </div>

             <div className="min-h-[3rem] flex items-center justify-center">
                 {isConnecting ? (
                     <span className="text-sm font-bold text-glam-rose animate-pulse uppercase tracking-widest">Connecting...</span>
                 ) : isActive ? (
                     <Visualizer isActive={isActive} volume={volume} />
                 ) : (
                     <div className="flex flex-col items-center gap-1">
                        <span className="font-urdu text-xl font-bold text-gray-800 leading-relaxed">بات کرنے کے لیے یہاں دبائیں</span>
                        <span className="text-[10px] font-bold text-glam-rose uppercase tracking-widest">Click the mic to talk Aleeza</span>
                     </div>
                 )}
             </div>

             {error && (
                 <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 shadow-sm flex items-center justify-center gap-2 font-medium">
                    <Info className="w-4 h-4 shrink-0"/> 
                    <span>{error}</span>
                 </div>
             )}
          </div>

          {/* Transcript Area */}
          <div className="flex-1 min-h-[300px]">
             <ChatInterface messages={messages} onConnect={connectToGemini} />
          </div>

        </div>

        {/* Right Col: Bookings */}
        <div className="col-span-1 md:col-span-3 h-full md:h-[calc(100vh-6rem)]">
          <BookingsView bookings={bookings} />
        </div>
        
        {/* Mobile Services Toggle (Stacked at bottom for mobile) */}
        <div className="md:hidden col-span-1 mt-6">
            <ServicesList />
        </div>

      </main>

      <footer className="bg-white border-t border-gray-100 py-6 text-center text-gray-400 text-sm">
        <p className="mb-4">&copy; 2024 {SALON_NAME}. All rights reserved.</p>
        
        {/* Links Grid - Flexbox for better handling of 5 items */}
        <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto px-4">
            
            {/* Phone */}
            <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-glam-rose" />
                <span>{SALON_PHONE}</span>
            </div>

             {/* WhatsApp */}
            <a href={`https://wa.me/923065105000`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-green-500 hover:underline">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <span>WhatsApp</span>
            </a>

            {/* Website */}
            <a href={`https://${SALON_WEBSITE}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-glam-rose hover:underline">
                <Globe className="w-4 h-4 text-glam-rose" />
                <span className="truncate max-w-[120px]">Website</span>
            </a>

            {/* Instagram */}
            <a href={`https://instagram.com/${SALON_INSTAGRAM.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-glam-rose hover:underline">
                <Instagram className="w-4 h-4 text-glam-rose" />
                <span>Instagram</span>
            </a>

            {/* TikTok */}
            <a href={`https://tiktok.com/${SALON_TIKTOK}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-glam-rose hover:underline">
                <Video className="w-4 h-4 text-glam-rose" />
                <span>TikTok</span>
            </a>
        </div>
      </footer>
    </div>
  );
};

export default App;