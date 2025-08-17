import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface SubmitWeekCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function SubmitWeekCelebration({ isVisible, onComplete }: SubmitWeekCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'entrance' | 'display' | 'exit'>('entrance');
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Clear all timers
  const clearAllTimers = () => {
    timeoutRefs.current.forEach(timer => clearTimeout(timer));
    timeoutRefs.current = [];
  };

  useEffect(() => {
    if (isVisible && !showCelebration) {
      setShowCelebration(true);
      setAnimationPhase('entrance');

      // Clear any existing timers
      clearAllTimers();

      // Phase 1: Entrance animation (0-500ms)
      const entranceTimer = setTimeout(() => {
        setAnimationPhase('display');
      }, 500);
      timeoutRefs.current.push(entranceTimer);

      // Phase 2: Display phase (500-2500ms = 2 seconds display)
      const displayTimer = setTimeout(() => {
        setAnimationPhase('exit');
      }, 2500);
      timeoutRefs.current.push(displayTimer);

      // Phase 3: Exit animation (2500-3000ms = 500ms exit)
      const exitTimer = setTimeout(() => {
        setShowCelebration(false);
        setAnimationPhase('entrance'); // Reset for next time
        onComplete?.();
      }, 3000);
      timeoutRefs.current.push(exitTimer);
    } else if (!isVisible && showCelebration) {
      // If isVisible becomes false, immediately hide
      clearAllTimers();
      setShowCelebration(false);
      setAnimationPhase('entrance');
      onComplete?.();
    }
  }, [isVisible, showCelebration, onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Generate minimal confetti particles (8-12 particles in brand colors)
  const confettiParticles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    delay: i * 0.03,
    angle: (i * 36) + Math.random() * 20 - 10, // More spread
    distance: 50 + Math.random() * 30,
    color: ['#10b981', '#059669', '#3b82f6', '#2563eb', '#f59e0b'][i % 5], // Green, blue, amber brand colors
    size: Math.random() * 4 + 2, // Variable sizes 2-6px
  }));

  // Main overlay container variants
  const overlayVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  // Success container variants
  const successContainerVariants = {
    hidden: {
      scale: 0.8,
      opacity: 0,
      y: 10,
    },
    visible: {
      scale: [0.8, 1.1, 1.0],
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        times: [0, 0.6, 1],
        ease: "easeOut",
      },
    },
    exit: {
      scale: 0.9,
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  // Checkmark icon variants
  const checkmarkVariants = {
    hidden: {
      scale: 0,
      opacity: 0,
      rotate: -90,
    },
    visible: {
      scale: [0, 1.1, 1],
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        times: [0, 0.7, 1],
        ease: "easeOut",
        delay: 0.1,
      },
    },
  };

  // Subtle background pulse
  const pulseVariants = {
    hidden: { scale: 1, opacity: 0 },
    visible: {
      scale: [1, 1.2, 1.4],
      opacity: [0, 0.1, 0],
      transition: {
        duration: 0.6,
        ease: "easeOut",
        delay: 0.1,
      },
    },
  };

  // Confetti particle variants
  const confettiVariants = {
    hidden: {
      scale: 0,
      opacity: 0,
      x: 0,
      y: 0,
      rotate: 0,
    },
    visible: (custom: any) => ({
      scale: [0, 1, 0.7, 0],
      opacity: [0, 1, 0.6, 0],
      x: [0, Math.cos(custom.angle * Math.PI / 180) * custom.distance],
      y: [0, -Math.sin(custom.angle * Math.PI / 180) * custom.distance * 0.5, Math.sin(custom.angle * Math.PI / 180) * custom.distance],
      rotate: [0, 180, 360],
      transition: {
        duration: 1.2,
        delay: custom.delay + 0.2,
        ease: "easeOut",
      },
    }),
  };

  // Text animation variants
  const textVariants = {
    hidden: {
      opacity: 0,
      y: 15,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        delay: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  };

  // Determine animation state based on phase
  const getAnimationState = () => {
    switch (animationPhase) {
      case 'entrance':
        return 'hidden';
      case 'display':
        return 'visible';
      case 'exit':
        return 'exit';
      default:
        return 'hidden';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showCelebration && (
        <motion.div
          key="celebration-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate={getAnimationState()}
          exit="exit"
          className="fixed inset-0 flex items-start justify-center pointer-events-none z-[1100]"
          role="status"
          aria-live="polite"
          aria-label="Week submitted successfully"
        >
          {/* Success confirmation container - positioned above content */}
          <motion.div
            variants={successContainerVariants}
            className="mt-20 sm:mt-24 mx-4 max-w-sm w-full"
          >
            {/* Main success card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-green-100 p-6 relative overflow-hidden text-center">
              {/* Subtle background pulse */}
              <motion.div
                variants={pulseVariants}
                className="absolute inset-0 bg-green-50 rounded-2xl"
              />

              {/* Success icon container */}
              <div className="relative mb-4 flex justify-center items-center">
                <motion.div
                  variants={checkmarkVariants}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg relative mx-auto"
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>

                {/* Confetti particles emanating from icon */}
                {confettiParticles.map((particle) => (
                  <motion.div
                    key={particle.id}
                    custom={particle}
                    variants={confettiVariants}
                    className="absolute top-8 left-1/2 rounded-full"
                    style={{
                      backgroundColor: particle.color,
                      width: `${particle.size}px`,
                      height: `${particle.size}px`,
                      marginLeft: `-${particle.size / 2}px`,
                    }}
                  />
                ))}
              </div>

              {/* Success message - Perfect text alignment */}
              <motion.div
                variants={textVariants}
                className="relative z-10 text-center w-full flex flex-col items-center justify-center"
              >
                <h3 className="text-xl font-semibold text-green-700 mb-2 text-center w-full">
                  Week Submitted!
                </h3>
                <p className="text-green-600 text-sm text-center w-full">
                  Great work this week 🎉
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to trigger celebration
export function useSubmitCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);

  const triggerCelebration = () => {
    setShowCelebration(true);
  };

  const hideCelebration = () => {
    setShowCelebration(false);
  };

  return {
    showCelebration,
    triggerCelebration,
    hideCelebration,
  };
}
