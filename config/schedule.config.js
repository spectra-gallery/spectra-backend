// Schedule config
module.exports = [
  // generate secret key on server start
  {
    name: "generateKey",
    description: "Generate secret key on server start",
    cron: "@reboot",
    function: "keyManager.setKey",
    arguments: [],
    active: true,
    lastRun: null,
    nextRun: null,
    lastResult: "",
    lastError: "",
    recursive: false,
    activeOnStart: true,
    errorRecursive: false,
    errorCount: 0,
    errorLimit: 5,
  }
];
