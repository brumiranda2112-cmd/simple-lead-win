import { useEffect, useRef, useCallback } from 'react';
import * as storage from '@/lib/storage';
import { Task } from '@/types/crm';

const NOTIFIED_KEY = 'crm_notified_tasks';
const CHECK_INTERVAL = 30_000; // 30s
const ALERT_WINDOW_MINUTES = 15; // notify 15min before

function getNotified(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]'));
  } catch { return new Set(); }
}

function markNotified(id: string) {
  const set = getNotified();
  set.add(id);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
}

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    // Two-tone alert
    [520, 680].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.3);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.3);
    });
  } catch { /* silent fail */ }
}

export function useTaskNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const checkTasks = useCallback(() => {
    const tasks = storage.getTasks();
    const now = Date.now();
    const notified = getNotified();

    tasks.forEach((task: Task) => {
      if (task.completed || notified.has(task.id)) return;

      const dueTime = new Date(task.dueDate).getTime();
      const diffMin = (dueTime - now) / 60_000;

      // Notify if within alert window (0 to ALERT_WINDOW_MINUTES before)
      // Also notify if overdue by up to 5 minutes (just missed)
      if (diffMin <= ALERT_WINDOW_MINUTES && diffMin >= -5) {
        markNotified(task.id);
        playAlertSound();

        const timeLabel = diffMin <= 0
          ? 'agora!'
          : `em ${Math.round(diffMin)} minutos`;

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`⏰ Tarefa: ${task.title}`, {
            body: `Agendada para ${timeLabel}`,
            icon: '/favicon.ico',
            tag: task.id,
          });
        }
      }
    });
  }, []);

  useEffect(() => {
    requestPermission();
    checkTasks();
    intervalRef.current = setInterval(checkTasks, CHECK_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkTasks, requestPermission]);
}
