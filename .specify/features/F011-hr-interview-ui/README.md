# F011: HR Interview UI

**Objective:** Create a user interface for the HR Interview System that allows users to start, conduct, and review interviews with Marcus, the HR bot.

**Key Features:**

- **Interview List Page:** A new page at `/interviews` that displays a list of all past and present interviews.
- **Interview Page:** A new page at `/interviews/[id]` that displays the details of a specific interview, including the chat history.
- **Start Interview Component:** A new component that allows users to start a new interview. This could be a button on the `index.vue` page or on the new `/interviews` page.
- **Chat Component:** A reusable component for the real-time chat interface with Marcus.
- **`useInterview` Composable:** A new composable to manage the state of the interviews, including fetching data from the API and handling real-time updates.

**Implementation Steps:**

1. **Create the `useInterview` composable:** This will be the first step, as it will be the foundation for the rest of the UI. It will handle all communication with the `/api/interview` endpoints.
2. **Create the Interview List Page:** This page will use the `useInterview` composable to fetch and display a list of interviews.
3. **Create the Interview Page:** This page will display the details of a single interview, including the chat history. It will also use the `useInterview` composable.
4. **Create the Chat Component:** This component will be used on the Interview Page to display the chat with Marcus. It will handle sending and receiving messages in real-time. For real-time, we'll start with a simple polling mechanism and suggest a WebSocket-based approach for a future iteration.
5. **Create the Start Interview Component:** This component will allow users to start a new interview. It will call the `POST /api/interview/start` endpoint.
6. **Integrate the new pages and components:** We'll add links to the new pages in the main navigation and integrate the Start Interview Component into the appropriate page.
