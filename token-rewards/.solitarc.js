const path = require("path");
const programDir = path.join(__dirname, "programs", "token-rewards");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "src", "generated");
const binaryInstallDir = path.join(__dirname, "..", ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "token_rewards",
  programId: "DdV3ttvqbXm9uMW1XX5AUDkf7v9mgkQdFjNkrp4zkDyQ",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
