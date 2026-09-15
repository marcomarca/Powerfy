import type { AppSettings, AutomationRule, PowerScheme } from "@power-manager/contracts";
import { generateId } from "@power-manager/shared";
import { useState } from "react";
import { RuleEditorModal } from "../../automations/RuleEditorModal";
import { useI18n } from "../../hooks/useI18n";

interface Props {
  settings: AppSettings;
  schemes: PowerScheme[];
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function AutomationsTab({ settings, schemes, onUpdate }: Props) {
  const { t } = useI18n();
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    const updated = settings.rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
    onUpdate({ rules: updated });
  };

  const handleDuplicateRule = (rule: AutomationRule) => {
    const duplicated: AutomationRule = {
      ...rule,
      id: generateId("rule"),
      name: `${rule.name} (Copia)`,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdate({ rules: [...settings.rules, duplicated] });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm(t("settings.automationsTab.confirmDelete"))) {
      onUpdate({ rules: settings.rules.filter((r) => r.id !== ruleId) });
    }
  };

  const handleSaveRule = (savedRule: AutomationRule) => {
    const existingIndex = settings.rules.findIndex((r) => r.id === savedRule.id);
    let updatedRules: AutomationRule[];
    if (existingIndex >= 0) {
      updatedRules = [...settings.rules];
      updatedRules[existingIndex] = savedRule;
    } else {
      updatedRules = [...settings.rules, savedRule];
    }

    onUpdate({ rules: updatedRules });
    setIsModalOpen(false);
    setEditingRule(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Master Toggle */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{t("settings.automationsTab.masterToggle")}</div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.schedulerEnabled}
            onChange={(e) => onUpdate({ schedulerEnabled: e.target.checked })}
          />
          <span className="switch-slider" />
        </label>
      </div>

      {/* Rules Section Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>Reglas ({settings.rules.length})</span>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingRule(null);
            setIsModalOpen(true);
          }}
        >
          + {t("settings.automationsTab.createRule")}
        </button>
      </div>

      {/* Rules List */}
      {settings.rules.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", color: "var(--text-secondary)", padding: "var(--space-6)" }}
        >
          {t("settings.automationsTab.noRules")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {settings.rules.map((rule) => (
            <div
              key={rule.id}
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: rule.enabled ? 1 : 0.6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ fontWeight: 600 }}>{rule.name}</span>
                    <span className="badge badge-info">P: {rule.priority}</span>
                    {rule.exclusive && <span className="badge badge-warning">Exclusiva</span>}
                  </div>
                  <div
                    style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}
                  >
                    {rule.when.items.map((trig) => trig.type).join(" OR ")} ➔{" "}
                    {rule.actions.map((act) => act.type).join(", ")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <button
                  className="btn-icon"
                  title={t("settings.automationsTab.edit")}
                  onClick={() => {
                    setEditingRule(rule);
                    setIsModalOpen(true);
                  }}
                >
                  ✏️
                </button>
                <button
                  className="btn-icon"
                  title={t("settings.automationsTab.duplicate")}
                  onClick={() => handleDuplicateRule(rule)}
                >
                  📋
                </button>
                <button
                  className="btn-icon"
                  title={t("settings.automationsTab.delete")}
                  onClick={() => handleDeleteRule(rule.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <RuleEditorModal
          rule={editingRule}
          schemes={schemes}
          onSave={handleSaveRule}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}
