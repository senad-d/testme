export const MISSION = Object.freeze({
  title: "Make a plan for a class garden.",
  plantList: Object.freeze(["beans", "lettuce", "sunflowers"]),
});

export const HELPERS = Object.freeze([
  Object.freeze({
    id: "seed",
    name: "Seed Helper",
    job: "Chooses three plants.",
  }),
  Object.freeze({
    id: "garden",
    name: "Garden Helper",
    job: "Uses the plant list to make the garden plan.",
  }),
  Object.freeze({
    id: "check",
    name: "Check Helper",
    job: "Checks that the plan has three plants and is ready.",
  }),
]);

export const CORRECT_ORDER = Object.freeze(HELPERS.map((helper) => helper.id));

export const SUCCESS_STAGES = Object.freeze([
  Object.freeze({
    id: "work",
    heading: "Work",
    lines: Object.freeze([
      `The Seed Helper chose ${MISSION.plantList.join(", ")}. Each helper did a special job.`,
    ]),
  }),
  Object.freeze({
    id: "handoff",
    heading: "Handoff",
    lines: Object.freeze([
      "A handoff is when one helper gives finished work to the next helper.",
      "The Seed Helper gave the plant list to the Garden Helper.",
    ]),
  }),
  Object.freeze({
    id: "validation",
    heading: "Check",
    lines: Object.freeze([
      "The Check Helper checked that the plan has three plants and is ready.",
    ]),
  }),
  Object.freeze({
    id: "result",
    heading: "Result",
    lines: Object.freeze(["The class garden plan is ready!"]),
  }),
]);

const HELPER_BY_ID = new Map(HELPERS.map((helper) => [helper.id, helper]));

const FEEDBACK = Object.freeze({
  ready: "Add the helpers in the order you think they should work.",
  building: "Good thinking. Add another helper, or check your work.",
  repeated: "That helper already has a job. Choose a helper that is not in your plan.",
  emptyUndo: "There is no helper to remove yet.",
  reset: "Your plan is clear. Try a new order.",
  incorrect: "A helper needs earlier work. Try another order so each helper gets the work it needs.",
  success: "You did it! Each helper got the work it needed, and the garden plan is ready.",
});

function makeOutcome(kind, message, details = {}) {
  return Object.freeze({ kind, message, ...details });
}

function assertKnownSequence(sequence) {
  if (!Array.isArray(sequence)) {
    throw new TypeError("The helper sequence must be an array.");
  }

  for (const helperId of sequence) {
    if (!HELPER_BY_ID.has(helperId)) {
      throw new RangeError(`Unknown helper: ${helperId}`);
    }
  }
}

export function createInitialState() {
  return Object.freeze({
    sequence: Object.freeze([]),
    outcome: makeOutcome("ready", FEEDBACK.ready),
  });
}

export function evaluateWorkflow(sequence) {
  assertKnownSequence(sequence);

  if (sequence.length < CORRECT_ORDER.length) {
    const missingCount = CORRECT_ORDER.length - sequence.length;
    const helperWord = missingCount === 1 ? "helper" : "helpers";
    return makeOutcome(
      "incomplete",
      `Your plan needs ${missingCount} more ${helperWord}. Add the missing ${helperWord}, then check again.`,
    );
  }

  const isCorrect =
    sequence.length === CORRECT_ORDER.length &&
    sequence.every((helperId, index) => helperId === CORRECT_ORDER[index]);

  return isCorrect
    ? makeOutcome("success", FEEDBACK.success, { stages: SUCCESS_STAGES })
    : makeOutcome("incorrect", FEEDBACK.incorrect);
}

export function addHelper(state, helperId) {
  assertKnownSequence(state.sequence);
  if (!HELPER_BY_ID.has(helperId)) {
    throw new RangeError(`Unknown helper: ${helperId}`);
  }

  if (state.sequence.includes(helperId)) {
    return Object.freeze({
      sequence: state.sequence,
      outcome: makeOutcome("repeated", FEEDBACK.repeated),
    });
  }

  return Object.freeze({
    sequence: Object.freeze([...state.sequence, helperId]),
    outcome: makeOutcome("building", FEEDBACK.building),
  });
}

