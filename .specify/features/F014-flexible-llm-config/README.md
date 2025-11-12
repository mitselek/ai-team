# F014: Flexible LLM Configuration with Task-Based Model Selection

**Feature ID:** F014-flexible-llm-config
**Status:** Planning
**Priority:** High
**Created:** 2025-11-13
**Depends On:** F013 Phase 9 (LLM provider testing complete)

---

## Overview

Implement flexible LLM configuration that supports multiple models per provider with task-based selection. Currently, each provider has only one `defaultModel`, limiting our ability to use different models for different tasks (e.g., Haiku for interviews, Sonnet for code review, Flash for orchestration).

This feature enables defining role + task specific model mappings, using tested models from Phase 9 (Haiku 4.5, Flash 2.5, etc.), while maintaining backward compatibility with existing code.

---

## Objectives

### Primary Objectives

1. **Multiple Models Per Provider**
   - Define model catalog per provider (short name → full model ID)
   - Support tested models: Claude 4.x series, Gemini 2.5 series
   - Enable easy addition of new models without code changes

2. **Task-Based Model Selection**
   - Map role + task combinations to specific models
   - Example: `interviewer` + `generate-questions` → Haiku 4.5
   - Example: `interviewer` + `analyze-response` → Flash 2.5
   - Example: `orchestrator` + `delegate-task` → Flash 2.5

3. **Apply Tested Model Winners**
   - Anthropic default: Haiku 4.5 (cost-effective, perfect performance)
   - Google default: Flash 2.5 (optimized for agents, perfect performance)
   - Quality tier: Sonnet 4.5, Pro 2.5
   - Based on Phase 9 systematic testing (6 models, 3-5 exchanges each)

4. **Fail-Fast Error Handling**
   - No automatic fallback between models
   - Clear error messages showing which provider/model failed
   - Let callers decide how to handle failures

### Secondary Objectives

1. Maintain backward compatibility with existing code
2. Support explicit provider/model overrides
3. Enable gradual migration from old to new config
4. Document configuration patterns for future roles

---

## Context

### Recent Work

**F013 Phase 9 - LLM Provider Testing** (Complete):

- Systematically tested 6 latest models (3 Anthropic Claude 4.x + 3 Google Gemini 2.5)
- Testing methodology: 3-5 exchange interviews per model, identical scenario
- Results: 4 perfect models (zero hallucinations), 2 conditional models (minor "Marcus:" prefix)
- Winners identified: Haiku 4.5 ($1/$5 MTok), Flash 2.5 (agent-optimized)
- Documentation: `.specify/features/F013-phase-9-backend-fixes/llm-provider-testing.md`

**Current Configuration Limitations**:

- One `defaultModel` per provider (string)
- Role-based selection via `modelByRole` (flat mapping)
- Hard to specify different models for different tasks
- Testing required manual config editing 6 times

**User Requirements** (from clarifying questions):

1. Model selection: **Role + task combination** (e.g., interviewer role, generate-questions task)
2. Fallback strategy: **None** - fail fast, report which LLM failed
3. Config format: **Nested models per provider** (short name → full ID)

---

## Scope

### In Scope

**Type Definitions:**

- `TaskType` - String literal type for tasks (generate-questions, analyze-response, etc.)
- `ModelMapping` - Interface for { provider, model } mappings
- Update `LLMServiceOptions` - Add optional `agentRole`, `taskType` fields
- Update `ProviderConfig` - Add `models: Record<string, string>` dictionary

**Configuration Structure:**

- Model catalogs per provider (Anthropic, Google, OpenAI)
- Role-task mappings: `roleModelMappings[role][taskType] → { provider, model }`
- Tested model names: Haiku 4.5, Sonnet 4.5, Opus 4.1, Flash 2.5, Flash-Lite 2.5, Pro 2.5
- Legacy model names for backward compatibility
- Default task (`'default'`) for role-only lookups

**Helper Functions:**

