const { Writable } = require("node:stream");
const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

class PromptOutput extends Writable {
  constructor(target) {
    super();
    this.target = target;
    this.muted = false;
  }

  _write(chunk, encoding, callback) {
    if (!this.muted) {
      this.target.write(chunk, encoding);
      callback();
      return;
    }

    const text = typeof chunk === "string" ? chunk : chunk.toString(encoding);
    if (text === "\n" || text === "\r\n") {
      this.target.write(chunk, encoding);
    }

    callback();
  }

  writeVisible(text) {
    this.target.write(text);
  }
}

async function withPrompt(callback) {
  const output = new PromptOutput(stdout);
  const rl = createInterface({
    input: stdin,
    output,
    terminal: true,
  });
  rl.__promptOutput = output;

  try {
    return await callback(rl);
  } finally {
    rl.close();
  }
}

async function ask(rl, label, fallback = null) {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  const trimmed = answer.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback;
}

async function askSecret(rl, label) {
  const output = rl && rl.__promptOutput;
  if (!output) {
    return ask(rl, label);
  }

  output.writeVisible(`${label}: `);
  output.muted = true;

  try {
    const answer = await rl.question("");
    const trimmed = answer.trim();
    return trimmed || null;
  } finally {
    output.muted = false;
  }
}

module.exports = {
  ask,
  askSecret,
  withPrompt,
};
