import { PlayCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Descriptions, Form, InputNumber, Row, Table, Tag, Typography } from "antd";
import { LotteryOutcome, Participant, EmergencyRequest, WinnerEntry } from "@core";

interface RunOptions {
  emergencySlots: number;
  guaranteeThreshold: number;
  guaranteeMaxCount: number;
  maxWinners: number;
}

interface LotteryRunnerProps {
  participants: Participant[];
  emergencyRequests: EmergencyRequest[];
  latestOutcome?: LotteryOutcome;
  onRun(options: RunOptions): void | Promise<void>;
  onConfirm?(outcome: LotteryOutcome): void | Promise<void>;
  isRunning?: boolean;
}

export function LotteryRunner({ participants, emergencyRequests, latestOutcome, onRun, onConfirm, isRunning }: LotteryRunnerProps) {
  const [form] = Form.useForm<RunOptions>();
  const disabled = !participants.length;

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
    <Card title="14:00 摇号机">
      <Alert
        type="info"
        message="每次摇号仅允许同一位同学中一次，紧急通道优先于保底，保底优先于普通摇号。"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form
        form={form}
        layout="inline"
        initialValues={{ emergencySlots: 1, guaranteeThreshold: 3, guaranteeMaxCount: 2, maxWinners: 1 }}
        style={{ flexWrap: "wrap", gap: 12 }}
      >
        <Form.Item label="紧急名额" name="emergencySlots" rules={[{ required: true }]}> 
          <InputNumber min={0} />
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
            <Descriptions.Item label="紧急申请">{emergencyRequests.length}</Descriptions.Item>
          </Descriptions>
        </Col>
        <Col span={16}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            每轮只根据手动输入的机时数确定中签人数，不再区分具体机时时段。
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
              <Typography.Paragraph>本版本未区分晚场机时时段。</Typography.Paragraph>
            </Col>
          </Row>
          <Row style={{ marginTop: 12 }} justify="end">
            <Col>
              <Button
                type="primary"
                onClick={() => {
                  // allow re-running by validating form and calling onRun
                  form.validateFields().then((values: RunOptions) => onRun(values));
                }}
              >
                再次运行
              </Button>
            </Col>
            <Col style={{ marginLeft: 8 }}>
              <Button
                type="primary"
                onClick={() => {
                  if (!latestOutcome) return;
                  if (!onConfirm) return;
                  Promise.resolve(onConfirm(latestOutcome));
                }}
              >
                确认结果
              </Button>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
}
