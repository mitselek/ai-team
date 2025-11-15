# **Architectural Report: Implementing a Canonical Model Context Protocol (MCP) Client for Multi-LLM Agent Systems**

The development of robust AI agents capable of leveraging diverse, external toolsets requires a standardized interface to decouple tool implementation from LLM reasoning. The Model Context Protocol (MCP) serves as this essential canonical layer. For systems architecting an MCP client to interact with multiple major Large Language Model (LLM) providers (Anthropic Claude, OpenAI GPT, Google Gemini), the primary challenge lies in designing an efficient and reliable translation layer that harmonizes the standardized MCP specification with the proprietary tool calling formats of each platform.

This report details the architectural requirements for defining, executing, and translating tools and results within a multi-LLM MCP ecosystem, focusing specifically on filesystem operations provided by reference servers like @modelcontextprotocol/server-filesystem.1

## **I. The Model Context Protocol (MCP) Foundation for Agentic Tools**

The Model Context Protocol establishes a foundational architecture for trustworthy context delivery and tool invocation, defining clear roles to ensure system stability and modularity.2

### **A. Architecture and Roles in the MCP Ecosystem**

MCP operates on a client-server model designed around three core players 3:

1. **The LLM (Reasoner):** This component is the decision-maker. It receives definitions of available tools, decides when and how to use them based on the user's request, and processes the tool's resulting output to formulate a final, natural language response. Crucially, the LLM itself does not execute any code or tools; it merely requests their use.3
2. **The Client (Orchestrator):** The client acts as the central intelligence layer between the LLM and the external environment. Its responsibilities include connecting to various MCP servers (which may be local or remote 5), retrieving tool schemas, translating those schemas into the format required by the specific LLM being used, managing the LLM's tool requests, executing the requests against the MCP servers, and finally, formatting the server's output back into the LLM's context window.3 The client, therefore, is the system component where all complexity regarding provider interoperability is centralized.4
3. **The MCP Server (Tool Provider):** This entity houses and executes the actual application logic, such as performing secure file operations or database queries. The server exposes its capabilities—the tools—through a well-defined interface, providing the client with precise definitions of what the tool does and what input parameters it requires.3 Examples include reference servers for Filesystem, Git, and Fetching web content.1

### **B. Defining Tool Capabilities and Schemas**

The efficacy of an agent system hinges on the clarity and structure of its tool definitions. MCP mandates a structured approach for defining tool capabilities, ensuring they are model-controlled and universally discoverable.8

#### **1\. The Canonical Schema Standard (Query 1\)**

MCP establishes its tool structure as the single source of truth (SSOT). A tool definition adheres to a protocol standard and includes essential fields 8:

- name: A unique identifier (e.g., readFile or create_directory).
- title: An optional, human-readable name for display purposes.
- description: A necessary field detailing the tool's functionality, which the LLM uses to reason about when and how to invoke it.8
- inputSchema: The mandatory definition of parameters accepted by the tool.
- outputSchema: An optional definition describing the expected structure of the tool’s output.

The protocol specifies that both inputSchema and outputSchema MUST utilize the standardized **JSON Schema** format.10 This architectural decision is pivotal because JSON Schema provides a widely adopted, language-agnostic vocabulary for defining data structure, ensuring consistency and validity across different systems.10 By grounding the protocol in JSON Schema, MCP simplifies the interoperability challenge from a fundamental protocol translation to a wrapper and key-naming translation.

#### **2\. Filesystem Tool Examples**

Reference MCP servers, such as the Filesystem server, implement critical file management functionalities.1 For example, the list_files tool lists files and directories within a specified path. Its input schema, represented in JSON Schema, would precisely define parameters like path (a string), includeNested (a boolean for recursive listing), and maxEntries (an integer limit).12 Similarly, a delete_directory tool would require a path parameter and potentially a recursive boolean, explicitly documented for safe use.12 This rigorous schema definition is the basis for achieving reliable, type-safe agent interactions, as the LLM is constrained to output parameters conforming exactly to this structure.13

### **C. Tool Execution and Standardized Result Format**

When the LLM decides to use a tool, the MCP client sends a request, and the server returns a structured response (Query 2).

#### **1\. The Execution Protocol**

