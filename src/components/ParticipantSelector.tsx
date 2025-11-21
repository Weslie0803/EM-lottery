import { Button, Card, Space, Table, Tag, Typography } from "antd";
import { useMemo } from "react";
import type { Participant } from "@core";

interface ParticipantSelectorProps {
  participants: Participant[];
  selectedIds: string[];
  loading?: boolean;
  onChange(ids: string[]): void;
}

export function ParticipantSelector({ participants, selectedIds, loading, onChange }: ParticipantSelectorProps) {
  const dataSource = useMemo(
    () =>
      participants.map(participant => ({
        ...participant,
        key: participant.id,
        baseWeight: participant.baseWeight ?? 1,
        eligible: participant.eligible !== false
      })),
    [participants]
  );

  const selectedCount = selectedIds.length;

  const handleSelectAll = () => onChange(participants.map(p => p.id));
  const handleSelectEligible = () => onChange(participants.filter(p => p.eligible !== false).map(p => p.id));
  const handleClear = () => onChange([]);

  const columns = [
    { title: "姓名", dataIndex: "name" },
    {
      title: "基础权重",
      dataIndex: "baseWeight"
    },
    {
      title: "连续落空",
      dataIndex: "consecutiveMisses"
    },
    {
      title: "状态",
      dataIndex: "eligible",
      render: (value: boolean) => (value ? <Tag color="green">可参与</Tag> : <Tag color="default">暂停</Tag>)
    }
  ];

  return (
    <Card
      title="参与名单选择"
      extra={<Typography.Text>{selectedCount} 人</Typography.Text>}
      style={{ marginBottom: 16 }}
    >
      <Space style={{ marginBottom: 12 }}>
        <Button size="small" onClick={handleSelectAll} disabled={!participants.length}>
          全部加入
        </Button>
        <Button size="small" onClick={handleSelectEligible} disabled={!participants.length}>
          仅可参与
        </Button>
        <Button size="small" onClick={handleClear} disabled={!selectedCount}>
          清空
        </Button>
      </Space>
      <Table
        dataSource={dataSource}
        columns={columns}
        size="small"
        pagination={{ pageSize: 6 }}
        rowSelection={{
          type: "checkbox" as const,
          selectedRowKeys: selectedIds,
          onChange: selectedRowKeys => onChange(selectedRowKeys as string[])
        }}
        loading={loading}
      />
    </Card>
  );
}
