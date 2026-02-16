// DATABASE-CHECKED: no direct table access — in-memory queue only
// Purpose: Serial execution queue adapted from OpenClaw's command-queue.ts.
// Prevents race conditions when the agent simultaneously writes to member
// profile, sends an email, and schedules a follow-up.
//
// Source: OpenClaw src/process/command-queue.ts (~200 lines)
// Adapted: TypeScript → JavaScript, removed SIGUSR1/probe logic, kept core queue

/**
 * Lane names for different execution contexts.
 * Main = user-facing messages (serial by default)
 * Cron = proactive heartbeat/scheduled jobs (Phase 2)
 * Background = non-urgent tasks like embedding generation
 */
const CommandLane = {
  Main: 'main',
  Cron: 'cron',
  Background: 'background',
};

/**
 * Error thrown when a queued command is rejected because its lane was cleared.
 */
class CommandLaneClearedError extends Error {
  constructor(lane) {
    super(lane ? `Command lane "${lane}" cleared` : 'Command lane cleared');
    this.name = 'CommandLaneClearedError';
  }
}

// Internal state
const lanes = new Map();
let nextTaskId = 1;

function getLaneState(lane) {
  const existing = lanes.get(lane);
  if (existing) return existing;

  const created = {
    lane,
    queue: [],
    activeTaskIds: new Set(),
    maxConcurrent: 1,
    draining: false,
    generation: 0,
  };
  lanes.set(lane, created);
  return created;
}

function completeTask(state, taskId, taskGeneration) {
  if (taskGeneration !== state.generation) return false;
  state.activeTaskIds.delete(taskId);
  return true;
}

function drainLane(lane) {
  const state = getLaneState(lane);
  if (state.draining) return;
  state.draining = true;

  const pump = () => {
    while (state.activeTaskIds.size < state.maxConcurrent && state.queue.length > 0) {
      const entry = state.queue.shift();
      const waitedMs = Date.now() - entry.enqueuedAt;

      if (waitedMs >= entry.warnAfterMs) {
        if (entry.onWait) entry.onWait(waitedMs, state.queue.length);
        console.warn(`[LANE_QUEUE] Wait exceeded: lane=${lane} waitedMs=${waitedMs} queueAhead=${state.queue.length}`);
      }

      const taskId = nextTaskId++;
      const taskGeneration = state.generation;
      state.activeTaskIds.add(taskId);

      (async () => {
        const startTime = Date.now();
        try {
          const result = await entry.task();
          const completed = completeTask(state, taskId, taskGeneration);
          if (completed) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[LANE_QUEUE] Task done: lane=${lane} duration=${Date.now() - startTime}ms active=${state.activeTaskIds.size} queued=${state.queue.length}`);
            }
            pump();
          }
          entry.resolve(result);
        } catch (err) {
          const completed = completeTask(state, taskId, taskGeneration);
          console.error(`[LANE_QUEUE] Task error: lane=${lane} duration=${Date.now() - startTime}ms error="${String(err)}"`);
          if (completed) pump();
          entry.reject(err);
        }
      })();
    }
    state.draining = false;
  };

  pump();
}

/**
 * Set concurrency for a lane. Default is 1 (serial execution).
 * @param {string} lane
 * @param {number} maxConcurrent
 */
function setLaneConcurrency(lane, maxConcurrent) {
  const cleaned = (lane || '').trim() || CommandLane.Main;
  const state = getLaneState(cleaned);
  state.maxConcurrent = Math.max(1, Math.floor(maxConcurrent));
  drainLane(cleaned);
}

/**
 * Enqueue a task in a specific lane. Returns a promise that resolves
 * when the task completes.
 * @param {string} lane
 * @param {Function} task - async function to execute
 * @param {Object} [opts]
 * @param {number} [opts.warnAfterMs=2000]
 * @param {Function} [opts.onWait]
 * @returns {Promise}
 */
function enqueueInLane(lane, task, opts = {}) {
  const cleaned = (lane || '').trim() || CommandLane.Main;
  const warnAfterMs = opts.warnAfterMs ?? 2000;
  const state = getLaneState(cleaned);

  return new Promise((resolve, reject) => {
    state.queue.push({
      task: () => task(),
      resolve,
      reject,
      enqueuedAt: Date.now(),
      warnAfterMs,
      onWait: opts.onWait,
    });
    drainLane(cleaned);
  });
}

/**
 * Shorthand: enqueue in the Main lane.
 */
function enqueueCommand(task, opts) {
  return enqueueInLane(CommandLane.Main, task, opts);
}

/**
 * Get the number of queued + active tasks in a lane.
 */
function getQueueSize(lane = CommandLane.Main) {
  const resolved = (lane || '').trim() || CommandLane.Main;
  const state = lanes.get(resolved);
  if (!state) return 0;
  return state.queue.length + state.activeTaskIds.size;
}

/**
 * Get total queue size across all lanes.
 */
function getTotalQueueSize() {
  let total = 0;
  for (const s of lanes.values()) {
    total += s.queue.length + s.activeTaskIds.size;
  }
  return total;
}

/**
 * Clear all pending tasks from a lane. Active tasks finish normally.
 * Pending tasks receive a CommandLaneClearedError rejection.
 */
function clearLane(lane = CommandLane.Main) {
  const cleaned = (lane || '').trim() || CommandLane.Main;
  const state = lanes.get(cleaned);
  if (!state) return 0;

  const removed = state.queue.length;
  const pending = state.queue.splice(0);
  for (const entry of pending) {
    entry.reject(new CommandLaneClearedError(cleaned));
  }
  return removed;
}

/**
 * Reset all lanes to idle state. Used for graceful restart scenarios.
 * Bumps generation so stale completions are ignored, but preserves
 * queued entries. Drains any lanes with remaining work.
 */
function resetAllLanes() {
  const lanesToDrain = [];
  for (const state of lanes.values()) {
    state.generation += 1;
    state.activeTaskIds.clear();
    state.draining = false;
    if (state.queue.length > 0) {
      lanesToDrain.push(state.lane);
    }
  }
  for (const lane of lanesToDrain) {
    drainLane(lane);
  }
}

module.exports = {
  CommandLane,
  CommandLaneClearedError,
  enqueueInLane,
  enqueueCommand,
  setLaneConcurrency,
  getQueueSize,
  getTotalQueueSize,
  clearLane,
  resetAllLanes,
};
