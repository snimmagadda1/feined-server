async function startServer() {
  console.log("Initializing server...");
  (await import("./loaders")).default();
}

startServer();
