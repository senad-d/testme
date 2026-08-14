import assert from "node:assert/strict";
import test from "node:test";

import {
  HELPERS,
  SUCCESS_STAGES,
  addHelper,
  checkWorkflow,
  createInitialState,
  renderApp,
  resetWorkflow,
  undoLastHelper,
} from "../src/app.js";

function addSequence(sequence, initialState = createInitialState()) {
  return sequence.reduce((state, helperId) => addHelper(state, helperId), initialState);
}

class FixtureElement {
  constructor(ownerDocument, tagName) {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener() {}
}

class FixtureDocument {
  createElement(tagName) {
    return new FixtureElement(this, tagName);
  }
}

function renderFixture(state) {
  const documentRef = new FixtureDocument();
  const root = documentRef.createElement("div");
  renderApp(root, state);
  return root;
}

function findByTestId(root, testId) {
  if (root.dataset.testid === testId) return root;

  for (const child of root.children) {
    const match = findByTestId(child, testId);
    if (match) return match;
  }

  return undefined;
}

test("an incomplete workflow stays incomplete through repeated checks and remains usable", () => {
  let state = addSequence(["seed"]);

  state = checkWorkflow(state);
  assert.equal(state.outcome.kind, "incomplete");
  assert.match(state.outcome.message, /needs 2 more helpers/i);

  const repeatedCheck = checkWorkflow(state);
  assert.equal(repeatedCheck.outcome.kind, "incomplete");
  assert.equal(repeatedCheck.outcome.message, state.outcome.message);
  assert.deepEqual(repeatedCheck.sequence, ["seed"]);

  const recovered = addSequence(["garden", "check"], repeatedCheck);
  assert.equal(checkWorkflow(recovered).outcome.kind, "success");
});

test("an incorrect complete order gives deterministic retry guidance without locking play", () => {
  let state = addSequence(["garden", "seed", "check"]);

  state = checkWorkflow(state);
  assert.equal(state.outcome.kind, "incorrect");
  assert.match(state.outcome.message, /needs earlier work/i);
  assert.match(state.outcome.message, /try another order/i);

  const repeatedRetry = checkWorkflow(state);
  assert.equal(repeatedRetry.outcome.kind, "incorrect");
  assert.equal(repeatedRetry.outcome.message, state.outcome.message);
  assert.deepEqual(repeatedRetry.sequence, ["garden", "seed", "check"]);

  const afterUndo = undoLastHelper(repeatedRetry);
  assert.deepEqual(afterUndo.sequence, ["garden", "seed"]);
  assert.deepEqual(resetWorkflow().sequence, []);
});

test("adding the same helper twice is a non-punishing retry and does not duplicate work", () => {
  let state = addHelper(createInitialState(), "seed");
  state = addHelper(state, "seed");

  assert.equal(state.outcome.kind, "repeated");
  assert.match(state.outcome.message, /already has a job/i);
  assert.deepEqual(state.sequence, ["seed"]);

  state = addSequence(["garden", "check"], state);
  assert.equal(checkWorkflow(state).outcome.kind, "success");
});

test("only the correct complete workflow reaches handoff, validation, and success", () => {
  const completeState = addSequence(["seed", "garden", "check"]);
  const checkedState = checkWorkflow(completeState);

  assert.equal(HELPERS.length, 3);
  assert.equal(checkedState.outcome.kind, "success");
  assert.match(checkedState.outcome.message, /you did it/i);
  assert.deepEqual(checkedState.outcome.stages, SUCCESS_STAGES);
  assert.deepEqual(
    checkedState.outcome.stages.map(({ id, heading }) => ({ id, heading })),
    [
      { id: "work", heading: "Work" },
      { id: "handoff", heading: "Handoff" },
      { id: "validation", heading: "Check" },
      { id: "result", heading: "Result" },
    ],
  );
  assert.match(
    checkedState.outcome.stages.find((stage) => stage.id === "handoff").lines.join(" "),
    /gives finished work to the next helper/i,
  );
  assert.match(
    checkedState.outcome.stages.find((stage) => stage.id === "validation").lines.join(" "),
    /checked that the plan has three plants and is ready/i,
  );
  assert.match(
    checkedState.outcome.stages.find((stage) => stage.id === "result").lines.join(" "),
    /plan is ready/i,
  );
});

test("the renderer shows the ordered success story only for a successful checked workflow", () => {
  const successState = checkWorkflow(addSequence(["seed", "garden", "check"]));
  const successRoot = renderFixture(successState);
  const story = findByTestId(successRoot, "success-story");

  assert.ok(story, "the child-visible success story is attached to the rendered app");
  const stageList = story.children.find((child) => child.tagName === "OL");
  assert.ok(stageList, "the success story has an ordered list");
  assert.deepEqual(
    stageList.children.map((stage) => ({
      id: stage.dataset.testid,
      heading: stage.children.find((child) => child.tagName === "H3")?.textContent,
    })),
    [
      { id: "work", heading: "Work" },
      { id: "handoff", heading: "Handoff" },
      { id: "validation", heading: "Check" },
      { id: "result", heading: "Result" },
    ],
  );
  const renderedStageText = Object.fromEntries(
    stageList.children.map((stage) => [
      stage.dataset.testid,
      stage.children.map((child) => child.textContent).join(" "),
    ]),
  );
  assert.match(renderedStageText.work, /seed helper chose beans, lettuce, sunflowers/i);
  assert.match(renderedStageText.handoff, /gives finished work to the next helper/i);
  assert.match(renderedStageText.validation, /checked that the plan has three plants and is ready/i);
  assert.match(renderedStageText.result, /class garden plan is ready/i);

  const incompleteRoot = renderFixture(checkWorkflow(addSequence(["seed"])));
  const incorrectRoot = renderFixture(checkWorkflow(addSequence(["garden", "seed", "check"])));
  assert.equal(findByTestId(incompleteRoot, "success-story"), undefined);
  assert.equal(findByTestId(incorrectRoot, "success-story"), undefined);
});
