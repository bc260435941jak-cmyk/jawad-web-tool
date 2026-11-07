// Real-time Notification System using Web Notifications API and In-App Toasts

export type NotificationType = 'signal' | 'alert' | 'trade' | 'risk';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
  symbol?: string;
}

class NotificationManager {
  private listeners: ((notification: AppNotification) => void)[] = [];
  private notificationsHistory: AppNotification[] = [];

  constructor() {
    // Load history from localStorage if available
    try {
      const saved = localStorage.getItem('obsidian_notifications');
      if (saved) {
        this.notificationsHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load notifications history', e);
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  public subscribe(listener: (notification: AppNotification) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getHistory(): AppNotification[] {
    return this.notificationsHistory;
  }

  public clearHistory() {
    this.notificationsHistory = [];
    this.saveToStorage();
    this.notifyListeners({
      id: Date.now().toString(),
      title: 'Cleared',
      message: 'Notification history cleared',
      type: 'alert',
      timestamp: Date.now(),
      read: true,
    });
  }

  private saveToStorage() {
    try {
      localStorage.setItem('obsidian_notifications', JSON.stringify(this.notificationsHistory.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }

  private notifyListeners(notif: AppNotification) {
    this.listeners.forEach((l) => l(notif));
  }

  private playBeep(type: 'signal' | 'alert' | 'success' | 'danger') {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type === 'success' ? 'triangle' : type === 'danger' ? 'sawtooth' : 'sine';
      
      if (type === 'signal') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      } else if (type === 'danger') {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15); // E3
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      }

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  }

  public trigger({
    title,
    message,
    type = 'alert',
    symbol,
  }: {
    title: string;
    message: string;
    type?: NotificationType;
    symbol?: string;
  }) {
    const newNotif: AppNotification = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
      symbol,
    };

    this.notificationsHistory = [newNotif, ...this.notificationsHistory];
    this.saveToStorage();
    this.notifyListeners(newNotif);

    // Play sound alert
    if (type === 'signal') {
      this.playBeep('signal');
    } else if (type === 'trade') {
      this.playBeep('success');
    } else if (type === 'risk') {
      this.playBeep('danger');
    } else {
      this.playBeep('alert');
    }

    // Trigger Web Notification API if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          tag: 'obsidian-quant',
        });
      } catch (err) {
        console.error('Error triggering browser notification:', err);
      }
    }
  }

  public notifySignal(symbol: string, direction: 'CALL' | 'PUT' | 'BUY' | 'SELL', confidence: number, price: number) {
    const isCallBuy = direction === 'CALL' || direction === 'BUY';
    const title = `🚨 AI Signal: ${direction} on ${symbol}`;
    const message = `Confidence: ${confidence.toFixed(1)}% | Execution Price: ${price.toFixed(5)} | Recommended action: ${direction}`;
    this.trigger({
      title,
      message,
      type: 'signal',
      symbol,
    });
  }

  public notifyMarketAlert(title: string, message: string, symbol?: string) {
    this.trigger({
      title: `📊 Market Alert: ${title}`,
      message,
      type: 'alert',
      symbol,
    });
  }

  public notifyTradeResult(symbol: string, pnl: number, isWin: boolean) {
    const title = isWin ? `✅ Trade Won: +$${pnl.toFixed(2)}` : `❌ Trade Closed: -$${Math.abs(pnl).toFixed(2)}`;
    const message = `Symbol: ${symbol} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
    this.trigger({
      title,
      message,
      type: 'trade',
      symbol,
    });
  }

  public notifyRiskWarning(title: string, message: string) {
    this.trigger({
      title: `⚠️ Risk Warning: ${title}`,
      message,
      type: 'risk',
    });
  }
}

export const notifications = new NotificationManager();
