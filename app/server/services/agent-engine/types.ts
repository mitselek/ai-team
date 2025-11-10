// server/services/agent-engine/types.ts

import type { Agent, Task } from '@@/types'

export interface AgentLoop {
  agentId: string
  pollInterval: number // milliseconds
  isRunning: boolean
  lastPoll: Date
}

export interface AgentEngineManager {
  startAll(): Promise<void>
  stopAll(): Promise<void>
  start(agentId: string): Promise<void>
  stop(agentId: string): Promise<void>
  restart(agentId: string): Promise<void>
}

export interface TaskProcessor {
  processTask(agent: Agent, task: Task): Promise<void>
}

export interface DelegationEngine {
  assessDelegation(agent: Agent, task: Task): Promise<boolean>
  delegateTask(task: Task, senior: Agent, subordinate: Agent): Promise<void>
  selectSubordinate(agent: Agent, task: Task): Promise<Agent | null>
}

export interface StatusManager {
  handleBoredom(agent: Agent): Promise<void>
  handleStuck(agent: Agent, task: Task, error: Error): Promise<void>
  reportCompletion(agent: Agent, task: Task): Promise<void>
  escalateFailure(agent: Agent, task: Task, error: Error): Promise<void>
}

export interface TokenBudgetEnforcer {
  checkBudget(agent: Agent): Promise<boolean>
  handleBudgetExhausted(agent: Agent): Promise<void>
  warnOnLowBudget(agent: Agent): Promise<void>
}
