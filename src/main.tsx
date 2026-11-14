import { render } from "preact";
import { Controller } from "./app/controller.ts";
import { connect, onLanguage, onLifecycle, onMenuCommand, pushMenuState, setTitle } from "./bridge/bridge.ts";
import { App } from "./ui/App.tsx";
import "./styles/cmf-studio.css";

async function main(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) return;
  const client = await connect();
  const studio = new Controller(client);
  document.documentElement.lang = studio.language.value === "zh" ? "zh-CN" : "en";
  onMenuCommand(client, (action) => studio.runMenuCommand(action));
  onLifecycle(client, {
    suspend: (cause) => studio.suspend(cause),
    resume: () => studio.resume(),
    dispose: () => studio.dispose(),
  });
  onLanguage(client, (language) => {
    studio.language.value = language;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    setTitle(client, studio.t.value("cmf_studio_title"));
  });
  setTitle(client, studio.t.value("cmf_studio_title"));
  studio.onMenuChange = (state) => pushMenuState(client, state);
  render(<App studio={studio} />, root);
  await studio.start();
}

void main();
