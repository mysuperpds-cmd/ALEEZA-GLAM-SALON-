import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types.ts';
import { Sparkles, MessageCircleHeart, Wand2 } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onConnect?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onConnect }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[300px] md:h-full bg-gray-50 rounded-2xl p-4 border border-gray-200 overflow-hidden relative">
      <div className="overflow-y-auto flex-1 space-y-4 pr-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-5 opacity-90">
            
            {/* Visual Icon/Logo */}
            <div className="relative">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-glam-pink z-10 relative">
                    <Sparkles className="w-10 h-10 text-glam-rose animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-glam-rose/10 blur-xl rounded-full"></div>
            </div>

            {/* Main Welcome Text */}
            <div className="space-y-1">
                 <h3 className="font-serif text-2xl font-bold text-glam-dark">Welcome to Glam Salon & Aesthetics Gujrat</h3>
                 <p className="font-sans text-lg text-glam-rose font-medium">I'm Aleeza, your AI assistant</p>
            </div>

            {/* Subtext / Info */}
            <div className="text-sm text-gray-500 max-w-[250px] mx-auto leading-relaxed flex flex-col items-center">
                <p className="mb-1">Ask me about <span className="font-bold text-glam-dark">Hair, Makeup & Aesthetics</span> services.</p>
                
                {/* Instant Booking Button */}
                <button 
                    onClick={onConnect}
                    className="flex items-center justify-center gap-2 text-xs bg-white py-2 px-4 rounded-full shadow-md border-2 border-glam-rose/20 mt-3 animate-pulse hover:animate-none hover:scale-105 hover:border-glam-rose transition-all cursor-pointer group"
                >
                    <Wand2 className="w-4 h-4 text-glam-gold group-hover:rotate-12 transition-transform" />
                    <span className="font-bold text-glam-rose tracking-wide">Instant Booking Available</span>
                </button>
            </div>

            {/* Call to Action */}
            <div className="bg-white border-2 border-dashed border-glam-rose/30 rounded-xl p-3 w-full max-w-[280px]">
                 <p className="font-serif text-lg text-gray-800 font-bold mb-1">Tap the mic to start</p>
                 <div className="flex items-center justify-center gap-2 text-xs text-glam-rose font-bold uppercase tracking-wide">
                    <MessageCircleHeart className="w-3 h-3" />
                    <span>Or type your query</span>
                 </div>
            </div>

          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-glam-rose text-white rounded-tr-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
              }`}
            >
              <p className={msg.text.match(/[\u0600-\u06FF]/) ? "font-urdu text-right leading-loose text-base" : "font-sans"}>
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ChatInterface;
