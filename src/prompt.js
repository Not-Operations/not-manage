const { Writable } = require("node:stream");
const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const isTTYColor = stdout.isTTY && !process.env.NO_COLOR;
const bold = (text) => (isTTYColor ? `\x1b[1m${text}\x1b[22m` : text);
const dim = (text) => (isTTYColor ? `\x1b[2m${text}\x1b[22m` : text);

class PromptOutput extends Writable {
  constructor(target) {
    super();
    this.target = target;
    this.muted = false;
  }

  _write(chunk, encoding, callback) {
    if (!this.muted) {
      writePromptChunk(this.target, chunk, encoding);
      callback();
      return;
    }

    const text = decodePromptChunk(chunk, encoding);
    if (text === "\n" || text === "\r\n") {
      writePromptChunk(this.target, chunk, encoding);
    }

    callback();
  }

  writeVisible(text) {
    this.target.write(text);
  }
}

function decodePromptChunk(chunk, encoding) {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (encoding && encoding !== "buffer") {
    return chunk.toString(encoding);
  }

  return chunk.toString();
}

function writePromptChunk(target, chunk, encoding) {
  if (encoding && encoding !== "buffer") {
    target.write(chunk, encoding);
    return;
  }

  target.write(chunk);
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

async function selectOption(_rl, label, options, defaultIndex = 0) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error(`No options available for ${label}.`);
  }

  if (!stdin.isTTY) {
    return options[defaultIndex].value;
  }

  console.log(bold(label));
  options.forEach((option, index) => {
    const marker = index === defaultIndex ? "*" : " ";
    stdout.write(` ${marker} ${index + 1}. ${option.label}\n`);
  });

  const fallback = String(defaultIndex + 1);

  while (true) {
    const answer = String(await ask(_rl, "Choose an option", fallback)).trim();
    const numericIndex = Number.parseInt(answer, 10);

    if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= options.length) {
      return options[numericIndex - 1].value;
    }

    const normalized = answer.toLowerCase();
    const matchingOption = options.find((option) => {
      return (
        String(option.value).trim().toLowerCase() === normalized ||
        String(option.label).trim().toLowerCase() === normalized
      );
    });

    if (matchingOption) {
      return matchingOption.value;
    }

    console.log(`Enter a number from 1 to ${options.length}, or one of the listed values.`);
  }
}

module.exports = {
  PromptOutput,
  ask,
  askSecret,
  bold,
  decodePromptChunk,
  dim,
  selectOption,
  withPrompt,
};
