import { useEffect, useState } from "react";

export function OsdApp() {
  const [payload, setPayload] = useState<{
    schemeName: string;
    schemeColor: string;
    showIcon: boolean;
    opacity: number;
  }>({
    schemeName: "Power Scheme",
    schemeColor: "#3b82f6",
    showIcon: true,
    opacity: 0.9,
  });

  useEffect(() => {
    if (window.powerManager?.onOsdPayload) {
      return window.powerManager.onOsdPayload((data: any) => {
        setPayload(data);
      });
    }
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-3)",
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "var(--radius-full)",
          padding: "var(--space-2) var(--space-5)",
          color: "#ffffff",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {payload.showIcon && (
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: payload.schemeColor,
              boxShadow: `0 0 10px ${payload.schemeColor}`,
            }}
          />
        )}
        <span style={{ fontSize: "14px", fontWeight: 600 }}>{payload.schemeName}</span>
      </div>
    </div>
  );
}
