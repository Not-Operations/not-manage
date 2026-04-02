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
  if (!stdin.isTTY) {
    return options[defaultIndex].value;
  }

  console.log(bold(label));
  const selected = await new Promise((resolve) => {
    let index = defaultIndex;

    function render() {
      // Move cursor up to redraw options
      if (index !== -1) {
        stdout.write(`\x1b[${options.length}A`);
      }
      for (let i = 0; i < options.length; i++) {
        const marker = i === index ? ">" : " ";
        const line = i === index ? bold(` ${options[i].label}`) : `  ${options[i].label}`;
        stdout.write(`\x1b[2K ${marker}${line}\n`);
      }
    }

    // Initial render
    index = -1;
    for (let i = 0; i < options.length; i++) {
      const marker = i === defaultIndex ? ">" : " ";
      const line = i === defaultIndex ? bold(` ${options[i].label}`) : `  ${options[i].label}`;
      stdout.write(` ${marker}${line}\n`);
    }
    index = defaultIndex;

    stdin.setRawMode(true);
    stdin.resume();

    function onData(data) {
      const key = data.toString();

      // Up arrow: \x1b[A
      if (key === "\x1b[A" && index > 0) {
        index--;
        render();
        return;
      }

      // Down arrow: \x1b[B
      if (key === "\x1b[B" && index < options.length - 1) {
        index++;
        render();
        return;
      }

      // Enter
      if (key === "\r" || key === "\n") {
        stdin.removeListener("data", onData);
        stdin.setRawMode(false);
        stdin.pause();
        resolve(options[index].value);
        return;
      }

      // Ctrl+C
      if (key === "\x03") {
        stdin.removeListener("data", onData);
        stdin.setRawMode(false);
        process.exit(1);
      }
    }

    stdin.on("data", onData);
  });

  return selected;
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
