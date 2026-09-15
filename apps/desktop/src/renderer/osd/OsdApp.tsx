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
          background: "rgba(6, 27, 70, 0.92)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${payload.schemeColor || "rgba(30, 216, 245, 0.3)"}`,
          borderRadius: "var(--radius-full)",
          padding: "var(--space-2) var(--space-5)",
          color: "var(--brand-armor-white, #f3f5f8)",
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px ${payload.schemeColor || "rgba(30, 216, 245, 0.3)"}40`,
        }}
      >
        {payload.showIcon && (
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: payload.schemeColor,
              boxShadow: `0 0 10px ${payload.schemeColor}`,
            }}
          />
        )}
        <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.3px" }}>
          {payload.schemeName}
        </span>
      </div>
    </div>
  );
}
