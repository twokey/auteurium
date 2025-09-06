## **Conceptual Canvas Design: Snippet Connector App**

**1\. Overall Canvas Environment:**

* **Workspace:** A large, seemingly infinite (or very large and scrollable) 2D workspace for each project. This is where all snippets for the active project will reside.  
* **Navigation:**  
  * **Panning:** Users can click and drag the background of the canvas to move around. Scrollbars would also appear if the content exceeds the viewport.  
  * **Zooming:** Users can zoom in and out using a mouse wheel, pinch gestures on touch devices (if applicable in future), or dedicated \+/- zoom buttons (perhaps in a corner control panel).  
* **Background:** A simple, non-distracting background (e.g., a very light solid color, a subtle dot grid, or a fine line grid) to aid in spatial awareness without cluttering the view.  
* **Project Context Display:**  
  * **Project Header:** Clearly display the **current project's name and description** at the top of the canvas area or in a persistent header bar.  
  * **Close Project Button:** The "Close Project" button resides in a main  navigation menu, leading the user to the main dashboard.

**2\. Snippet Element Appearance on Canvas:**

* **Shape & Style:** Each snippet appears as a distinct rectangular card-like element. The design should be clean and modern.  
* **Content Preview:**  
  * Displays the first 100 words of the snippet's text content directly on the card.  
  * If the snippet text is 100 words or less, the full text is visible, and the card sizes to fit.  
* **Expansion for Long Snippets:**  
  * If a snippet exceeds 100 words, an "..." button is visible on the snippet card.  
  * Clicking this button opens the snippet's full content in a **pop-up modal** for detailed viewing and editing.  
* **Snippet ID:**  
  * The unique alphanumeric **Snippet ID** is always visible on the snippet card itself, rendered in a **smaller, clear font** in the top right corner of the card. This allows users to easily identify and reference IDs for creating connections.  
* **Selection State:** Snippets should have a clear visual indication when selected (e.g., a highlighted border, a slight shadow change, or overlay).  
* **No Title Bar:** Snippets do not have a dedicated title bar.

**3\. Connection Representation:**

* **Lines:** Logical connections between snippets are represented by **straight or slightly curved lines** drawn directly between the edges or connection points of the respective snippet cards.  
* **Dynamic Updates:** Lines should dynamically adjust their start/end points if the connected snippets are moved on the canvas.

**4\. Interface Controls & Interaction:**

* **Main Canvas Toolbar/Palette:**  
  * A toolbar on the left provides quick access to common actions like:  
    * **"New Snippet" Button:** Clicking this would create a new, empty snippet card near the current view center, ready for text input.  
* **Snippet Interactions (when a snippet is selected or hovered):**  
  * **Move:** Click and drag a snippet to freely position it on the canvas.  
  * **Context Menu (Right-Click on Snippet):**  
    * Edit Snippet: Opens the snippet for editing (in-place for short snippets, or in the pop-up for long ones).  
    * Manage Connections: Opens the pop-up modal displaying a list of this snippet's current connections, allowing users to delete them. Also the place to initiate adding a new connection by typing an ID.  
    * Add/Edit Tags: Interface to add or modify tags for the snippet.  
    * Add/Edit Categories: Interface to add or modify categories for the snippet.  
    * Delete Snippet: Permanently removes the snippet (with confirmation).  
* **Creating Connections:**  
  * Select Snippet A.  
  * Invoke "Manage Connections" (e.g., via context menu or an icon on the selected snippet).  
  * In the connections modal, there would be an input field: "Connect to Snippet ID: \[input field\]".  
  * User types the Snippet ID of Snippet B into the field and confirms. A line then appears between Snippet A and Snippet B on the canvas.  
* **Managing Labels (for Connections):**  
  * When creating or editing a connection (likely within the "Manage Connections" modal), an interface to add or select a label for that specific connection. This could be a text input that allows auto-suggestion from previously used labels in that project.

**5\. Pop-up Modals:**

* **Long Snippet Editor:**  
  * Launched when expanding a long snippet.  
  * Provides a larger, scrollable text area for comfortable reading and editing of the full snippet content.  
  * Contains "Save" and "Cancel" buttons.  
* **Connection Manager Modal:**  
  * Launched from a snippet's context menu.  
  * Lists all current connections for the selected snippet (e.g., "Connected to: SnippetID\_XYZ (Label: 'explains')").  
  * Allows deletion of individual connections from this list.  
  * Contains the input field to type a Snippet ID to establish a new connection.  
  * Interface to add/edit the label for a new or existing connection.

**6\. UI/UX Considerations:**

* **Clarity & Readability:** Ensure text on snippets and IDs is legible at various zoom levels (or has a minimum legible size).  
* **Performance:** The canvas should remain responsive even with hundreds of snippets and connections. Virtualization techniques might be needed for rendering if performance becomes an issue (rendering only visible items).  
* **Feedback:** Provide clear visual feedback for all user actions (selection, hover, drag, successful connection).  
* **Discoverability:** Controls and actions should be intuitively discoverable.  