- `getModelForTask(role, taskType)` - Returns { provider, modelId }
- `resolveModelId(provider, modelName)` - Resolves short name → full ID
- Update `getModelForRole()` - Backward compatibility via default task
- Export new functions from config module

**Service Integration:**

- Update `llm/index.ts` generate() - Use task-based lookup
- Priority: explicit override > task mapping > role default > provider default
- Fail-fast error handling (no automatic model fallback)
- Clear error messages with provider/model context

**Caller Updates:**

- Interview service: Use `taskType: 'generate-questions'` etc.
- Orchestrator service: Use `taskType: 'delegate-task'` etc.
- Maintain backward compatibility (old callers still work)

**Testing:**

- Verify existing tests still pass
- Manual verification: check logs for correct model selection
- Document model selection in logs

### Out of Scope

**Not Included:**

- Automatic fallback between models (user requirement: fail fast)
- Cross-provider fallback logic (keep provider priority as-is)
- Model performance metrics tracking
- Cost tracking per task type
- Dynamic model selection based on task complexity
- Runtime configuration updates (DB-driven config)
- Admin UI for model configuration
- Model A/B testing framework
- Token usage optimization per model

**Future Enhancements:**

- Model metadata (cost, speed, quality ratings)
- Usage analytics per task type
- Automatic model recommendation engine
- Configuration validation tests
- Model deprecation warnings
- Provider health checks

---

## Design

### Configuration Structure

#### Before (Current):

```typescript
interface LLMConfig {
  providers: {
    anthropic: ProviderConfig // defaultModel: 'claude-3-haiku-20240307'
    google: ProviderConfig // defaultModel: 'gemini-1.5-flash'
    openai: ProviderConfig
  }
  providerPriority: LLMProvider[]
  modelByRole: Record<string, Record<LLMProvider, string>> // Flat role mapping
}
```

**Limitations:**

- One model per provider
- No task granularity
- Hard-coded model IDs throughout
- Difficult to test multiple models

#### After (Proposed):

```typescript
interface LLMConfig {
  providers: {
    anthropic: {
      apiKey: string
      models: {
        'haiku-4.5': 'claude-haiku-4-5-20251001'
        'sonnet-4.5': 'claude-sonnet-4-5-20250929'
        'opus-4.1': 'claude-opus-4-1-20250805'
        haiku: 'claude-3-haiku-20240307' // Legacy
      }
      defaultModel: 'haiku-4.5' // References models key
      // ... rest of ProviderConfig
    }
    google: {
      models: {
        flash: 'gemini-2.5-flash'
        'flash-lite': 'gemini-2.5-flash-lite'
        pro: 'gemini-2.5-pro'
        'flash-1.5': 'gemini-1.5-flash' // Legacy
      }
      defaultModel: 'flash'
      // ...
    }
    openai: {
      /* similar */
    }
  }

  roleModelMappings: {
    interviewer: {
      'generate-questions': { provider: 'anthropic'; model: 'haiku-4.5' }
      'analyze-response': { provider: 'google'; model: 'flash' }
      'final-report': { provider: 'anthropic'; model: 'sonnet-4.5' }
      default: { provider: 'google'; model: 'flash' }
    }
    worker: {
      default: { provider: 'anthropic'; model: 'haiku-4.5' }
    }
    manager: {
      default: { provider: 'google'; model: 'flash' }
    }
    director: {
      default: { provider: 'google'; model: 'pro' }
    }
  }

  // Keep for backward compatibility during migration
  modelByRole: Record<string, Record<LLMProvider, string>>
}
```

**Benefits:**

- Multiple models per provider
- Task-specific selection
- Short names for easy configuration
- Legacy support for gradual migration
- Clear mapping of role+task to model

### Type Definitions

