import { usePipewaveConnectionInfo } from "@pipewave/react";

export function ConnectionInfoExample() {
  const { status, transport } = usePipewaveConnectionInfo();

  return (
    <div>
      <p>
        <strong>status:</strong> {status}
      </p>
      <p>
        <strong>transport:</strong>{" "}
        {transport ?? <em>N/A (not yet connected)</em>}
      </p>
    </div>
  );
}
