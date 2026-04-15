import { PipewaveProvider, PipewaveModuleConfig } from "@/context";
import { PipewaveDebugger } from "@/components/PipewaveDebugger";
import { ConnectionStatusExample } from "./ConnectionStatusExample";
import { ConnectionInfoExample } from "./ConnectionInfoExample";
import { SendOnlyExample } from "./SendOnlyExample";
import { MessageSubscribeExample } from "./MessageSubscribeExample";
import { ErrorSubscribeExample } from "./ErrorSubscribeExample";
import { LatestMessageExample } from "./LatestMessageExample";
import { MessageHistoryExample } from "./MessageHistoryExample";
import { RequestResponseExample } from "./RequestResponseExample";
import { AllInOneExample } from "./AllInOneExample";
import { ResetConnectionExample } from "./ResetConnectionExample";

const accessToken = { value: "default" };
const config = new PipewaveModuleConfig({
  backendEndpoint: "localhost:8080/pipewave",
  enableLongPollingFallback: true,
  insecure: true,
  getAccessToken: async () => accessToken.value,
  retry: {
    maxRetry: 5,
    initialRetryDelay: 1000,
    maxRetryDelay: 3000,
  },
});

function SectionHeader({ title, hook }: { title: string; hook: string }) {
  return (
    <div
      style={{
        borderTop: "3px solid #333",
        margin: "32px 0 16px",
        paddingTop: 12,
      }}
    >
      <h2 style={{ margin: 0 }}>{title}</h2>
      <code style={{ fontSize: 12, color: "#666" }}>{hook}</code>
    </div>
  );
}

export default function ExamplePage() {
  return (
    <PipewaveProvider config={config}>
      <div style={{ padding: 24, maxWidth: 640, fontFamily: "sans-serif" }}>
        <h1>Pipewave React — Hook Examples</h1>

        <SectionHeader title="Connection Status" hook="usePipewaveStatus" />
        <ConnectionStatusExample />

        <SectionHeader
          title="Reset Connection"
          hook="usePipewaveResetConnection"
        />
        <ResetConnectionExample />

        <SectionHeader
          title="Connection Info (Status + Transport)"
          hook="usePipewaveConnectionInfo"
        />
        <ConnectionInfoExample />

        <SectionHeader
          title="Send Only (Fire & Forget)"
          hook="usePipewaveSend"
        />
        <SendOnlyExample />

        <SectionHeader
          title="Subscribe to Message Type"
          hook="usePipewaveMessage"
        />
        <MessageSubscribeExample />

        <SectionHeader
          title="Subscribe to Error Type"
          hook="usePipewaveError"
        />
        <ErrorSubscribeExample />

        <SectionHeader
          title="Latest Message (Server Push)"
          hook="usePipewaveLatestMessage"
        />
        <LatestMessageExample />

        <SectionHeader
          title="Message History (Server Push)"
          hook="usePipewaveMessageHistory"
        />
        <MessageHistoryExample />

        <SectionHeader title="Request → Ack" hook="usePipewaveSendWaitAck" />
        <RequestResponseExample />

        <SectionHeader title="All-in-One (send + receive)" hook="usePipewave" />
        <AllInOneExample />
      </div>
      <PipewaveDebugger
        buttonPosition={{ bottom: 16, right: 16 }}
        panelSide="right"
      />
    </PipewaveProvider>
  );
}
