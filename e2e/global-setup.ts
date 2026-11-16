import { startFakeApi } from "./support/fake-api";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const webPort = Number(process.env.E2E_WEB_PORT ?? 3300);
  const apiPort = Number(process.env.E2E_API_PORT ?? 4300);

  const fakeApi = await startFakeApi(apiPort, `http://localhost:${webPort}`);
  return fakeApi.close;
}