```typescript
// New task types (extend as needed)
export type TaskType =
  | 'generate-questions'
  | 'analyze-response'
  | 'final-report'
  | 'delegate-task'
  | 'budget-calculation'
  | 'default'

// Model mapping structure
export interface ModelMapping {
  provider: LLMProvider
  model: string // Short name like 'haiku-4.5', 'flash'
}

// Updated service options
export interface LLMServiceOptions {
  agentId: string
  agentRole?: string // NEW: Role for task lookup
  taskType?: TaskType // NEW: Specific task type
  provider?: LLMProvider // Can still override
  model?: string // Can still override (short name or full ID)
  temperature?: number
  maxTokens?: number
  correlationId?: string
}

// Updated provider config
export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  models: Record<string, string> // NEW: Short name → full model ID
  defaultModel: string // CHANGED: Now references models key
  maxRetries: number
  timeout: number
  rateLimit: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}
```

### API Compatibility

#### Priority Order (How Model Gets Selected):

```typescript
// 1. EXPLICIT OVERRIDE (highest priority)
llmService.generate({
  provider: LLMProvider.ANTHROPIC,
  model: 'sonnet-4.5' // Or full ID
  // ... other options
})

// 2. TASK-BASED MAPPING (recommended)
llmService.generate({
  agentRole: 'interviewer',
  taskType: 'generate-questions'
  // Looks up: roleModelMappings.interviewer['generate-questions']
  // → { provider: 'anthropic', model: 'haiku-4.5' }
})

// 3. ROLE DEFAULT (backward compatible)
llmService.generate({
  agentRole: 'interviewer'
  // No taskType → uses taskType='default'
  // Looks up: roleModelMappings.interviewer['default']
})

// 4. PROVIDER DEFAULT (fallback)
llmService.generate({
  // No role, no task
  // Uses providerPriority[0] with defaultModel
})
```

#### Backward Compatibility:

```typescript
// OLD CODE - Still works
const model = getModelForRole('worker', LLMProvider.ANTHROPIC)
// Internally uses getModelForTask('worker', 'default')

// OLD API - Still works
llmService.generate({
  agentId: 'agent-123',
  provider: LLMProvider.ANTHROPIC
  // Uses provider's defaultModel
})
```

### Error Handling (Fail-Fast)

```typescript
// NO automatic fallback between models
try {
  const response = await llmService.generate({ ... })
} catch (error) {
  if (error instanceof LLMServiceError) {
    // Clear error showing which provider/model failed
    console.error(`LLM failed: ${error.provider} (${error.model})`)
    // Caller decides what to do:
    // - Retry with same model
    // - Try different provider
    // - Report to user
    // - Log and continue
  }
}
```

**No automatic retries with different models** - User requirement: "just report back that this specific LLM is failing"

### Model Selection from Phase 9 Testing

Based on systematic testing results (`.specify/features/F013-phase-9-backend-fixes/llm-provider-testing.md`):

**Perfect Performers (Zero Hallucinations):**

- `claude-haiku-4-5-20251001` - Cost-effective ($1/$5 MTok), fast, perfect
- `claude-sonnet-4-5-20250929` - High quality, perfect
- `gemini-2.5-flash` - Agent-optimized, fast, perfect
- `gemini-2.5-pro` - Highest quality, perfect

**Conditional (Minor "Marcus:" Prefix):**

- `claude-opus-4-1-20250805` - Reasoning-focused, adds speaker label
- `gemini-2.5-flash-lite` - Speed-optimized, intermittent label

**Default Assignments:**

- Anthropic default: `haiku-4.5` (best cost/performance)
- Google default: `flash` (optimized for agents)
- Quality tier: `sonnet-4.5`, `pro` (when quality matters)
- Avoid: `opus-4.1`, `flash-lite` (unless hallucination acceptable)

---

## Implementation Tasks

### Phase 1: Type Definitions (~10 min)

**Task 1.1**: Add TaskType and ModelMapping to `types.ts`

**Files:**

- `app/server/services/llm/types.ts`

**Changes:**

```typescript
export type TaskType =
  | 'generate-questions'
  | 'analyze-response'
  | 'final-report'
  | 'delegate-task'
  | 'budget-calculation'
  | 'default'

export interface ModelMapping {
  provider: LLMProvider
  model: string
}
```

**Acceptance:** Types compile, no errors