export function undoLastHelper(state) {
  assertKnownSequence(state.sequence);
  if (state.sequence.length === 0) {
    return Object.freeze({
      sequence: state.sequence,
      outcome: makeOutcome("ready", FEEDBACK.emptyUndo),
    });
  }

  return Object.freeze({
    sequence: Object.freeze(state.sequence.slice(0, -1)),
    outcome: makeOutcome("building", "The last helper was removed. Keep building your plan."),
  });
}

export function resetWorkflow() {
  return Object.freeze({
    sequence: Object.freeze([]),
    outcome: makeOutcome("ready", FEEDBACK.reset),
  });
}

export function checkWorkflow(state) {
  assertKnownSequence(state.sequence);
  return Object.freeze({
    sequence: state.sequence,
    outcome: evaluateWorkflow(state.sequence),
  });
}

function makeElement(documentRef, tagName, options = {}) {
  const element = documentRef.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text) element.textContent = options.text;
  if (options.testId) element.dataset.testid = options.testId;
  return element;
}

function makeHelperCard(documentRef, helper, selected, onAdd) {
  const card = makeElement(documentRef, "article", { className: "helper-card" });
  card.dataset.helperId = helper.id;

  const heading = makeElement(documentRef, "h3", { text: helper.name });
  const job = makeElement(documentRef, "p", { text: `Job: ${helper.job}` });
  const button = makeElement(documentRef, "button", {
    text: selected ? "Added to the plan" : "Add as next job",
    testId: `add-${helper.id}`,
  });
  button.type = "button";
  button.disabled = selected;
  button.addEventListener("click", () => onAdd(helper.id));

  card.append(heading, job, button);
  return card;
}

