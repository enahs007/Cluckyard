import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameShell } from "@/components/GameOverlay";
import "./styles.css";

async function nativeChrome() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#14110e" });
  } catch {
    /* web / plugin missing */
  }
}

void nativeChrome();

const root = document.getElementById("app");
if (!root) throw new Error("Cluckyard: #app missing");

createRoot(root).render(
  <StrictMode>
    <GameShell />
  </StrictMode>,
);