The client invokes the tool by sending a structured request, typically following a JSON-RPC pattern, containing the method tools/call, the tool name, and the arguments (parameters derived from the LLM's request).8

The server responds with a standardized wrapper, ensuring machine-readable predictability, which is critical for complex, potentially asynchronous operations 8:

- **toolCallId**: A unique identifier that must match the ID sent in the original request. This is essential for the client orchestrator to manage multiple concurrent tool calls and maintain conversational state.14
- **result**: The core payload object, which contains the output of the executed tool.
- **content**: Within the result, the payload is contained in a content array. This allows the MCP standard to handle various data types (text, images, resource links) consistently.8 For filesystem tools, the primary content type is type: "text", containing the file contents or a formatted tree structure.8
- **isError**: A clear boolean flag indicating whether the execution succeeded or if an error occurred (e.g., API failure or invalid input).8

#### **2\. The Simplification Paradox in Result Handling**

The MCP result format, while optimized for machine consumption and protocol robustness, introduces a challenge for subsequent LLM processing. The complex structure—a JSON object wrapped in a JSON-RPC response, containing an array of content objects—is highly verbose.8 The LLM, however, is best optimized for consuming and interpreting plain, human-like text injected into the conversation history.15

This architectural constraint means the client orchestrator cannot simply pass the raw JSON result back to the LLM. Doing so would consume excessive tokens and potentially confuse the model with extraneous protocol metadata. Therefore, the client must implement a subsequent transformation step to abstract and simplify the structured MCP result into a context-optimized string before injection, a process detailed in Section III-C. The rigor of the MCP standard necessitates a loss of transparency at the LLM interface to achieve efficiency and economy.

## **II. Cross-Platform LLM Tool Definition Comparison**

The core architectural requirement for a multi-LLM agent system is the ability to flawlessly convert the canonical MCP tool definition into the specific requirements of Anthropic Claude, OpenAI GPT, and Google Gemini (Query 3). While all three providers rely on JSON Schema principles, they differ fundamentally in the required structural wrappers and sometimes in the supported JSON Schema dialects.

### **A. LLM Provider Tool Formats: A Comparative Analysis**

The table below summarizes the critical fields required for tool definition across the major platforms, illustrating that the task for the MCP Client is primarily one of field mapping.

MCP Tooling Definition Mapping

| MCP Field (Canonical) | Anthropic Claude Format | OpenAI GPT Format | Google Gemini Format                       |
| :-------------------- | :---------------------- | :---------------- | :----------------------------------------- |
| name                  | name                    | name              | functionDeclaration.name                   |
| description           | description             | description       | functionDeclaration.description            |
| JSON Schema Source    | inputSchema             | input_schema      | parameters                                 |
| Wrapper Container     | N/A (Tool Object)       | N/A (Tool Object) | tools array, nested functionDeclaration 16 |

#### **1\. Structural Differences in Input Schema Mapping**

OpenAI and Google adopt the parameters key within their function declaration objects to contain the JSON Schema describing the function arguments.16 Anthropic, conversely, utilizes the key input_schema for the same purpose.9 The MCP Client must implement logic to dynamically select the correct target key based on the LLM provider currently being invoked.

#### **2\. JSON Schema Dialect Adaptation**

Although the foundation is JSON Schema, the translation process is complicated by variations in implementation—a necessity known as dialect adaptation. Historically, LLM providers have supported different subsets of the full JSON Schema standard.18

For instance, the definition of complex, recursive data structures, such as a nested directory tree returned by an advanced filesystem tool, might rely on keywords like $ref for defining reusable schemas or anyOf for union types. Recent development trends show convergence; Google, for example, has significantly expanded its JSON Schema support to include these advanced keywords, alongside support for libraries like Pydantic and Zod, aligning its capabilities with the robustness inherent in the MCP standard.19

However, the architect must assume that legacy models or even current models may not fully support every JSON Schema feature. The client must therefore incorporate a schema normalization layer. This layer ensures that if the canonical MCP definition utilizes complex structures, those structures are simplified, flattened, or adapted to the constraints of the specific target model (e.g., GPT-4 vs. an older GPT-3.5 model that had narrower support), preventing critical parameter parsing failures at the LLM boundary.20 This dynamic capability ensures the system remains compatible even as LLM tooling evolves.

### **B. LLM Tool Interaction Philosophies**

The operational difference between providers is also evident in how they integrate the tool call and result into the conversation history:

- **Anthropic Claude:** Utilizes a content-based architecture. Tool calls and the subsequent tool results are treated as structured items within the main message content array.21 This unified model requires the client to structure the response payload into a specific tool_result content block.21
- **OpenAI GPT and Google Gemini:** Employ a message-based, role-separated structure. The LLM's request is returned as a message with a specific tool/function call role. The client then executes the tool and returns the result in a subsequent message, typically labeled with a tool or function role.16 This explicit separation allows for clearer state management during multi-turn interactions.

## **III. The Interoperability Layer: Translation Architecture**

The most effective architectural solution for managing multi-LLM tools is to adopt a canonical format (MCP) and implement on-the-fly translation layers specific to each provider API.23 This strategy ensures maximum decoupling, maintainability, and efficiency.

### **A. Standard Pattern: Canonical MCP and On-the-Fly Translation (Query 4\)**

The best practice architecture is to define the MCP tools as the single, authoritative standard and convert them dynamically during the client initialization phase.

When the MCP client starts, it connects to all registered MCP servers (e.g., the Filesystem server) and retrieves the complete tool manifest.6 The client then translates this canonical MCP structure into an internal, LLM-agnostic tool representation (often achieved via agent frameworks) and then further translates this to the provider-specific API format (e.g., the list of functions expected by the OpenAI API).23 This pre-processing minimizes overhead during the crucial real-time query phase. If the set of available tools changes, the MCP Server can notify the client using the notifications/tools/list_changed protocol method, triggering an update to the translated schemas.8

### **B. Tool Definition Conversion (MCP $\\rightarrow$ LLM)**

The conversion process is executed by a dedicated Schema Converter module within the client orchestrator.24

#### **1\. Implementing the Mapping**

The conversion involves transforming the structural encapsulation of the JSON Schema arguments:

| Tool Definition Step     | Description                                                                                                                                                      |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Input Schema Mapping** | Map the MCP's canonical inputSchema to the provider's corresponding argument key (input_schema for Anthropic, parameters for OpenAI/Gemini).9                    |
| **Field Copying**        | Copy non-schema fields (name, description) directly, as they are largely consistent across providers.8                                                           |
| **Schema Normalization** | Ensure the JSON Schema structure remains compatible with the target LLM's specific parsing engine, especially regarding complex keywords or depth constraints.18 |

#### **2\. Translation Tools and Libraries**

Systems developers frequently utilize established agent frameworks to abstract this complexity. The langchain-mcp-adapters library, for example, is specifically designed to bridge the MCP ecosystem with LLM orchestration frameworks.25 This library allows developers to load MCP tools using an mcp.ClientSession and immediately translate them into a format usable by LLM agents, which then handles the subsequent translation to the specific provider API (e.g., openai:gpt-4.1).25 This approach consolidates the interoperability challenge into a proven, external library, reducing custom code development.

### **C. Tool Result Conversion (MCP Result $\\rightarrow$ LLM Context)**

This is the most nuanced phase of the agent pipeline, moving the machine-oriented MCP result into the context window for LLM reasoning. This transformation is not a simple data map; it is an act of **Context Engineering**.

#### **1\. The Result Transformation Pipeline**

The client orchestrator implements a three-stage pipeline to handle the MCP tool execution result (Query 4):

| Stage                                | Action                                                                                                                                                                    | Rationale                                                                                      |
| :----------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| 1\. Execution and Retrieval          | The client receives the structured JSON-RPC response from the MCP Server, identified by its toolCallId.14                                                                 | Ensures state management for asynchronous or parallel calls.                                   |
| 2\. Context Engineering & Compaction | The client analyzes the raw result (content payload). If the result is large (e.g., a file content dump), the client filters, summarizes, or abstracts the information.26 | Reduces token consumption, lowers cost, and improves the LLM’s focus.15                        |
| 3\. LLM-Specific Injection           | The compacted string is formatted into the message structure required by the target LLM API and injected into the conversation history.                                   | Adheres to provider-specific conversation protocols (e.g., content-based vs. message-based).16 |

#### **2\. The Client as an Intelligent Context Agent**

The necessity of Stage 2 demonstrates that the MCP Client’s role extends beyond simple transport; it must function as an Intelligent Context Agent.27 Filesystem operations, such as reading large configuration files or listing extensive directory structures, can easily generate outputs exceeding the LLM’s limited context window.28

The most effective systems deploy an abstraction pipeline:

- **Pre-filtering:** If a list_files tool returns 500 lines of output, the client, leveraging either an internal RAG system or basic heuristics, might only select the 10 most relevant lines (e.g., files modified recently or files matching a pattern) and abstract the rest.29
- **LLM Summarization:** If the result is a single large block of text (e.g., 100,000 tokens of code from a readFile tool), the client should use a specialized, cost-effective LLM to generate a summary or extract key findings, and only this summary is passed back to the main reasoning model.26

This process prioritizes contextual utility over protocol transparency. While the MCP result is perfectly structured for machine interpretation, the best practice involves sending a highly condensed, focused string representation back to the reasoning LLM to conserve context and cost (The Cost of Transparency).

#### **3\. LLM Provider Tool Result Injection Structure**

The final step is formatting the compacted string output into the correct message structure for the target model:

LLM Provider Tool Result Injection Structure (Conceptual)

| Target LLM           | Message Role     | Key Structure for Result                  | Example Content Injection                                                           |
| :------------------- | :--------------- | :---------------------------------------- | :---------------------------------------------------------------------------------- |
| **Anthropic Claude** | role: "tool"     | Structured Object within content array 21 | {"type": "tool_result", "tool_call_id": "...", "content":}                          |
| **OpenAI GPT**       | role: "tool"     | content field directly 22                 | {"tool_call_id": "...", "name": "tool_name", "content": "Summarized content text."} |
| **Google Gemini**    | role: "function" | Nested functionResponse object 16         | {"parts":}                                                                          |

## **IV. Production Best Practices for Agentic Tool Use**

Successful deployment of an MCP-integrated agent system requires adhering to advanced practices concerning context management, security, and orchestration (Query 5).

### **A. Advanced Context Engineering and Compaction**

Beyond basic summarization, production systems must implement sophisticated strategies to manage the context derived from MCP tool results.15

#### **1\. Tool Definition Optimization**

While MCP provides rich fields, the agent only benefits from precise information. Tool descriptions must be concise yet explicitly define the tool’s usage criteria to ensure the LLM invokes it correctly.15 Furthermore, the client orchestrator should employ selective tool exposure: instead of loading the definitions for every tool from all connected MCP servers (Filesystem, Git, Memory), the client should dynamically filter and only expose the subset of tools relevant to the immediate user prompt or current conversational context.26

#### **2\. Agentic Memory and Tool Result Compaction**

For agents engaging in long, iterative tasks (such as complex code generation that involves reading multiple files), retaining raw tool results indefinitely is cost-prohibitive.

A best practice is the use of **Tool Result Clearing and Structured Note-Taking**.15 After the LLM uses a tool result to perform a reasoning step, the client should clear the raw, token-heavy output from the message history or abstract it into a short, structured note persisted outside the context window (agentic memory).15 For example, the verbose output of a list_files command might be abstracted into a simple memory entry: "Note: Directory structure analyzed; key config files are present." This maintains the LLM’s awareness of past actions without exhausting the context budget.28

### **B. Robust Error Management and Security**

Reliability and trust are paramount, particularly when agents interact with sensitive systems like the filesystem.

#### **1\. Error Translation**

The MCP specification allows servers to report execution errors explicitly using the isError: true flag in the tool result.8 The client orchestrator must intercept these technical errors (e.g., API failures, invalid input data 8) and translate them into natural language, formatted appropriately for the LLM context.6 For example, a server response indicating "Path not found" should be converted into a message the LLM can interpret and use to inform the user (e.g., "The requested file path could not be located on the filesystem.") This prevents technical jargon from derailing the agent's reasoning flow.

#### **2\. Security and Authorization**

Given that filesystem tools can execute destructive operations (delete_file, move_path), security protocols must be strictly enforced.

The MCP specification recommends that there SHOULD always be a human-in-the-loop with the ability to deny tool invocations for trust and safety.8 The MCP client must enforce this approval gate: upon receiving an LLM's tool call request, especially for high-risk operations, the client should pause the execution flow and require explicit user approval before sending the tools/call command to the MCP server.8 Furthermore, the client must treat metadata and annotations from external servers as untrusted unless the server itself is explicitly verified.8

### **C. Leveraging Production Tooling and Frameworks**

Standardizing the translation layer significantly accelerates development and ensures adherence to protocols.

- **Framework Adoption:** Agent orchestration frameworks (like LangChain) provide necessary infrastructure for multi-LLM communication and abstract much of the provider-specific tool result injection logic. Libraries such as langchain-mcp-adapters act as the dedicated connector, providing high-level functions like load_mcp_tools to handle the initial MCP schema translation.25
- **FastMCP for Servers:** For developers building custom MCP servers or extending the standard Filesystem server, frameworks like FastMCP provide essential, production-ready features beyond the core protocol, including enterprise authentication, advanced deployment tools, and standardized patterns for server composition.30 Utilizing such established tools ensures the stability and security of the canonical tool source.

## **V. Conclusions and Recommendations**

The integration of MCP filesystem tools with diverse LLM providers is fundamentally solved by centralizing control within the MCP Client Orchestrator, establishing MCP as the canonical standard, and performing necessary translation dynamically.

The primary architectural challenge is managing the impedance mismatch between the robust, structured data required by the MCP (JSON Schema definitions, JSON-RPC results) and the fluid, token-efficient, textual context required by the LLMs for reasoning.

The following prescriptive recommendations serve as the blueprint for mission-critical systems:

1. **Maintain MCP as Canonical SSOT:** All tool definitions must originate and be maintained in the MCP JSON Schema format. The client must implement a dynamic conversion module to translate the inputSchema to the provider-specific keys (parameters or input_schema). The conversion must include a dialect normalization step to ensure compatibility with the specific JSON Schema subset supported by the target LLM model version.
2. **Implement an Intelligent Context Engineering Layer:** The client must not pass raw MCP results (the structured JSON content) back to the LLM. Instead, a dedicated process must analyze the result payload, summarize large outputs (especially from filesystem operations), and filter out irrelevant data before injection. This minimizes token consumption and is critical for efficiency and cost control.
3. **Mandate Structured Tool Result Handling:** Every tool result must be packaged into the precise message structure demanded by the target LLM (Content-Based for Claude; Role-Based for OpenAI/Gemini). Utilize the toolCallId robustly to ensure results are correctly correlated with asynchronous requests, maintaining conversational integrity.
4. **Enforce Security Gates for Filesystem Operations:** Implement a mandatory Human-in-the-Loop review for any potentially destructive filesystem tool invocation requested by the LLM, ensuring operational safety before the command is forwarded to the MCP server.

### **Works cited**

1. Example Servers \- Model Context Protocol, accessed November 15, 2025, [https://modelcontextprotocol.io/examples](https://modelcontextprotocol.io/examples)
2. Lightning Talk: Lessons from Building with the Model Context Protocol (MCP), accessed November 15, 2025, [https://www.youtube.com/watch?v=xXvxnEdMSxY](https://www.youtube.com/watch?v=xXvxnEdMSxY)
3. Reading the MCP (Model Context Protocol) specification can be intimidating. | by Jason Roell | Oct, 2025, accessed November 15, 2025, [https://medium.com/@roelljr/reading-the-mcp-model-context-protocol-specification-can-be-intimidating-71b3edd3e493](https://medium.com/@roelljr/reading-the-mcp-model-context-protocol-specification-can-be-intimidating-71b3edd3e493)
4. What is Model Context Protocol (MCP)? \- IBM, accessed November 15, 2025, [https://www.ibm.com/think/topics/model-context-protocol](https://www.ibm.com/think/topics/model-context-protocol)
5. Architecture overview \- Model Context Protocol, accessed November 15, 2025, [https://modelcontextprotocol.io/docs/learn/architecture](https://modelcontextprotocol.io/docs/learn/architecture)
6. Build an MCP client \- Model Context Protocol, accessed November 15, 2025, [https://modelcontextprotocol.io/docs/develop/build-client](https://modelcontextprotocol.io/docs/develop/build-client)
7. Use MCP servers in VS Code, accessed November 15, 2025, [https://code.visualstudio.com/docs/copilot/customization/mcp-servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
8. Tools \- Model Context Protocol, accessed November 15, 2025, [https://modelcontextprotocol.io/specification/2025-06-18/server/tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
9. Beginners Guide to Tool Use in Claude | by Judeaugustinej \- Medium, accessed November 15, 2025, [https://medium.com/@judeaugustinej/beginners-guide-to-tools-usage-in-claude-39d910ff76da](https://medium.com/@judeaugustinej/beginners-guide-to-tools-usage-in-claude-39d910ff76da)
10. JSON Schema, accessed November 15, 2025, [https://json-schema.org/](https://json-schema.org/)
11. Specification and documentation for the Model Context Protocol \- GitHub, accessed November 15, 2025, [https://github.com/modelcontextprotocol/modelcontextprotocol](https://github.com/modelcontextprotocol/modelcontextprotocol)
12. cyanheads/filesystem-mcp-server: A Model Context Protocol (MCP) server for platform-agnostic file capabilities, including advanced search/replace and directory tree traversal \- GitHub, accessed November 15, 2025, [https://github.com/cyanheads/filesystem-mcp-server](https://github.com/cyanheads/filesystem-mcp-server)
13. Structured outputs \- Claude Docs, accessed November 15, 2025, [https://docs.claude.com/en/docs/build-with-claude/structured-outputs](https://docs.claude.com/en/docs/build-with-claude/structured-outputs)
14. MCP Response Formatting: Guide & Best Practices 2025 \- BytePlus, accessed November 15, 2025, [https://www.byteplus.com/en/topic/541423](https://www.byteplus.com/en/topic/541423)
15. Effective context engineering for AI agents \- Anthropic, accessed November 15, 2025, [https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
16. Function calling with the Gemini API | Google AI for Developers, accessed November 15, 2025, [https://ai.google.dev/gemini-api/docs/function-calling](https://ai.google.dev/gemini-api/docs/function-calling)
17. Function Calling | Learn how to interact with OpenAI models, accessed November 15, 2025, [https://microsoft.github.io/Workshop-Interact-with-OpenAI-models/Part-2-labs/Function-Calling/](https://microsoft.github.io/Workshop-Interact-with-OpenAI-models/Part-2-labs/Function-Calling/)
18. Function Calling in LLMs: A Signature Model Approach \- Alexandre Quemy, accessed November 15, 2025, [https://quemy.info/2025-15-06-signature-function-models.html](https://quemy.info/2025-15-06-signature-function-models.html)
19. Improving Structured Outputs in the Gemini API, accessed November 15, 2025, [https://blog.google/technology/developers/gemini-api-structured-outputs/](https://blog.google/technology/developers/gemini-api-structured-outputs/)
20. Prompting vs JSON Mode vs Function Calling vs Constrained Generation vs SAP \- BAML, accessed November 15, 2025, [https://boundaryml.com/blog/schema-aligned-parsing](https://boundaryml.com/blog/schema-aligned-parsing)
21. Anthropic's Claude and MCP: A Deep Dive into Content-Based Tool Integration \- Medium, accessed November 15, 2025, [https://medium.com/@richardhightower/anthropics-claude-and-mcp-a-deep-dive-into-content-based-tool-integration-dcf18cba82f0](https://medium.com/@richardhightower/anthropics-claude-and-mcp-a-deep-dive-into-content-based-tool-integration-dcf18cba82f0)
22. Function calling \- OpenAI API, accessed November 15, 2025, [https://platform.openai.com/docs/guides/function-calling](https://platform.openai.com/docs/guides/function-calling)
23. How to use Anthropic MCP Server with open LLMs, OpenAI or Google Gemini \- Philschmid, accessed November 15, 2025, [https://www.philschmid.de/mcp-example-llama](https://www.philschmid.de/mcp-example-llama)
24. LangChain.MCP.SchemaConverter \- Hexdocs, accessed November 15, 2025, [https://hexdocs.pm/langchain_mcp/LangChain.MCP.SchemaConverter.html](https://hexdocs.pm/langchain_mcp/LangChain.MCP.SchemaConverter.html)
25. langchain-ai/langchain-mcp-adapters: LangChain MCP \- GitHub, accessed November 15, 2025, [https://github.com/langchain-ai/langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters)
26. Code execution with MCP: building more efficient AI agents \- Anthropic, accessed November 15, 2025, [https://www.anthropic.com/engineering/code-execution-with-mcp](https://www.anthropic.com/engineering/code-execution-with-mcp)
27. RepoTransAgent: Multi-Agent LLM Framework for Repository-Aware Code Translation, accessed November 15, 2025, [https://arxiv.org/html/2508.17720v1](https://arxiv.org/html/2508.17720v1)
28. Top techniques to Manage Context Lengths in LLMs \- Agenta, accessed November 15, 2025, [https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms)
29. How to summarize large documents : r/LangChain \- Reddit, accessed November 15, 2025, [https://www.reddit.com/r/LangChain/comments/1hxeqev/how_to_summarize_large_documents/](https://www.reddit.com/r/LangChain/comments/1hxeqev/how_to_summarize_large_documents/)
30. jlowin/fastmcp: The fast, Pythonic way to build MCP servers and clients \- GitHub, accessed November 15, 2025, [https://github.com/jlowin/fastmcp](https://github.com/jlowin/fastmcp)
