import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS } from "../../packages/contracts/src/index";
import { deepClone } from "../../packages/shared/src/index";

describe("Settings Store Logic Tests", () => {
  test("Default settings contain required schemas and defaults", () => {
    expect(DEFAULT_SETTINGS.schemaVersion).toBe(1);
    expect(DEFAULT_SETTINGS.language).toBe("es");
    expect(DEFAULT_SETTINGS.hotkey).toBe("Alt+P");
    expect(DEFAULT_SETTINGS.manualOverridePolicy).toBe("untilAutomationStateChanges");
    expect(DEFAULT_SETTINGS.osd.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.tray.style).toBe("outline");
  });

  test("Deep clone produces isolated copies", () => {
    const original = deepClone(DEFAULT_SETTINGS);
    original.tray.schemeColors["guid_1"] = "#ffffff";

    expect(DEFAULT_SETTINGS.tray.schemeColors["guid_1"]).toBeUndefined();
    expect(original.tray.schemeColors["guid_1"]).toBe("#ffffff");
  });
});
