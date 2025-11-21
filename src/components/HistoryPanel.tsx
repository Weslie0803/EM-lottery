import { Card, Collapse, List, Tag, Typography } from "antd";
import { LotteryHistoryEntry, WinnerEntry } from "@core";

interface HistoryPanelProps {
  history: LotteryHistoryEntry[];
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  const items = history.map(entry => {
    const winners = entry.winners ?? [];

    return {
    key: entry.id,
    label: `${new Date(entry.date).toLocaleString()} · ${winners.length} 人中签`,
    children: (
      <div>
        <Typography.Paragraph>
          <strong>通道结果：</strong>
        </Typography.Paragraph>
        <List
          dataSource={winners}
          renderItem={(item: WinnerEntry) => (
            <List.Item>
              <span style={{ width: 56 }}>{item.rank}.</span>
              <Tag color={item.channel === "lottery" ? "green" : item.channel === "guarantee" ? "gold" : "red"}>
                {item.channel}
              </Tag>
              {item.participantName}
            </List.Item>
          )}
        />
        <Typography.Paragraph style={{ marginTop: 16 }}>
          <strong>未中签：</strong>
          {entry.missedParticipantIds.length ? `${entry.missedParticipantIds.length} 人` : "无"}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <strong>仅剩22点后场：</strong>
          {entry.lateOnlyParticipantIds.length ? `${entry.lateOnlyParticipantIds.length} 人` : "无"}
        </Typography.Paragraph>
      </div>
    )};
  });

  return (
    <Card title="历史记录" extra={`${history.length} 轮`}>
      <Collapse accordion items={items} />
    </Card>
  );
}
