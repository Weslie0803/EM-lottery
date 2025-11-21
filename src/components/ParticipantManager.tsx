import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Popconfirm, Switch, Table, Typography } from "antd";
import { useMemo, useState } from "react";
import { Participant } from "@core";

interface ParticipantManagerProps {
  participants: Participant[];
  loading?: boolean;
  onCreate(values: { name: string; baseWeight: number }): Promise<void>;
  onUpdate(id: string, changes: Partial<Participant>): Promise<void>;
  onDelete(id: string): Promise<void>;
}

export function ParticipantManager({ participants, loading, onCreate, onUpdate, onDelete }: ParticipantManagerProps) {
  const [form] = Form.useForm<{ name: string; baseWeight: number }>();
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dataSource = useMemo(() => participants.map(p => ({ ...p, key: p.id })), [participants]);

  const handleAdd = async () => {
    const values = await form.validateFields();
    try {
      setSubmitting(true);
      await onCreate({
        name: values.name.trim(),
        baseWeight: values.baseWeight
      });
      form.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = (id: string, changes: Partial<Participant>) => {
    onUpdate(id, changes).catch(err => {
      console.error("Failed to update participant", err);
    });
  };

  const handleRemove = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
    } finally {
      setDeletingId(current => (current === id ? null : current));
    }
  };

  const columns = [
    {
      title: "姓名",
      dataIndex: "name"
    },
    {
      title: "基础权重",
      dataIndex: "baseWeight",
      render: (_: number, record: Participant) => (
        <InputNumber
          min={1}
          value={record.baseWeight ?? 1}
          onChange={(value: number | null) => handleUpdate(record.id, { baseWeight: value ?? 1 })}
        />
      )
    },
    {
      title: "连续落空周",
      dataIndex: "consecutiveMisses",
      render: (_: number, record: Participant) => (
        <InputNumber
          min={0}
          value={record.consecutiveMisses}
          onChange={(value: number | null) => handleUpdate(record.id, { consecutiveMisses: Math.max(0, value ?? 0) })}
        />
      )
    },
    {
      title: "可参与",
      dataIndex: "eligible",
      render: (_: boolean, record: Participant) => (
        <Switch
          checked={record.eligible !== false}
          onChange={(checked: boolean) => handleUpdate(record.id, { eligible: checked })}
        />
      )
    },
    {
      title: "最近中签",
      dataIndex: "lastWonAt",
      render: (value?: string) => (value ? new Date(value).toLocaleDateString() : "-")
    },
    {
      title: "操作",
      dataIndex: "actions",
      render: (_: unknown, record: Participant) => (
        <Popconfirm
          title="删除该同学?"
          onConfirm={() => handleRemove(record.id)}
          okButtonProps={{ loading: deletingId === record.id }}
        >
          <Button type="link" danger disabled={loading}>
            删除
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <Card title="参与同学" extra={<Typography.Text>{participants.length} 人</Typography.Text>}>
      <Form form={form} layout="inline" initialValues={{ baseWeight: 1 }}>
        <Form.Item
          name="name"
          rules={[{ required: true, message: "请输入姓名" }]}
        >
          <Input placeholder="姓名" allowClear />
        </Form.Item>
        <Form.Item name="baseWeight" rules={[{ required: true }]}> 
          <InputNumber min={1} placeholder="基础权重" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={submitting}
            disabled={loading}
            onClick={handleAdd}
          >
            添加
          </Button>
        </Form.Item>
      </Form>
      <Table
        style={{ marginTop: 16 }}
        dataSource={dataSource}
        columns={columns}
        pagination={{ pageSize: 5 }}
        size="small"
        loading={loading}
      />
    </Card>
  );
}
