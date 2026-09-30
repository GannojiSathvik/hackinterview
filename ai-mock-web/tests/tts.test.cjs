const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ rejectPlayback = false } = {}) {
  const source = readFileSync(path.join(__dirname, '../src/lib/tts.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const revoked = [];
  const audioInstances = [];
  const utterances = [];
  const context = {
    exports: {},
    require: () => ({ API_BASE: 'http://localhost:8000' }),
    fetch: async () => ({
      ok: true,
      headers: { get: () => 'audio/mpeg' },
      blob: async () => ({}),
    }),
    URL: {
      createObjectURL: () => 'blob:test-audio',
      revokeObjectURL: (url) => revoked.push(url),
    },
    Audio: class {
      constructor() { audioInstances.push(this); }
      play() {
        return rejectPlayback ? Promise.reject(new Error('Playback blocked')) : Promise.resolve();
      }
    },
    window: { speechSynthesis: { speak: (utterance) => utterances.push(utterance) } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  };
  vm.runInNewContext(compiled, context);
  return { speak: context.exports.speak, revoked, audioInstances, utterances };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('server audio waits until playback ends and releases the blob URL', async () => {
  const state = setup();
  let finished = false;
  const speaking = state.speak('Hello').then(() => { finished = true; });
  await flushPromises();
  assert.equal(finished, false, 'speak must remain pending while audio is playing');
  assert.deepEqual(state.revoked, []);
  state.audioInstances[0].onended();
  await speaking;
  assert.deepEqual(state.revoked, ['blob:test-audio']);
});

test('rejected playback releases the blob and falls back to browser speech', async () => {
  const state = setup({ rejectPlayback: true });
  const speaking = state.speak('Hello');
  await flushPromises();
  assert.deepEqual(state.revoked, ['blob:test-audio']);
  assert.equal(state.utterances[0].text, 'Hello');
  state.utterances[0].onend();
  await speaking;
});

test('audio errors release the blob and fall back to browser speech', async () => {
  const state = setup();
  const speaking = state.speak('Hello');
  await flushPromises();
  assert.equal(typeof state.audioInstances[0].onerror, 'function');
  state.audioInstances[0].onerror();
  await flushPromises();
  assert.deepEqual(state.revoked, ['blob:test-audio']);
  state.utterances[0].onend();
  await speaking;
});
