import { useState } from "react";
import { usePipewaveError, usePipewaveSend } from "@pipewave/react";

const ERROR_TEST = "ERROR_TEST";
const encoder = new TextEncoder();

export function ErrorSubscribeExample() {
  const { send } = usePipewaveSend();
  const [errors, setErrors] = useState<string[]>([]);

  usePipewaveError(ERROR_TEST, async (error, id) => {
    setErrors((prev) => [...prev, `[${id}] ${error}`]);
  });

  const triggerError = () => {
    send({
      id: crypto.randomUUID(),
      msgType: ERROR_TEST,
      data: encoder.encode("intentional error"),
    });
  };

  return (
    <div>
      <p>
        Sends <code>{ERROR_TEST}</code>; backend responds with an error. Hook
        captures it.
      </p>
      <button onClick={triggerError}>Trigger Error</button>
      <ul style={{ listStyle: "none", padding: 0, color: "red" }}>
        {errors.map((e, i) => (
          <li key={i}>⚠ {e}</li>
        ))}
      </ul>
    </div>
  );
}
