import { Button, Card, Col, Dropdown, message, Row, Space, Tag, Typography } from "antd";
import { useMemo } from "react";
import type { Participant } from "@core";
import type { MenuProps } from "antd";

interface ParticipantSelectorProps {
  participants: Participant[];
  selectedIds: string[];
  loading?: boolean;
  onChange(ids: string[]): void;
}



export function ParticipantSelector({ participants, selectedIds, loading, onChange }: ParticipantSelectorProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedParticipants = useMemo(
    () =>
      participants
        .filter(p => selectedSet.has(p.id))
        .map(participant => ({
          ...participant,
          baseWeight: participant.baseWeight ?? 1,
          eligible: participant.eligible !== false
        })),
    [participants, selectedSet]
  );
  const [messageApi, contextHolder] = message.useMessage();

  const selectedCount = selectedParticipants.length;

  const handleSelectAll = () => onChange(participants.map(p => p.id));
  const handleSelectEligible = () => onChange(participants.filter(p => p.eligible !== false).map(p => p.id));
  const handleClear = () => onChange([]);
  const handleAddParticipant = () => {
    const remaining = participants.filter(p => !selectedSet.has(p.id));
    if (remaining.length === 0) {
        messageApi.warning("没有更多可添加的参与者了！");
        return;
    }
  }
  const items: MenuProps["items"] = 
    participants.filter(p => !selectedSet.has(p.id)).map(p => ({
      key: p.id,
      label: p.name,
      onClick: () => onChange([...selectedIds, p.id])
    }));

  return (
    <Card
      title="参与名单选择"
      extra={<Typography.Text>{selectedCount} 人</Typography.Text>}
      style={{ marginBottom: 16 }}
    >
      {contextHolder}
      <Space style={{ marginBottom: 12 }}>
        <Button size="small" onClick={handleSelectAll} disabled={!participants.length}>
          全部加入
        </Button>
        <Button size="small" onClick={handleSelectEligible} disabled={!participants.length}>
          仅可参与
        </Button>
        <Dropdown menu={{items}} trigger={['hover']}>
          <Button size="small" onClick={handleAddParticipant} disabled={!participants.length}>
            添加
          </Button>
        </Dropdown>
        <Button size="small" onClick={handleClear} disabled={!selectedCount}>
          清空
        </Button>
      </Space>
      {loading ? (
        <Typography.Text>加载中...</Typography.Text>
      ) : selectedParticipants.length === 0 ? (
        <Typography.Text type="secondary">当前参与名单为空，请通过按钮选择需要参与本轮的同学。</Typography.Text>
      ) : (
        <Row gutter={[12, 12]}>
          {selectedParticipants.map(participant => (
            <Col xs={24} sm={12} key={participant.id}>
              <Card size="small" bordered>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Typography.Text strong>{participant.name}</Typography.Text>
                    <Tag color={participant.eligible ? "green" : "default"}>
                      {participant.eligible ? "可参与" : "暂停"}
                    </Tag>
                    <Button size="small" danger onClick={() => onChange(selectedIds.filter(id => id !== participant.id))}>
                        移除
                    </Button>
                  </Space>
                  <Typography.Text type="secondary">
                    基础权重：{participant.baseWeight}，连续落空：{participant.consecutiveMisses}
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
}
