import { useState } from "react";
import { usePipewaveSend } from "@pipewave/react";

const FIRE_AND_FORGET = "FIRE_AND_FORGET";
const encoder = new TextEncoder();

export function SendOnlyExample() {
  const { send } = usePipewaveSend();
  const [sentCount, setSentCount] = useState(0);

  const handleSend = () => {
    send({
      id: crypto.randomUUID(),
      msgType: FIRE_AND_FORGET,
      data: encoder.encode(`ping #${sentCount + 1}`),
    });
    setSentCount((n) => n + 1);
  };

  return (
    <div>
      <p>Sends a message without waiting for a response.</p>
      <button onClick={handleSend}>Send Fire-and-Forget</button>
      <p>Sent: {sentCount} message(s)</p>
    </div>
  );
}