---

**Task 1.2**: Update LLMServiceOptions interface

**Files:**

- `app/server/services/llm/types.ts`

**Changes:**

```typescript
export interface LLMServiceOptions {
  agentId: string
  agentRole?: string // NEW
  taskType?: TaskType // NEW
  provider?: LLMProvider
  model?: string
  temperature?: number
  maxTokens?: number
  correlationId?: string
}
```

**Acceptance:** Backward compatible (all new fields optional)

---

**Task 1.3**: Update ProviderConfig interface

**Files:**

- `app/server/services/llm/types.ts`

**Changes:**

```typescript
export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  models: Record<string, string> // NEW
  defaultModel: string // Now references models key
  maxRetries: number
  timeout: number
  rateLimit: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}
```

**Acceptance:** Breaking change to interface, compiles

---

### Phase 2: Configuration Structure (~20 min)

**Task 2.1**: Update LLMConfig interface in `config.ts`

**Files:**

- `app/server/services/llm/config.ts`

**Changes:**

```typescript
interface LLMConfig {
  providers: {
    anthropic: ProviderConfig
    openai: ProviderConfig
    google: ProviderConfig
  }
  roleModelMappings: Record<string, Record<TaskType, ModelMapping>> // NEW
  modelByRole: Record<string, Record<LLMProvider, string>> // KEEP
  providerPriority: LLMProvider[]
}
```

**Acceptance:** Interface updated, compiles

---

**Task 2.2**: Populate provider model catalogs

**Files:**

- `app/server/services/llm/config.ts`

**Changes:**

```typescript
providers: {
  anthropic: {
    apiKey: process.env.NUXT_ANTHROPIC_API_KEY || '',
    models: {
      // Tested models (Phase 9)
      'haiku-4.5': 'claude-haiku-4-5-20251001',
      'sonnet-4.5': 'claude-sonnet-4-5-20250929',
      'opus-4.1': 'claude-opus-4-1-20250805',
      // Legacy models
      'haiku': 'claude-3-haiku-20240307',
      'sonnet': 'claude-3-5-sonnet-20241022'
    },
    defaultModel: 'haiku-4.5',
    maxRetries: 3,
    timeout: 60000,
    rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 }
  },
  google: {
    apiKey: process.env.NUXT_GOOGLE_API_KEY || '',
    models: {
      // Tested models (Phase 9)
      'flash': 'gemini-2.5-flash',
      'flash-lite': 'gemini-2.5-flash-lite',
      'pro': 'gemini-2.5-pro',
      // Legacy models
      'flash-1.5': 'gemini-1.5-flash',
      'pro-1.5': 'gemini-1.5-pro'
    },
    defaultModel: 'flash',
    maxRetries: 3,
    timeout: 60000,
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 50000 }
  },
  openai: {
    // Keep as-is for now
    apiKey: process.env.NUXT_OPENAI_API_KEY || '',
    models: {
      'gpt-4': 'gpt-4-turbo-preview',
      'gpt-3.5': 'gpt-3.5-turbo'
    },
    defaultModel: 'gpt-4',
    maxRetries: 3,
    timeout: 60000,
    rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 }
  }
}
```

**Acceptance:** All tested models present, defaults use Phase 9 winners

---

**Task 2.3**: Add roleModelMappings configuration

**Files:**

- `app/server/services/llm/config.ts`

**Changes:**

```typescript
roleModelMappings: {
  'interviewer': {
    'generate-questions': { provider: LLMProvider.ANTHROPIC, model: 'haiku-4.5' },
    'analyze-response': { provider: LLMProvider.GOOGLE, model: 'flash' },
    'final-report': { provider: LLMProvider.ANTHROPIC, model: 'sonnet-4.5' },
    'default': { provider: LLMProvider.GOOGLE, model: 'flash' }
  },
  'worker': {
    'default': { provider: LLMProvider.ANTHROPIC, model: 'haiku-4.5' }
  },
  'manager': {
    'default': { provider: LLMProvider.GOOGLE, model: 'flash' }
  },
  'director': {
    'default': { provider: LLMProvider.GOOGLE, model: 'pro' }
  }
}
```

