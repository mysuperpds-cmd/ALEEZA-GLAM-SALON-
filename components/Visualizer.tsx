import React from 'react';

interface VisualizerProps {
  isActive: boolean;
  volume: number; // 0 to 1
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, volume }) => {
  // Normalize volume for visual effect
  const bars = 5;
  
  return (
    <div className="flex items-center justify-center space-x-1 h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const height = isActive 
          ? Math.max(10, Math.min(100, volume * 300 * (Math.random() + 0.5))) 
          : 4;
        
        return (
          <div
            key={i}
            className="w-2 bg-glam-rose rounded-full transition-all duration-75 ease-in-out opacity-80"
            style={{
              height: `${height}%`,
              animation: isActive ? `pulse ${0.5 + i * 0.1}s infinite` : 'none'
            }}
          />
        );
      })}
    </div>
  );
};

export default Visualizer;
