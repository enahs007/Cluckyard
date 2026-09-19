import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cluckyard.game",
  appName: "Cluckyard",
  webDir: "dist-android",
  backgroundColor: "#14110e",
  android: {
    allowMixedContent: false,
    backgroundColor: "#14110e",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
