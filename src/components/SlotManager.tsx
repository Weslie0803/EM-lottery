import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Popconfirm, Switch, Table, Typography } from "antd";
import { useMemo } from "react";
import { Slot } from "@core";

interface SlotManagerProps {
  slots: Slot[];
  onChange(slots: Slot[]): void;
}

export function SlotManager({ slots, onChange }: SlotManagerProps) {
  const [form] = Form.useForm<{ label?: string; start?: number; duration?: number }>();

  const dataSource = useMemo(() => slots.map(slot => ({ ...slot, key: slot.id })), [slots]);

  const handleAdd = async () => {
    const values = await form.validateFields();
    if (values.start == null || values.duration == null) {
      return;
    }
    const startHour = values.start;
    const endHour = startHour + values.duration;
    const autoLabel = `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`;
    const label = values.label?.trim() || autoLabel;
    const start = `${String(startHour).padStart(2, "0")}:00`;
    const end = `${String(endHour).padStart(2, "0")}:00`;
    const isLate = startHour >= 22;
    onChange([
      ...slots,
      {
        id: crypto.randomUUID(),
        label,
        start,
        end,
        isLate
      }
    ]);
    form.resetFields();
  };

  const updateSlot = (id: string, updater: (slot: Slot) => Slot) => {
    onChange(slots.map(slot => (slot.id === id ? updater(slot) : slot)));
  };

  const removeSlot = (id: string) => onChange(slots.filter(slot => slot.id !== id));

  const columns = [
    { title: "时段", dataIndex: "label" },
    { title: "开始", dataIndex: "start" },
    { title: "结束", dataIndex: "end" },
    {
      title: ">=22点?",
      dataIndex: "isLate",
      render: (_: unknown, record: Slot) => (
        <Switch
          checked={!!record.isLate}
          onChange={(checked: boolean) => updateSlot(record.id, prev => ({ ...prev, isLate: checked }))}
        />
      )
    },
    {
      title: "操作",
      dataIndex: "actions",
      render: (_: unknown, record: Slot) => (
        <Popconfirm title="删除该机时?" onConfirm={() => removeSlot(record.id)}>
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <Card title="机时时段" extra={<Typography.Text>{slots.length} 个</Typography.Text>}>
      <Form
        form={form}
        layout="inline"
        initialValues={{ duration: 2 }}
        style={{ flexWrap: "wrap", gap: 12 }}
      >
        <Form.Item name="label" rules={[{ required: true, message: "请输入标签" }]}>
          <Input placeholder="自定义标签(可选)" allowClear />
        </Form.Item>
        <Form.Item name="start" rules={[{ required: true, message: "开始小时" }]}> 
          <InputNumber min={8} max={23} placeholder="起始小时" />
        </Form.Item>
        <Form.Item name="duration" rules={[{ required: true, message: "持续小时" }]}> 
          <InputNumber min={1} max={4} placeholder="持续小时" />
        </Form.Item>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加时段
        </Button>
      </Form>
      <Table
        style={{ marginTop: 16 }}
        dataSource={dataSource}
        columns={columns}
        pagination={{ pageSize: 5 }}
        size="small"
      />
    </Card>
  );
}