**Acceptance:** Mappings defined, using tested models

---

### Phase 3: Helper Functions (~20 min)

**Task 3.1**: Implement getModelForTask()

**Files:**

- `app/server/services/llm/config.ts`

**Changes:**

```typescript
export function getModelForTask(
  role: string,
  taskType: TaskType = 'default'
): { provider: LLMProvider; modelId: string } | null {
  const config = loadConfig()

  // Look up role + task mapping
  const mapping = config.roleModelMappings[role]?.[taskType]
  if (!mapping) {
    logger.warn({ role, taskType }, 'No model mapping found for role+task')
    return null
  }

  // Resolve short model name to full model ID
  const providerConfig = config.providers[mapping.provider]
  const modelId = providerConfig.models[mapping.model]

  if (!modelId) {
    logger.error({ role, taskType, mapping }, 'Model not found in provider config')
    return null
  }

  return {
    provider: mapping.provider,
    modelId
  }
}
```

**Acceptance:** Returns correct model ID, handles missing mappings

---

**Task 3.2**: Update getModelForRole() for backward compatibility

**Files:**

- `app/server/services/llm/config.ts`

**Changes:**

```typescript
export function getModelForRole(role: string, provider: LLMProvider): string {
  const config = loadConfig()

  // Try new system first (task='default')
  const taskModel = getModelForTask(role, 'default')
  if (taskModel && taskModel.provider === provider) {
    return taskModel.modelId
  }

  // Fallback to old modelByRole
  const oldModel = config.modelByRole[role]?.[provider]
  if (oldModel) return oldModel

  // Last resort: provider default
  const providerConfig = config.providers[provider]
  return providerConfig.models[providerConfig.defaultModel] || providerConfig.defaultModel
}
```

**Acceptance:** Old code still works, uses new system internally

---

**Task 3.3**: Implement resolveModelId() helper

**Files:**

- `app/server/services/llm/config.ts`

**Changes:**

```typescript
export function resolveModelId(provider: LLMProvider, modelName: string): string {
  const config = loadConfig()
  const providerConfig = config.providers[provider]

  // If it's a short name, resolve it
  if (providerConfig.models[modelName]) {
    return providerConfig.models[modelName]
  }

  // Otherwise assume it's already a full model ID
  return modelName
}
```

**Acceptance:** Handles short names and full IDs

---

### Phase 4: Service Integration (~15 min)

**Task 4.1**: Update LLM service generate() method

**Files:**

- `app/server/services/llm/index.ts`

**Changes:**

```typescript
async generate(options: LLMServiceOptions): Promise<LLMResponse> {
  const { agentRole, taskType, provider: requestedProvider, model: requestedModel } = options

  let provider: LLMProvider
  let model: string

  // Priority: explicit override > task mapping > provider priority
  if (requestedProvider && requestedModel) {
    provider = requestedProvider
    model = resolveModelId(provider, requestedModel)
  } else if (agentRole && taskType) {
    const taskModel = getModelForTask(agentRole, taskType)
    if (taskModel) {
      provider = taskModel.provider
      model = taskModel.modelId
    } else {
      // No mapping found, use provider priority
      const priorityList = getProviderPriority()
      provider = priorityList[0]
      const config = getProviderConfig(provider)
      model = resolveModelId(provider, config.defaultModel)
    }
  } else if (agentRole) {
    // Use role default (task='default')
    const taskModel = getModelForTask(agentRole, 'default')
    if (taskModel) {
      provider = taskModel.provider
      model = taskModel.modelId
    } else {
      // Fallback to provider priority
      const priorityList = getProviderPriority()
      provider = priorityList[0]
      const config = getProviderConfig(provider)
      model = resolveModelId(provider, config.defaultModel)
    }
  } else {
    // No role/task, use provider priority
    const priorityList = getProviderPriority()
    provider = priorityList[0]
    const config = getProviderConfig(provider)
    model = resolveModelId(provider, config.defaultModel)
  }

  logger.info(
    { provider, model, agentRole, taskType },
    'Model selected for generation'
  )

  // Rest of generate() implementation
  // IMPORTANT: NO FALLBACK - if this provider/model fails, throw error
  try {
    // ... call provider API
  } catch (error) {
    throw new LLMServiceError(
      `LLM generation failed: ${provider} (${model})`,
      provider,
      'generation_error',
      false,  // Not retryable with different model
      error
    )
  }
}
```

