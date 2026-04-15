import { usePipewaveConnectionInfo } from "@/hooks";

export function ConnectionStatusExample() {
  const { status, isConnected, isReconnecting, isSuspended } =
    usePipewaveConnectionInfo();

  const badgeColor = isConnected
    ? "green"
    : isReconnecting
      ? "orange"
      : isSuspended
        ? "red"
        : "gray";

  return (
    <div>
      <p>
        <strong>status:</strong>{" "}
        <span style={{ color: badgeColor, fontWeight: "bold" }}>{status}</span>
      </p>
      <p>isConnected: {String(isConnected)}</p>
      <p>isReconnecting: {String(isReconnecting)}</p>
      <p>isSuspended: {String(isSuspended)}</p>
    </div>
  );
}
