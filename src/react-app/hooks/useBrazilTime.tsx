// Hook for displaying timestamps in Brazil timezone
import { useState, useEffect } from 'react';
import { formatToBrazilTime, formatToBrazilTimeShort, formatToBrazilRelativeTime, isToday } from '../../shared/timezone';

/**
 * Hook that provides Brazil timezone formatted timestamps and auto-updates relative times
 * @param utcTimestamp - UTC timestamp to format
 * @param updateInterval - How often to update relative times (default: 60 seconds)
 * @returns Object with different formatted versions of the timestamp
 */
export function useBrazilTime(utcTimestamp: string | Date | null, updateInterval = 60000) {
  const [, setTick] = useState(0);

  // Update relative times periodically
  useEffect(() => {
    if (!utcTimestamp) return;

    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [utcTimestamp, updateInterval]);

  if (!utcTimestamp) {
    return {
      full: '-',
      short: '-',
      relative: '-',
      dateOnly: '-',
      timeOnly: '-',
      isToday: false
    };
  }

  return {
    full: formatToBrazilTime(utcTimestamp),
    short: formatToBrazilTimeShort(utcTimestamp),
    relative: formatToBrazilRelativeTime(utcTimestamp),
    dateOnly: formatToBrazilTime(utcTimestamp).split(' ')[0], // Extract date part
    timeOnly: formatToBrazilTime(utcTimestamp).split(' ')[1], // Extract time part
    isToday: isToday(utcTimestamp)
  };
}

/**
 * Hook that provides current Brazil time and updates every second
 * @returns Current time formatted in Brazil timezone
 */
export function useCurrentBrazilTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    full: formatToBrazilTime(currentTime),
    short: formatToBrazilTimeShort(currentTime),
    date: currentTime.toLocaleDateString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    time: currentTime.toLocaleTimeString('pt-BR', { 
      timeZone: 'America/Sao_Paulo' 
    })
  };
}