**Acceptance:** Task-based lookup works, fails fast on error

---

### Phase 5: Update Callers (~10 min)

**Task 5.1**: Update interview service

**Files:**

- `app/server/services/interview/questions.ts`

**Changes:**

```typescript
const response = await llmService.generate({
  agentId: interviewState.agentId,
  agentRole: 'interviewer', // NEW
  taskType: 'generate-questions', // NEW
  systemPrompt,
  userPrompt,
  temperature: 0.7,
  maxTokens: 1500,
  correlationId
})
```

**Acceptance:** Interview uses haiku-4.5

---

**Task 5.2**: Update orchestrator service (if applicable)

**Files:**

- `app/server/services/orchestrator.ts`

**Changes:**

```typescript
const response = await llmService.generate({
  agentId: orchestratorId,
  agentRole: 'manager',
  taskType: 'delegate-task' // NEW
  // ...
})
```

**Acceptance:** Orchestrator uses flash

---

### Phase 6: Testing & Validation (~10 min)

**Task 6.1**: Run existing tests

```bash
npm run test tests/services/interview/
npm run test tests/api/
npm run typecheck
```

**Acceptance:** All tests pass, no type errors

---

**Task 6.2**: Manual verification

```bash
# Start dev server
npm run dev

# Test interview
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{
    "interviewTypeId": "hr-general",
    "candidateName": "Test User",
    "candidateEmail": "test@example.com"
  }'

# Check logs for: "Model selected for generation: anthropic (claude-haiku-4-5-20251001)"
```

**Acceptance:** Correct models selected, logs show task-based selection

---

### Phase 7: Documentation & Commit (~10 min)

**Task 7.1**: Update this README with completion status

**Task 7.2**: Git workflow

```bash
git status
git diff --stat
git add -A
git status
git commit -m "feat: flexible LLM config with task-based model selection

BREAKING CHANGE: ProviderConfig now requires 'models' dictionary

NEW FEATURES:
- Task-based model selection via roleModelMappings
- Multiple models per provider (short name → full ID)
- Tested models from Phase 9: Haiku 4.5, Sonnet 4.5, Flash 2.5, Pro 2.5
- Fail-fast error handling (no automatic fallback)

BACKWARD COMPATIBILITY:
- Old getModelForRole() still works
- Explicit overrides still supported
- Legacy model names included

DEFAULTS:
- Anthropic: haiku-4.5 (cost-effective winner)
- Google: flash (agent-optimized winner)
- Interview tasks: generate-questions (haiku-4.5), analyze (flash)

Based on F013 Phase 9 systematic testing (6 models, 4 perfect performers)"

git status  # Verify clean
git log -1 --oneline
```

**Acceptance:** Clean commit, working tree clean

---

## Acceptance Criteria

### Functional Requirements

- [ ] Multiple models defined per provider (catalog with short names)
- [ ] Task-based model selection working (role + task → model)
- [ ] Tested models from Phase 9 present in catalogs
- [ ] Default models use Phase 9 winners (Haiku 4.5, Flash 2.5)
- [ ] Fail-fast error handling (no automatic fallback)
- [ ] Clear error messages showing provider/model failures

### Backward Compatibility

- [ ] Old API calls still work (no agentRole/taskType provided)
- [ ] getModelForRole() still functional
- [ ] Explicit provider/model overrides still work
- [ ] Existing tests pass without modification
- [ ] Legacy model names supported

### Code Quality

