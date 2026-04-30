import { useState, useEffect } from 'react';

const CYCLE_SECONDS = 15 * 60;

function secondsUntilNextCycle(): number {
  const now = new Date();
  const elapsed = (now.getMinutes() % 15) * 60 + now.getSeconds();
  return CYCLE_SECONDS - elapsed;
}

export interface CycleCountdown {
  secondsLeft: number;
  isChecking: boolean;
  countdownLabel: string;
  activePips: number;
}

export function useCycleCountdown(totalPips = 5): CycleCountdown {
  const [secondsLeft, setSecondsLeft] = useState(secondsUntilNextCycle);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsChecking(true);
          setTimeout(() => {
            setIsChecking(false);
            setSecondsLeft(secondsUntilNextCycle());
          }, 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdownLabel = isChecking
    ? 'Checking now…'
    : secondsLeft >= 60
      ? `Next check in ${Math.floor(secondsLeft / 60)}m`
      : `Next check in ${secondsLeft}s`;

  const activePips = isChecking
    ? totalPips
    : Math.ceil(secondsLeft / (CYCLE_SECONDS / totalPips));

  return { secondsLeft, isChecking, countdownLabel, activePips };
}
