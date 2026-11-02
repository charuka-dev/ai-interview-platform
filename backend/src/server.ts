import "dotenv/config";
import { createApp } from "./app.js";
import { initQueue } from "./queue/index.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

async function main() {
  const app = await createApp();

  // Initialise the queue/worker (connects Redis if available, else in-process)
  await initQueue();

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`Server listening on http://0.0.0.0:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
