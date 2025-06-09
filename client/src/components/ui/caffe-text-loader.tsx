import { useState, useEffect } from 'react';

interface CAFFETextLoaderProps {
  onComplete?: () => void;
}

export default function CAFFETextLoader({ onComplete }: CAFFETextLoaderProps) {
  const [loadedLetters, setLoadedLetters] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const caffeText = "CAFFE";

  useEffect(() => {
    // Simulate realistic loading progress
    const loadingSteps = [
      { delay: 200, letters: 1 }, // C
      { delay: 150, letters: 2 }, // A
      { delay: 180, letters: 3 }, // F
      { delay: 120, letters: 4 }, // F
      { delay: 160, letters: 5 }, // E
    ];

    let timeoutId: NodeJS.Timeout;
    let currentStep = 0;

    const loadNextLetter = () => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        timeoutId = setTimeout(() => {
          setLoadedLetters(step.letters);
          currentStep++;
          if (currentStep < loadingSteps.length) {
            loadNextLetter();
          } else {
            // Complete loading
            setTimeout(() => {
              setIsComplete(true);
              onComplete?.();
            }, 300);
          }
        }, step.delay);
      }
    };

    loadNextLetter();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <div className="text-center space-y-8">
        {/* CAFFE Logo Animation */}
        <div className="relative">
          <div className="text-6xl font-bold tracking-wider">
            {caffeText.split('').map((letter, index) => (
              <span
                key={index}
                className={`inline-block transition-all duration-500 ${
                  index < loadedLetters
                    ? 'text-blue-600 transform scale-110 opacity-100'
                    : 'text-gray-300 opacity-40'
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  transform: index < loadedLetters ? 'translateY(-10px)' : 'translateY(0)',
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          
          {/* Underline animation */}
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ 
                width: `${(loadedLetters / caffeText.length) * 100}%`,
                transition: 'width 0.3s ease-out'
              }}
            />
          </div>
        </div>

        {/* Electoral Observer subtitle */}
        <div className={`transition-all duration-500 ${loadedLetters >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-xl font-semibold text-gray-800">Electoral Observer Platform</h2>
          <p className="text-gray-600 mt-2">Securing Democracy Through Technology</p>
        </div>

        {/* Loading dots */}
        <div className={`flex justify-center space-x-1 transition-all duration-500 ${loadedLetters >= 4 ? 'opacity-100' : 'opacity-0'}`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        {/* Jamaica context */}
        <div className={`text-sm text-gray-500 transition-all duration-500 ${isComplete ? 'opacity-100' : 'opacity-0'}`}>
          <p>Empowering Jamaica's Democratic Process</p>
        </div>
      </div>
    </div>
  );
}