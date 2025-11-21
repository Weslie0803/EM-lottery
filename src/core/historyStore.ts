import { LotteryHistoryEntry, HistoryStore } from "./types";

class BrowserHistoryStore implements HistoryStore {
  constructor(private key: string) {}

  read(): LotteryHistoryEntry[] {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return [];
      return JSON.parse(raw) as LotteryHistoryEntry[];
    } catch (error) {
      console.warn("Failed to parse lottery history", error);
      return [];
    }
  }

  write(entries: LotteryHistoryEntry[]): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(this.key, JSON.stringify(entries));
  }

  append(entry: LotteryHistoryEntry): void {
    const current = this.read();
    current.unshift(entry);
    this.write(current.slice(0, 200));
  }
}

class MemoryHistoryStore implements HistoryStore {
  private entries: LotteryHistoryEntry[] = [];

  read(): LotteryHistoryEntry[] {
    return [...this.entries];
  }

  write(entries: LotteryHistoryEntry[]): void {
    this.entries = [...entries];
  }

  append(entry: LotteryHistoryEntry): void {
    this.entries = [entry, ...this.entries].slice(0, 200);
  }
}

export function createHistoryStore(key = "em-lottery-history"): HistoryStore {
  if (typeof window !== "undefined" && window.localStorage) {
    return new BrowserHistoryStore(key);
  }
  return new MemoryHistoryStore();
}
