export interface Participant {
  id: string;
  name: string;
  baseWeight?: number;
  consecutiveMisses: number;
  lastWonAt?: string;
  eligible?: boolean;
}

export interface EmergencyRequest {
  participantId: string;
  reason: string;
  approved: boolean;
  submittedAt: string;
}

export interface LotteryConfig {
  participants: Participant[];
  emergencyRequests?: EmergencyRequest[];
  emergencySlots?: number;
  guaranteeThreshold?: number; // e.g. 2 or 3 weeks
  guaranteeMaxCount?: number; // usually 2
  historyStore?: HistoryStore;
  drawId?: string;
  drawDate?: string;
}

export interface WinnerEntry {
  participantId: string;
  participantName: string;
  channel: "emergency" | "guarantee" | "lottery";
  rank: number;
}

export interface LotteryHistoryEntry {
  id: string;
  date: string;
  winners: WinnerEntry[];
  missedParticipantIds: string[];
  lateOnlyParticipantIds: string[];
}

export interface LotteryOutcome {
  winners: WinnerEntry[];
  missed: Participant[];
  lateOnly: Participant[];
  historyEntry: LotteryHistoryEntry;
  updatedParticipants: Participant[];
}

export interface HistoryStore {
  read(): LotteryHistoryEntry[];
  write(entries: LotteryHistoryEntry[]): void;
  append(entry: LotteryHistoryEntry): void;
}