- [ ] TypeScript: 0 errors (strict mode)
- [ ] All new functions have proper types
- [ ] Logging present for model selection
- [ ] Error handling with structured errors
- [ ] Configuration validated on load

### Testing

- [ ] Existing unit tests pass
- [ ] Existing API tests pass
- [ ] Manual verification: interview uses correct model
- [ ] Manual verification: logs show model selection
- [ ] No regressions in interview workflow

### Documentation

- [ ] This README complete with design and tasks
- [ ] Inline code comments for complex logic
- [ ] Configuration examples documented
- [ ] Task types documented with usage examples
- [ ] Migration guide for adding new roles/tasks

---

## Risks

### Technical Risks

**Risk 1: Breaking Change to ProviderConfig**

- **Impact:** Existing code referencing defaultModel as full ID will break
- **Likelihood:** High
- **Mitigation:** Include legacy model names, gradual migration
- **Fallback:** Keep full IDs as fallback in resolveModelId()

**Risk 2: Task Type Typos**

- **Impact:** Falls back to default instead of intended model
- **Likelihood:** Medium
- **Mitigation:** TypeScript literal types for compile-time checking
- **Fallback:** Runtime validation, log warnings for unknown tasks

**Risk 3: Missing Role/Task Mappings**

- **Impact:** Falls back to provider default, may use wrong model
- **Likelihood:** Medium (during development)
- **Mitigation:** Comprehensive default mappings, log warnings
- **Fallback:** Graceful degradation to provider default

**Risk 4: Model Name Conflicts**

- **Impact:** Wrong model selected if short names clash
- **Likelihood:** Low (provider-specific names)
- **Mitigation:** Use provider-specific short names (haiku-4.5, not just haiku)
- **Fallback:** Allow full model IDs as override

### Schedule Risks

**Risk 1: Caller Updates Take Longer**

- **Impact:** Migration incomplete, mixed old/new patterns
- **Likelihood:** Medium
- **Mitigation:** Backward compatibility allows gradual migration
- **Fallback:** Phase 5 (caller updates) is optional, can be done later

**Risk 2: Test Failures**

- **Impact:** Existing tests break due to interface changes
- **Likelihood:** Low (backward compatible)
- **Mitigation:** Keep old interfaces working during transition
- **Fallback:** Extend timeline for test fixes

---

## Estimated Time

- **Phase 1: Types** - 10 minutes
- **Phase 2: Config** - 20 minutes
- **Phase 3: Helpers** - 20 minutes
- **Phase 4: Service** - 15 minutes
- **Phase 5: Callers** - 10 minutes
- **Phase 6: Testing** - 10 minutes
- **Phase 7: Documentation** - 10 minutes

**Total: 95 minutes (~1.5 hours)**

**Contingency: +30 minutes for debugging/fixes**

**Total with buffer: ~2 hours**

---

## Success Metrics

### Quantitative

- [ ] 6+ models defined per provider (Anthropic, Google)
- [ ] 4+ task types defined (generate, analyze, delegate, budget)
- [ ] 4+ roles with task mappings (interviewer, worker, manager, director)
- [ ] 0 TypeScript errors
- [ ] 100% existing tests passing
- [ ] 0 regressions in interview workflow

### Qualitative

- [ ] Configuration is clear and easy to understand
- [ ] Adding new role/task mappings is straightforward
- [ ] Error messages are helpful for debugging
- [ ] Logs clearly show model selection reasoning
- [ ] Code is maintainable and well-documented

---

## Migration Guide

### Adding New Task Types

```typescript
// 1. Add to TaskType union in types.ts
export type TaskType =
  | 'generate-questions'
  | 'new-task-type'  // Add here
  | 'default'

// 2. Add mapping in config.ts
roleModelMappings: {
  'role-name': {
    'new-task-type': { provider: LLMProvider.GOOGLE, model: 'flash' }
  }
}

// 3. Use in caller
llmService.generate({
  agentRole: 'role-name',
  taskType: 'new-task-type'
})
```

### Adding New Models

