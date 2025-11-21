import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Popconfirm, Select, Switch, Table } from "antd";
import { useMemo } from "react";
import { EmergencyRequest, Participant } from "@core";

interface EmergencyPanelProps {
  participants: Participant[];
  requests: EmergencyRequest[];
  onChange(requests: EmergencyRequest[]): void;
  allowedParticipantIds?: string[];
}

export function EmergencyPanel({ participants, requests, onChange, allowedParticipantIds }: EmergencyPanelProps) {
  const [form] = Form.useForm<{ participantId?: string; reason?: string }>();

  const selectableParticipants = useMemo(() => {
    if (!allowedParticipantIds?.length) {
      return participants;
    }
    const allowSet = new Set(allowedParticipantIds);
    return participants.filter(p => allowSet.has(p.id));
  }, [allowedParticipantIds, participants]);

  const dataSource = useMemo(() => requests.map(r => ({ ...r, key: r.participantId + r.submittedAt })), [requests]);

  const handleAdd = async () => {
    const values = await form.validateFields();
    const participant = participants.find(p => p.id === values.participantId);
    if (!participant) return;
    onChange([
      ...requests,
      {
        participantId: participant.id,
        reason: values.reason ?? "",
        approved: false,
        submittedAt: new Date().toISOString()
      }
    ]);
    form.resetFields();
  };

  const updateRequest = (participantId: string, updater: (request: EmergencyRequest) => EmergencyRequest) => {
    onChange(requests.map(req => (req.participantId === participantId ? updater(req) : req)));
  };

  const remove = (participantId: string) => onChange(requests.filter(req => req.participantId !== participantId));

  const columns = [
    {
      title: "同学",
      dataIndex: "participantId",
      render: (value: string) => participants.find(p => p.id === value)?.name ?? value
    },
    {
      title: "理由",
      dataIndex: "reason"
    },
    {
      title: "审核通过",
      dataIndex: "approved",
      render: (_: unknown, record: EmergencyRequest) => (
        <Switch
          checked={record.approved}
          onChange={(checked: boolean) => updateRequest(record.participantId, prev => ({ ...prev, approved: checked }))}
        />
      )
    },
    {
      title: "提交时间",
      dataIndex: "submittedAt",
      render: (value: string) => new Date(value).toLocaleString()
    },
    {
      title: "操作",
      dataIndex: "actions",
      render: (_: unknown, record: EmergencyRequest) => (
        <Popconfirm title="移除此申请?" onConfirm={() => remove(record.participantId)}>
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <Card title="紧急通道申请" extra={`${requests.length} 条`}>
      <Form form={form} layout="inline" style={{ flexWrap: "wrap", gap: 12 }}>
        <Form.Item name="participantId" rules={[{ required: true, message: "请选择同学" }]}> 
          <Select style={{ minWidth: 200 }} placeholder="选择同学">
            {selectableParticipants.map(p => (
              <Select.Option value={p.id} key={p.id}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="reason" rules={[{ required: true, message: "填写申请理由" }]}> 
          <Input placeholder="紧急原因" allowClear />
        </Form.Item>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加申请
        </Button>
      </Form>
      <Table style={{ marginTop: 16 }} dataSource={dataSource} columns={columns} pagination={false} size="small" />
    </Card>
  );
}
