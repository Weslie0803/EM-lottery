import { PlayCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Descriptions, Form, InputNumber, Row, Table, Tag, Typography } from "antd";
import { LotteryOutcome, Participant, Slot, EmergencyRequest, WinnerEntry } from "@core";

interface RunOptions {
  emergencySlots: number;
  guaranteeThreshold: number;
  guaranteeMaxCount: number;
  maxWinners: number;
}

interface LotteryRunnerProps {
  participants: Participant[];
  slots: Slot[];
  emergencyRequests: EmergencyRequest[];
  latestOutcome?: LotteryOutcome;
  onRun(options: RunOptions): void | Promise<void>;
  isRunning?: boolean;
}

export function LotteryRunner({ participants, slots, emergencyRequests, latestOutcome, onRun, isRunning }: LotteryRunnerProps) {
  const [form] = Form.useForm<RunOptions>();
  const disabled = !participants.length || !slots.length;

  const winnerColumns = [
    { title: "顺位", dataIndex: "rank", width: 80 },
    { title: "同学", dataIndex: "participantName" },
    {
      title: "通道",
      dataIndex: "channel",
      render: (channel: string) => {
        const labelMap: Record<string, string> = {
          emergency: "紧急",
          guarantee: "保底",
          lottery: "摇号"
        };
        const colorMap: Record<string, string> = {
          emergency: "red",
          guarantee: "gold",
          lottery: "green"
        };
        return <Tag color={colorMap[channel] ?? "blue"}>{labelMap[channel] ?? channel}</Tag>;
      }
    }
  ];

  return (
    <Card title="14:00 摇号机" extra={<Typography.Text>{slots.length} 个机时</Typography.Text>}>
      <Alert
        type="info"
        message="每次摇号仅允许同一位同学中一次，紧急通道优先于保底，保底优先于普通摇号。"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form
        form={form}
        layout="inline"
        initialValues={{ emergencySlots: 1, guaranteeThreshold: 3, guaranteeMaxCount: 2, maxWinners: slots.length || 1 }}
        style={{ flexWrap: "wrap", gap: 12 }}
      >
        <Form.Item label="紧急名额" name="emergencySlots" rules={[{ required: true }]}> 
          <InputNumber min={0} max={slots.length} />
        </Form.Item>
        <Form.Item label="保底阈值" name="guaranteeThreshold" rules={[{ required: true }]}> 
          <InputNumber min={1} max={8} />
        </Form.Item>
        <Form.Item label="单轮保底人数" name="guaranteeMaxCount" rules={[{ required: true }]}> 
          <InputNumber min={1} max={4} />
        </Form.Item>
        <Form.Item label="本轮机时数" name="maxWinners" rules={[{ required: true }]}> 
          <InputNumber min={1} max={28} />
        </Form.Item>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          disabled={disabled || isRunning}
          loading={isRunning}
          onClick={() => {
            form.validateFields().then((values: RunOptions) => onRun(values));
          }}
        >
          开始摇号
        </Button>
      </Form>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="报名人数">{participants.length}</Descriptions.Item>
            <Descriptions.Item label="机时时段">{slots.length}</Descriptions.Item>
            <Descriptions.Item label="紧急申请">{emergencyRequests.length}</Descriptions.Item>
          </Descriptions>
        </Col>
        <Col span={16}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            规则提醒：22:00 以后时段默认为晚场，摇到可放弃并进入“先到先得”。
          </Typography.Paragraph>
        </Col>
      </Row>

      {latestOutcome && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={4}>本轮结果</Typography.Title>
          <Table
            dataSource={latestOutcome.winners.map((winner: WinnerEntry) => ({
              ...winner,
              key: winner.participantId
            }))}
            columns={winnerColumns}
            pagination={false}
            size="small"
          />
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Typography.Title level={5}>未中签</Typography.Title>
              <Typography.Paragraph>
                {latestOutcome.missed.length
                  ? latestOutcome.missed.map((participant: Participant) => participant.name).join("、")
                  : "全部安排完毕"}
              </Typography.Paragraph>
            </Col>
            <Col span={12}>
              <Typography.Title level={5}>晚场机时</Typography.Title>
              <Typography.Paragraph>
                {latestOutcome.remainingLateSlots.length
                  ? latestOutcome.remainingLateSlots.map((slot: Slot) => slot.label).join("、")
                  : "无"}
              </Typography.Paragraph>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
}
