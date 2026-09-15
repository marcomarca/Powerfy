import { StrictMode, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import { I18nContext, createI18nHelper } from "./hooks/useI18n";
import { OsdApp } from "./osd/OsdApp";
import { PopupApp } from "./popup/PopupApp";
import { SettingsApp } from "./settings/SettingsApp";

function Root() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") || "popup";
  const tab = params.get("tab") || "general";

  useEffect(() => {
    if (window.powerManager?.getSettings) {
      window.powerManager.getSettings().then((s: any) => {
        if (s?.language) setLang(s.language);
        if (s?.theme) {
          document.documentElement.setAttribute("data-theme", s.theme);
        }
      });
    }
  }, []);

  const t = createI18nHelper(lang);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {view === "popup" && <PopupApp />}
      {view === "settings" && <SettingsApp initialTab={tab} />}
      {view === "osd" && <OsdApp />}
    </I18nContext.Provider>
  );
}

const rootElem = document.getElementById("root");
if (rootElem) {
  ReactDOM.createRoot(rootElem).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}
