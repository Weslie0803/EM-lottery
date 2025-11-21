import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { createHistoryStore } from "./historyStore";
import { EmergencyRequest, HistoryStore, LotteryConfig, LotteryHistoryEntry, LotteryOutcome, Participant, WinnerEntry } from "./types";

const defaultHistoryStore = createHistoryStore();

interface WeightedParticipant {
  participant: Participant;
  weight: number;
}

type WinnerWithoutRank = Omit<WinnerEntry, "rank">;

export function calculateTicketCount(participant: Participant): number {
  const base = participant.baseWeight ?? 1;
  const streakFactor = Math.max(1, participant.consecutiveMisses + 1);
  return base * streakFactor * streakFactor;
}

function buildWeightedPool(participants: Participant[]): WeightedParticipant[] {
  return participants.map(participant => ({
    participant,
    weight: calculateTicketCount(participant)
  }));
}

function pickWeighted(participants: WeightedParticipant[]): Participant | undefined {
  const total = participants.reduce((sum, { weight }) => sum + weight, 0);
  if (total <= 0) return undefined;
  let seed = Math.random() * total;
  for (const item of participants) {
    if (seed < item.weight) {
      return item.participant;
    }
    seed -= item.weight;
  }
  return participants.length ? participants[participants.length - 1]?.participant : undefined;
}

function allocateEmergencyWinners(
  requests: EmergencyRequest[] | undefined,
  participants: Participant[],
  capacity: number
) {
  const winners: WinnerWithoutRank[] = [];
  const usedParticipantIds = new Set<string>();
  if (!requests?.length || capacity <= 0) {
    return { winners, remainingCapacity: capacity, usedParticipantIds };
  }

  const approved = requests
    .filter(r => r.approved)
    .sort((a, b) => dayjs(a.submittedAt).valueOf() - dayjs(b.submittedAt).valueOf());

  for (const req of approved) {
    if (winners.length >= capacity) break;
    const participant = participants.find(p => p.id === req.participantId);
    if (!participant || usedParticipantIds.has(participant.id)) continue;
    winners.push({
      participantId: participant.id,
      participantName: participant.name,
      channel: "emergency"
    });
    usedParticipantIds.add(participant.id);
  }

  return { winners, remainingCapacity: Math.max(0, capacity - winners.length), usedParticipantIds };
}

function allocateGuaranteeWinners(
  participants: Participant[],
  capacity: number,
  usedParticipantIds: Set<string>,
  guaranteeThreshold: number,
  guaranteeMaxCount: number
) {
  const winners: WinnerWithoutRank[] = [];
  if (capacity <= 0) {
    return { winners, remainingCapacity: capacity, usedParticipantIds };
  }

  const eligible = participants
    .filter(p => !usedParticipantIds.has(p.id) && p.consecutiveMisses >= guaranteeThreshold)
    .sort((a, b) => b.consecutiveMisses - a.consecutiveMisses)
    .slice(0, Math.min(guaranteeMaxCount, capacity));

  for (const participant of eligible) {
    winners.push({
      participantId: participant.id,
      participantName: participant.name,
      channel: "guarantee"
    });
    usedParticipantIds.add(participant.id);
  }

  return { winners, remainingCapacity: Math.max(0, capacity - winners.length), usedParticipantIds };
}

function runBaseLottery(
  participants: Participant[],
  capacity: number,
  usedParticipantIds: Set<string>
) {
  const winners: WinnerWithoutRank[] = [];
  const pool = buildWeightedPool(participants.filter(p => !usedParticipantIds.has(p.id)));

  while (capacity > 0 && pool.length) {
    const winner = pickWeighted(pool);
    if (!winner) break;
    winners.push({
      participantId: winner.id,
      participantName: winner.name,
      channel: "lottery"
    });
    usedParticipantIds.add(winner.id);
    capacity -= 1;
    const index = pool.findIndex(item => item.participant.id === winner.id);
    if (index >= 0) {
      pool.splice(index, 1);
    }
  }

  const missed = participants.filter(p => !usedParticipantIds.has(p.id));
  return { winners, missed };
}

function withRanks(winners: WinnerWithoutRank[]): WinnerEntry[] {
  return winners.map((winner, index) => ({ ...winner, rank: index + 1 }));
}

function buildHistoryEntry(
  drawId: string,
  drawDate: string,
  winners: WinnerEntry[],
  missed: Participant[],
  lateOnly: Participant[]
): LotteryHistoryEntry {
  return {
    id: drawId,
    date: drawDate,
    winners,
    missedParticipantIds: missed.map(p => p.id),
    lateOnlyParticipantIds: lateOnly.map(p => p.id)
  };
}

export function updateParticipantStats(participants: Participant[], winners: WinnerEntry[], drawDate: string): Participant[] {
  const winnerIds = new Set(winners.map(w => w.participantId));
  return participants.map(p =>
    winnerIds.has(p.id)
      ? {
          ...p,
          consecutiveMisses: 0,
          lastWonAt: drawDate
        }
      : {
          ...p,
          consecutiveMisses: p.consecutiveMisses + 1
        }
  );
}

export function performLottery(config: LotteryConfig): LotteryOutcome {
  const store: HistoryStore = config.historyStore ?? defaultHistoryStore;
  const drawId = config.drawId ?? nanoid(10);
  const drawDate = config.drawDate ?? new Date().toISOString();
  const emergencySlots = Math.max(0, config.emergencySlots ?? 1);
  const guaranteeThreshold = Math.max(1, config.guaranteeThreshold ?? 3);
  const guaranteeMaxCount = Math.max(1, config.guaranteeMaxCount ?? 2);

  const participants = config.participants.filter(p => p.eligible !== false);
  const capacity = participants.length;

  const { winners: emergencyWinners, remainingCapacity: capacityAfterEmergency, usedParticipantIds } = allocateEmergencyWinners(
    config.emergencyRequests,
    participants,
    capacity
  );

  const {
    winners: guaranteeWinners,
    remainingCapacity: capacityAfterGuarantee,
    usedParticipantIds: usedAfterGuarantee
  } = allocateGuaranteeWinners(participants, capacityAfterEmergency, usedParticipantIds, guaranteeThreshold, guaranteeMaxCount);

  const { winners: lotteryWinners, missed } = runBaseLottery(participants, capacityAfterGuarantee, usedAfterGuarantee);

  const orderedWinners = withRanks([...emergencyWinners, ...guaranteeWinners, ...lotteryWinners]);
  const lateOnly: Participant[] = [];
  const historyEntry = buildHistoryEntry(drawId, drawDate, orderedWinners, missed, lateOnly);

  store.append(historyEntry);

  const updatedParticipants = updateParticipantStats(participants, orderedWinners, drawDate);

  return {
    winners: orderedWinners,
    missed,
    lateOnly,
    historyEntry,
    updatedParticipants
  };
}