```typescript
// 1. Add to provider models catalog in config.ts
providers: {
  anthropic: {
    models: {
      'new-model': 'claude-new-model-id',  // Add here
      // ... existing models
    }
  }
}

// 2. Use in role mappings or override
roleModelMappings: {
  'role': {
    'task': { provider: LLMProvider.ANTHROPIC, model: 'new-model' }
  }
}
```

### Adding New Roles

```typescript
// 1. Add to roleModelMappings in config.ts
roleModelMappings: {
  'new-role': {
    'task-1': { provider: LLMProvider.GOOGLE, model: 'flash' },
    'task-2': { provider: LLMProvider.ANTHROPIC, model: 'haiku-4.5' },
    'default': { provider: LLMProvider.GOOGLE, model: 'flash' }
  }
}

// 2. Use in agent creation
const agent = {
  role: 'new-role',
  // ... other fields
}

// 3. Use in LLM calls
llmService.generate({
  agentRole: 'new-role',
  taskType: 'task-1'
})
```

---

## Related Features

**Completed:**

- F013 Phase 9 - LLM Provider Testing (testing results feed into this feature)

**Depends On:**

- None (standalone improvement)

**Enables:**

- Better cost optimization (use cheaper models for simple tasks)
- Quality optimization (use better models for complex tasks)
- A/B testing different models per task
- Future: Model performance tracking per task

**Related Documentation:**

- `.specify/features/F013-phase-9-backend-fixes/llm-provider-testing.md` - Testing results
- `app/server/services/llm/` - LLM service implementation
- `types/index.ts` - Type definitions

---

## Notes

### Design Decisions

1. **Why short names?**
   - Easier configuration (no typos in long model IDs)
   - Centralized model ID management
   - Easy to update model versions without changing mappings

2. **Why task-based over complexity-based?**
   - Tasks are explicit in code (clear intent)
   - Complexity is subjective and hard to measure
   - Tasks align with user mental model

3. **Why no automatic fallback?**
   - User requirement: "just report back that LLM is failing"
   - Makes failures visible (transparency principle from Phase 9)
   - Callers can implement fallback logic if needed

4. **Why keep modelByRole?**
   - Backward compatibility during migration
   - Some code may not need task granularity
   - Gradual migration path

### Future Enhancements

1. **Model Metadata:**

   ```typescript
   models: {
     'haiku-4.5': {
       id: 'claude-haiku-4-5-20251001',
       cost: { input: 1, output: 5 },  // $ per MTok
       speed: 'fast',
       quality: 'standard'
     }
   }
   ```

2. **Usage Analytics:**
   - Track token usage per task type
   - Cost analysis per role
   - Performance metrics per model

3. **Dynamic Selection:**
   - Auto-select model based on task complexity
   - Cost budget constraints
   - Response time requirements

4. **Configuration UI:**
   - Admin interface for model management
   - Test model performance
   - A/B test configurations

---

## Workflow Decision

After review, choose one of these workflows:

### Option A: Manual Implementation

- Developer implements changes manually
- Follows task breakdown in this README
- Iterative testing and validation
- Estimated: 2 hours

### Option B: Gemini CLI (Parallel Tasks)

- Create 7 prompt files (one per phase)
- Run tasks in parallel where possible
- Review and integrate outputs
- Estimated: 30 minutes setup + 15 minutes execution + 45 minutes review = 90 minutes

### Option C: GitHub Copilot Agent

- Provide this README as specification
- Agent implements all phases
- Review and test implementation
- Estimated: 15 minutes setup + 30 minutes agent work + 30 minutes review = 75 minutes

### Option D: Hybrid (Manual + Copilot)

- Use Copilot for boilerplate (types, configs)
- Manual implementation of complex logic (service integration)
- Iterative testing throughout
- Estimated: 90 minutes

**Recommendation:** Choose based on:

- Confidence in automation tools (B/C) vs manual control (A)
- Time availability (C fastest, A most predictable)
- Complexity tolerance (A safest, B/C higher risk)
