import type {
  AutomationAction,
  AutomationRule,
  Condition,
  Trigger,
} from "@power-manager/contracts";
import { generateId } from "@power-manager/shared";
import { useState } from "react";
import { useI18n } from "../hooks/useI18n";

interface Props {
  rule: AutomationRule | null;
  schemes: Array<{ id: string; name: string }>;
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

export function RuleEditorModal({ rule, schemes, onSave, onCancel }: Props) {
  const { t } = useI18n();

  const [name, setName] = useState(rule?.name || "Nueva automatización");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [priority, setPriority] = useState(rule?.priority ?? 50);
  const [exclusive, setExclusive] = useState(rule?.exclusive ?? false);

  const [triggers, setTriggers] = useState<Trigger[]>(
    rule?.when.items || [{ type: "processRunning", target: { match: "path", value: "" } }],
  );

  const [conditions, setConditions] = useState<Condition[]>(rule?.conditions.items || []);

  const [actions, setActions] = useState<AutomationAction[]>(
    rule?.actions || [{ type: "setPowerScheme", schemeId: schemes[0]?.id || "" }],
  );

  const handleBrowseExe = async (callback: (path: string) => void) => {
    const selected = await window.powerManager.selectExecutableDialog();
    if (selected) {
      callback(selected);
    }
  };

  const handleSave = () => {
    const finalRule: AutomationRule = {
      id: rule?.id || generateId("rule"),
      name: name.trim() || "Regla sin nombre",
      enabled,
      priority: Math.max(0, Math.min(100, Number(priority))),
      order: rule?.order ?? Date.now(),
      exclusive,
      when: { operator: "any", items: triggers },
      conditions: { operator: "all", items: conditions },
      actions,
      cooldownMs: 0,
      createdAt: rule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(finalRule);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "600px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          overflowY: "auto",
          background: "var(--bg-primary)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
            {rule ? t("ruleEditor.titleEdit") : t("ruleEditor.titleCreate")}
          </h2>
          <button className="btn-icon" onClick={onCancel}>
            ✕
          </button>
        </div>

        {/* Name, Priority & Enabled */}
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
              {t("ruleEditor.name")}
            </label>
            <input
              type="text"
              className="input-text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
              {t("ruleEditor.priority")}
            </label>
            <input
              type="number"
              className="input-text"
              min="0"
              max="100"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "12px",
              cursor: "pointer",
              paddingBottom: "var(--space-2)",
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Habilitada</span>
          </label>
        </div>

        {/* Exclusive checkbox */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={exclusive}
            onChange={(e) => setExclusive(e.target.checked)}
          />
          <span>{t("ruleEditor.exclusive")}</span>
        </label>

        {/* Triggers (WHEN) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
              {t("ruleEditor.when")}
            </span>
            <button
              className="btn-secondary"
              style={{ padding: "2px 8px", fontSize: "11px" }}
              onClick={() => setTriggers([...triggers, { type: "acConnected" }])}
            >
              + {t("ruleEditor.addTrigger")}
            </button>
          </div>

          {triggers.map((trig, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "center",
                background: "var(--bg-secondary)",
                padding: "var(--space-2)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <select
                style={{ flex: 1 }}
                value={trig.type}
                onChange={(e) => {
                  const type = e.target.value as any;
                  const updated = [...triggers];
                  if (
                    type === "processRunning" ||
                    type === "processStarted" ||
                    type === "processStopped"
                  ) {
                    updated[idx] = { type, target: { match: "path", value: "" } };
                  } else if (type === "timeWindow") {
                    updated[idx] = { type, days: [1, 2, 3, 4, 5], start: "08:00", end: "18:00" };
                  } else if (type === "batteryBelow" || type === "batteryAbove") {
                    updated[idx] = { type, percentage: 20 };
                  } else if (type === "activeSchemeIs") {
                    updated[idx] = { type, schemeId: schemes[0]?.id || "" };
                  } else {
                    updated[idx] = { type };
                  }
                  setTriggers(updated);
                }}
              >
                <option value="processRunning">{t("ruleEditor.triggers.processRunning")}</option>
                <option value="timeWindow">{t("ruleEditor.triggers.timeWindow")}</option>
                <option value="acConnected">{t("ruleEditor.triggers.acConnected")}</option>
                <option value="onBattery">{t("ruleEditor.triggers.onBattery")}</option>
                <option value="batteryBelow">{t("ruleEditor.triggers.batteryBelow")}</option>
                <option value="batteryAbove">{t("ruleEditor.triggers.batteryAbove")}</option>
                <option value="processStarted">{t("ruleEditor.triggers.processStarted")}</option>
                <option value="processStopped">{t("ruleEditor.triggers.processStopped")}</option>
                <option value="suspend">{t("ruleEditor.triggers.suspend")}</option>
                <option value="resume">{t("ruleEditor.triggers.resume")}</option>
              </select>

              {/* Sub-inputs for triggers */}
              {(trig.type === "processRunning" ||
                trig.type === "processStarted" ||
                trig.type === "processStopped") && (
                <div style={{ display: "flex", gap: "var(--space-1)", flex: 2 }}>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Ruta o nombre (.exe)"
                    value={trig.target.value}
                    onChange={(e) => {
                      const updated = [...triggers];
                      (updated[idx] as any).target.value = e.target.value;
                      setTriggers(updated);
                    }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      handleBrowseExe((p) => {
                        const updated = [...triggers];
                        (updated[idx] as any).target.value = p;
                        setTriggers(updated);
                      })
                    }
                  >
                    📁
                  </button>
                </div>
              )}

              {trig.type === "timeWindow" && (
                <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
                  <input
                    type="time"
                    className="input-text"
                    value={trig.start}
                    onChange={(e) => {
                      const updated = [...triggers];
                      (updated[idx] as any).start = e.target.value;
                      setTriggers(updated);
                    }}
                  />
                  <span>-</span>
                  <input
                    type="time"
                    className="input-text"
                    value={trig.end}
                    onChange={(e) => {
                      const updated = [...triggers];
                      (updated[idx] as any).end = e.target.value;
                      setTriggers(updated);
                    }}
                  />
                </div>
              )}

              {(trig.type === "batteryBelow" || trig.type === "batteryAbove") && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                  <input
                    type="number"
                    className="input-text"
                    min="1"
                    max="100"
                    value={trig.percentage}
                    onChange={(e) => {
                      const updated = [...triggers];
                      (updated[idx] as any).percentage = Number(e.target.value);
                      setTriggers(updated);
                    }}
                  />
                  <span>%</span>
                </div>
              )}

              <button
                className="btn-icon"
                onClick={() => setTriggers(triggers.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Conditions (WHILE) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--warning)" }}>
              {t("ruleEditor.conditions")}
            </span>
            <button
              className="btn-secondary"
              style={{ padding: "2px 8px", fontSize: "11px" }}
              onClick={() => setConditions([...conditions, { type: "powerSource", isAc: true }])}
            >
              + {t("ruleEditor.addCondition")}
            </button>
          </div>

          {conditions.map((cond, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "center",
                background: "var(--bg-secondary)",
                padding: "var(--space-2)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <select
                style={{ flex: 1 }}
                value={cond.type}
                onChange={(e) => {
                  const type = e.target.value as any;
                  const updated = [...conditions];
                  if (type === "powerSource") updated[idx] = { type, isAc: true };
                  else if (type === "activeScheme")
                    updated[idx] = { type, schemeId: schemes[0]?.id || "" };
                  else if (type === "batteryPercentage")
                    updated[idx] = { type, operator: "gte", value: 50 };
                  setConditions(updated);
                }}
              >
                <option value="powerSource">{t("ruleEditor.conditionsList.powerSource")}</option>
                <option value="activeScheme">{t("ruleEditor.conditionsList.activeScheme")}</option>
                <option value="batteryPercentage">
                  {t("ruleEditor.conditionsList.batteryPercentage")}
                </option>
              </select>

              {cond.type === "powerSource" && (
                <select
                  style={{ flex: 1 }}
                  value={cond.isAc ? "ac" : "battery"}
                  onChange={(e) => {
                    const updated = [...conditions];
                    (updated[idx] as any).isAc = e.target.value === "ac";
                    setConditions(updated);
                  }}
                >
                  <option value="ac">AC (Conectado)</option>
                  <option value="battery">Batería</option>
                </select>
              )}

              {cond.type === "activeScheme" && (
                <select
                  style={{ flex: 1 }}
                  value={cond.schemeId}
                  onChange={(e) => {
                    const updated = [...conditions];
                    (updated[idx] as any).schemeId = e.target.value;
                    setConditions(updated);
                  }}
                >
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                className="btn-icon"
                onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Actions (THEN) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--success)" }}>
              {t("ruleEditor.actions")}
            </span>
            <button
              className="btn-secondary"
              style={{ padding: "2px 8px", fontSize: "11px" }}
              onClick={() =>
                setActions([...actions, { type: "setPowerScheme", schemeId: schemes[0]?.id || "" }])
              }
            >
              + {t("ruleEditor.addAction")}
            </button>
          </div>

          {actions.map((act, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "center",
                background: "var(--bg-secondary)",
                padding: "var(--space-2)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <select
                style={{ flex: 1 }}
                value={act.type}
                onChange={(e) => {
                  const type = e.target.value as any;
                  const updated = [...actions];
                  if (type === "setPowerScheme")
                    updated[idx] = { type, schemeId: schemes[0]?.id || "" };
                  else if (type === "setBrightness") updated[idx] = { type, value: 70 };
                  else if (type === "turnOffDisplay") updated[idx] = { type };
                  else if (type === "showOsd") updated[idx] = { type, message: "Modo activo" };
                  else if (type === "showNotification")
                    updated[idx] = { type, title: "PowerManager", body: "Regla ejecutada" };
                  else if (type === "launchProgram") updated[idx] = { type, executablePath: "" };
                  setActions(updated);
                }}
              >
                <option value="setPowerScheme">{t("ruleEditor.actionsList.setPowerScheme")}</option>
                <option value="setBrightness">{t("ruleEditor.actionsList.setBrightness")}</option>
                <option value="turnOffDisplay">{t("ruleEditor.actionsList.turnOffDisplay")}</option>
                <option value="showOsd">{t("ruleEditor.actionsList.showOsd")}</option>
                <option value="showNotification">
                  {t("ruleEditor.actionsList.showNotification")}
                </option>
                <option value="launchProgram">{t("ruleEditor.actionsList.launchProgram")}</option>
              </select>

              {act.type === "setPowerScheme" && (
                <select
                  style={{ flex: 2 }}
                  value={act.schemeId}
                  onChange={(e) => {
                    const updated = [...actions];
                    (updated[idx] as any).schemeId = e.target.value;
                    setActions(updated);
                  }}
                >
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              {act.type === "setBrightness" && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                  <input
                    type="number"
                    className="input-text"
                    min="0"
                    max="100"
                    value={act.value}
                    onChange={(e) => {
                      const updated = [...actions];
                      (updated[idx] as any).value = Number(e.target.value);
                      setActions(updated);
                    }}
                  />
                  <span>%</span>
                </div>
              )}

              {act.type === "launchProgram" && (
                <div style={{ display: "flex", gap: "var(--space-1)", flex: 2 }}>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Ruta al ejecutable"
                    value={act.executablePath}
                    onChange={(e) => {
                      const updated = [...actions];
                      (updated[idx] as any).executablePath = e.target.value;
                      setActions(updated);
                    }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      handleBrowseExe((p) => {
                        const updated = [...actions];
                        (updated[idx] as any).executablePath = p;
                        setActions(updated);
                      })
                    }
                  >
                    📁
                  </button>
                </div>
              )}

              <button
                className="btn-icon"
                onClick={() => setActions(actions.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "var(--space-3)",
          }}
        >
          <button className="btn-secondary" onClick={onCancel}>
            {t("ruleEditor.cancel")}
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {t("ruleEditor.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
