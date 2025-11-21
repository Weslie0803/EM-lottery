import { Layout, Row, Col, Typography, Divider, message as antdMessage } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ParticipantManager } from "@components/ParticipantManager";
import { LotteryRunner } from "@components/LotteryRunner";
import { HistoryPanel } from "@components/HistoryPanel";
import { ParticipantSelector } from "@components/ParticipantSelector";
import { usePersistentState } from "@hooks/usePersistentState";
import { createHistoryStore, EmergencyRequest, LotteryOutcome, Participant, performLottery, WinnerEntry, updateParticipantStats } from "@core";

const { Header, Content } = Layout;

export default function App() {
  const [status, setStatus] = useState("...");
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsMutating, setParticipantsMutating] = useState(false);
  const [activeParticipantIds, setActiveParticipantIds] = usePersistentState<string[]>("em-active-participants", []);
  const [emergencyRequests, setEmergencyRequests] = usePersistentState<EmergencyRequest[]>("em-emergency", []);
  const [latestOutcome, setLatestOutcome] = useState<LotteryOutcome>();
  const [historyVersion, setHistoryVersion] = useState(0);
  const [lotteryRunning, setLotteryRunning] = useState(false);
  const historyStoreRef = useRef(createHistoryStore());
  const selectionInitializedRef = useRef(false);
  const missingApiWarnedRef = useRef(false);
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const history = useMemo(() => historyStoreRef.current.read(), [historyVersion]);

  const activeParticipants = useMemo(() => {
    const allowSet = new Set(activeParticipantIds);
    return allParticipants.filter(participant => allowSet.has(participant.id));
  }, [allParticipants, activeParticipantIds]);

  useEffect(() => {
    window.electronAPI?.ping().then(setStatus).catch(() => setStatus("main offline"));
  }, []);

  const reloadParticipants = useCallback(async () => {
    if (!window.electronAPI?.participants?.list) {
      if (!missingApiWarnedRef.current) {
        messageApi.warning("未检测到 SQLite 存储，参与者管理不可用。");
        missingApiWarnedRef.current = true;
      }
      setAllParticipants([]);
      return;
    }
    setParticipantsLoading(true);
    try {
      const rows = await window.electronAPI.participants.list();
      setAllParticipants(rows);
    } catch (error) {
      console.error("Failed to load participants", error);
      messageApi.error("读取同学列表失败");
    } finally {
      setParticipantsLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    reloadParticipants();
  }, [reloadParticipants]);

  useEffect(() => {
    if (!allParticipants.length) {
      if (activeParticipantIds.length) {
        setActiveParticipantIds([]);
      }
      selectionInitializedRef.current = false;
      return;
    }

    setActiveParticipantIds(prev => {
      const allowSet = new Set(allParticipants.map(p => p.id));
      const filtered = prev.filter(id => allowSet.has(id));
      if (filtered.length !== prev.length) {
        return filtered;
      }
      if (!filtered.length && !selectionInitializedRef.current) {
        selectionInitializedRef.current = true;
        return allParticipants.filter(p => p.eligible !== false).map(p => p.id);
      }
      return prev;
    });
  }, [allParticipants, activeParticipantIds.length, setActiveParticipantIds]);

  const runParticipantMutation = useCallback(
    async (
      task: (api: NonNullable<NonNullable<typeof window.electronAPI>["participants"]>) => Promise<unknown>,
      successMessage?: string
    ) => {
      const api = window.electronAPI?.participants;
      if (!api) {
        messageApi.error("当前环境未连接 SQLite 存储");
        return;
      }
      setParticipantsMutating(true);
      try {
        await task(api);
        if (successMessage) {
          messageApi.success(successMessage);
        }
        await reloadParticipants();
      } catch (error) {
        console.error("Participant operation failed", error);
        messageApi.error(error instanceof Error ? error.message : "操作失败");
      } finally {
        setParticipantsMutating(false);
      }
    },
    [messageApi, reloadParticipants]
  );

  const handleCreateParticipant = useCallback(
    (values: { name: string; baseWeight: number }) =>
      runParticipantMutation(api => api.create(values), "已添加同学"),
    [runParticipantMutation]
  );

  const handleUpdateParticipant = useCallback(
    (id: string, changes: Partial<Participant>) =>
      runParticipantMutation(api => api.update({ id, changes }), "信息已更新"),
    [runParticipantMutation]
  );

  const handleDeleteParticipant = useCallback(
    (id: string) => runParticipantMutation(api => api.remove(id), "已删除"),
    [runParticipantMutation]
  );

  const handleRunLottery = async (options: {
    emergencySlots: number;
    guaranteeThreshold: number;
    guaranteeMaxCount: number;
    maxWinners: number;
  }) => {
    if (!activeParticipants.length) {
      messageApi.warning("请先在“参与名单选择”中勾选至少一位同学");
      return;
    }

    setLotteryRunning(true);
    const applicableEmergency = emergencyRequests.filter(req => activeParticipantIds.includes(req.participantId));

    try {
      const outcome = performLottery({
        participants: activeParticipants,
        emergencyRequests: applicableEmergency,
        emergencySlots: options.emergencySlots,
        guaranteeThreshold: options.guaranteeThreshold,
        guaranteeMaxCount: options.guaranteeMaxCount,
        historyStore: historyStoreRef.current
      });

      const max = Math.max(1, options.maxWinners);
      const limitedWinners = outcome.winners.slice(0, max);
      const limitedWinnerIds = new Set(limitedWinners.map(w => w.participantId));

      const adjustedUpdatedParticipants = updateParticipantStats(activeParticipants, limitedWinners, outcome.historyEntry.date);

      const adjustedOutcome: LotteryOutcome = {
        ...outcome,
        winners: limitedWinners,
        missed: activeParticipants.filter(p => !limitedWinnerIds.has(p.id)),
        historyEntry: {
          ...outcome.historyEntry,
          winners: limitedWinners
        },
        updatedParticipants: adjustedUpdatedParticipants
      };

      if (window.electronAPI?.participants?.bulkSave) {
        await window.electronAPI.participants.bulkSave(adjustedOutcome.updatedParticipants);
        await reloadParticipants();
      }

      setLatestOutcome(adjustedOutcome);
      setHistoryVersion(version => version + 1);
      setEmergencyRequests(prev =>
        prev.filter(req =>
          !limitedWinners.some(
            (winner: WinnerEntry) => winner.channel === "emergency" && winner.participantId === req.participantId
          )
        )
      );
      messageApi.success(`本轮完毕，抽出 ${limitedWinners.length} 人顺序。`);
    } catch (error) {
      console.error("Failed to run lottery", error);
      messageApi.error(error instanceof Error ? error.message : "摇号失败");
    } finally {
      setLotteryRunning(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
      <Header style={{ background: "#fff" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          EM 实验摇号排班
        </Typography.Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ParticipantSelector
                participants={allParticipants}
                selectedIds={activeParticipantIds}
                onChange={setActiveParticipantIds}
                loading={participantsLoading || participantsMutating}
            />
            <ParticipantManager
              participants={allParticipants}
              loading={participantsLoading || participantsMutating}
              onCreate={handleCreateParticipant}
              onUpdate={handleUpdateParticipant}
              onDelete={handleDeleteParticipant}
            />
          </Col>
          <Col xs={24} lg={12}>
            <LotteryRunner
              participants={activeParticipants}
              emergencyRequests={emergencyRequests.filter(req => activeParticipantIds.includes(req.participantId))}
              latestOutcome={latestOutcome}
              onRun={handleRunLottery}
              isRunning={lotteryRunning}
            />
          </Col>
        </Row>
        <Divider />
        <HistoryPanel history={history} />
      </Content>
    </Layout>
  );
}