export function renderApp(root, state, actions = {}) {
  if (!root || !root.ownerDocument) {
    throw new TypeError("renderApp needs a DOM root element.");
  }

  const documentRef = root.ownerDocument;
  const onAdd = actions.onAdd ?? (() => {});
  const onUndo = actions.onUndo ?? (() => {});
  const onReset = actions.onReset ?? (() => {});
  const onCheck = actions.onCheck ?? (() => {});

  root.replaceChildren();

  const header = makeElement(documentRef, "header", { className: "page-header" });
  header.append(
    makeElement(documentRef, "p", { className: "eyebrow", text: "One mission • No timer" }),
    makeElement(documentRef, "h1", { text: "Garden Workflow Game" }),
    makeElement(documentRef, "p", {
      text: "Give each helper a job. Put the jobs in an order that works.",
    }),
  );

  const main = makeElement(documentRef, "main");

  const goalSection = makeElement(documentRef, "section", { className: "goal-card", testId: "goal" });
  goalSection.setAttribute("aria-labelledby", "goal-heading");
  const goalHeading = makeElement(documentRef, "h2", { text: "Goal" });
  goalHeading.id = "goal-heading";
  goalSection.append(
    goalHeading,
    makeElement(documentRef, "p", { className: "goal-text", text: MISSION.title }),
  );

  const helpersSection = makeElement(documentRef, "section", { testId: "helpers" });
  helpersSection.setAttribute("aria-labelledby", "helpers-heading");
  const helpersHeading = makeElement(documentRef, "h2", { text: "Choose the helpers" });
  helpersHeading.id = "helpers-heading";
  const helperHint = makeElement(documentRef, "p", {
    text: "Each helper has a special job. Add each helper once.",
  });
  const helperGrid = makeElement(documentRef, "div", { className: "helper-grid" });
  for (const helper of HELPERS) {
    helperGrid.append(makeHelperCard(documentRef, helper, state.sequence.includes(helper.id), onAdd));
  }
  helpersSection.append(helpersHeading, helperHint, helperGrid);

  const planSection = makeElement(documentRef, "section", { className: "plan-card", testId: "workflow" });
  planSection.setAttribute("aria-labelledby", "workflow-heading");
  const workflowHeading = makeElement(documentRef, "h2", { text: "Your work order" });
  workflowHeading.id = "workflow-heading";
  const progressLabel = makeElement(documentRef, "p", {
    text: `Progress: ${state.sequence.length} of ${HELPERS.length} helper jobs added.`,
    testId: "progress-text",
  });
  const progress = makeElement(documentRef, "progress", { testId: "progress" });
  progress.max = HELPERS.length;
  progress.value = state.sequence.length;
  progress.setAttribute("aria-label", `${state.sequence.length} of ${HELPERS.length} helper jobs added`);

  const workflowList = makeElement(documentRef, "ol", { testId: "workflow-list" });
  if (state.sequence.length === 0) {
    const emptyItem = makeElement(documentRef, "li", { text: "No helper jobs added yet." });
    emptyItem.className = "empty-step";
    workflowList.append(emptyItem);
  } else {
    state.sequence.forEach((helperId, index) => {
      const helper = HELPER_BY_ID.get(helperId);
      workflowList.append(
        makeElement(documentRef, "li", {
          text: `${index + 1}. ${helper.name}: ${helper.job}`,
          testId: `workflow-step-${index + 1}`,
        }),
      );
    });
  }

  const controls = makeElement(documentRef, "div", { className: "controls" });
  const undoButton = makeElement(documentRef, "button", { text: "Undo last", testId: "undo" });
  undoButton.type = "button";
  undoButton.disabled = state.sequence.length === 0;
  undoButton.addEventListener("click", onUndo);
  const resetButton = makeElement(documentRef, "button", { text: "Reset plan", testId: "reset" });
  resetButton.type = "button";
  resetButton.disabled = state.sequence.length === 0;
  resetButton.addEventListener("click", onReset);
  const checkButton = makeElement(documentRef, "button", { text: "Check my work", testId: "check-workflow" });
  checkButton.type = "button";
  checkButton.addEventListener("click", onCheck);
  controls.append(undoButton, resetButton, checkButton);

  const feedback = makeElement(documentRef, "p", {
    className: `feedback feedback-${state.outcome.kind}`,
    text: state.outcome.message,
    testId: "feedback",
  });
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  feedback.dataset.state = state.outcome.kind;

  planSection.append(workflowHeading, progressLabel, progress, workflowList, controls, feedback);
  main.append(goalSection, helpersSection, planSection);

  if (state.outcome.kind === "success") {
    const story = makeElement(documentRef, "section", { className: "result-story", testId: "success-story" });
    story.setAttribute("aria-labelledby", "result-heading");
    const storyHeading = makeElement(documentRef, "h2", { text: "See how the work moved" });
    storyHeading.id = "result-heading";

    const stageList = makeElement(documentRef, "ol", { className: "story-list" });
    for (const stage of SUCCESS_STAGES) {
      const stageItem = makeElement(documentRef, "li", {
        className: "story-step",
        testId: stage.id,
      });
      stageItem.append(makeElement(documentRef, "h3", { text: stage.heading }));
      for (const line of stage.lines) {
        stageItem.append(makeElement(documentRef, "p", { text: line }));
      }
      stageList.append(stageItem);
    }

    story.append(storyHeading, stageList);
    main.append(story);
  }

  const footer = makeElement(documentRef, "footer");
  footer.append(
    makeElement(documentRef, "p", {
      text: "This game stays on this device. It does not ask for, save, or send your name or answers.",
    }),
  );

  root.append(header, main, footer);
}

export function mountApp(root) {
  let state = createInitialState();

  const update = (nextState) => {
    state = nextState;
    render();
  };

  const actions = {
    onAdd: (helperId) => update(addHelper(state, helperId)),
    onUndo: () => update(undoLastHelper(state)),
    onReset: () => update(resetWorkflow()),
    onCheck: () => update(checkWorkflow(state)),
  };

  const render = () => renderApp(root, state, actions);
  render();

  return Object.freeze({
    getState: () => state,
    addHelper: actions.onAdd,
    undo: actions.onUndo,
    reset: actions.onReset,
    check: actions.onCheck,
  });
}

if (typeof document !== "undefined") {
  const root = document.querySelector("#app");
  if (root) mountApp(root);
}
