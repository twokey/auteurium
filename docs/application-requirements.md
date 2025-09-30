## **Application Requirements Document: The Snippet App**

**1\. General Application Overview & Goals:**

* **Core Concept:** A web application enabling users to create text snippets, visually organize them on a canvas within projects, and establish logical, many-to-many connections between these snippets. Each snippet can have two text fileds and attached media (picture, video, sound).
* **Primary Goal:** Allow users to externalize thoughts, notes, or pieces of information as distinct snippets and then map out relationships between them to build understanding or structure larger pieces of content.  
* **Key Analogy:** User interface and interaction for the canvas can draw inspiration from apps like Google Jamboard, Miro, FigJam, and Figma.  
* **Target Platform:** Web application.  
* **Frontend Technology:** React.
* **Backend Technology:** AWS, AWS CDK, TypeScript
* **Organization** Monorepo on github

**2\. User Roles & Authentication:**

* **2.1. Standard User:**  
  * **Registration:** Self-registration using email and password.  
    * Information stored: Name, email, password (hashed).  
    * *Future:* Social media login (e.g., Google, Facebook), email confirmation.  
  * **Login/Logout:** Standard authentication.  
  * **Password Reset:** Users can request a password reset via an email link.  
  * **Functionality:** Can perform all project, snippet, connection, tag, and category management tasks for their own data as described below. All data created by a user is private to that user.  
* **2.2. Admin User:**  
  * **Access:** Separate login or elevated privileges.  
  * **User Management:**  
    * Can manage self-registered user accounts (e.g., view list of users, delete user accounts, initiate password reset for a user).  
    * Can create new user accounts, providing an initial password. Users created this way **must be required to change their password upon first login.**  
  * **System Analytics:** Can access system-level analytics (e.g., total number of users, number of snippets per user, average size of snippets).  
  * **Privacy Constraint:** Admins **cannot** access or view the content of users' private text snippets.  
  * *Future:* More granular permissions, advanced analytics.

**3\. Project Management:**

* **3.1. Project Creation:**  
  * Users can create new projects via a "New Project" button, located in a user dashboard.  
  * Creating a new project opens a clear, empty canvas for that project.  
  * Each project has an editable **Name** and **Description**.  
  * **Creation Date** and **Last Modified Date** are automatically stored for each project.  
* **3.2. Project Organization & Access:**  
  * Users can have multiple projects.  
  * A list of a user's projects is provided in the user dashboard.  
  * Users can open and switch between from dashboard.  
* **3.3. Project Scope:**  
  * Snippets are **exclusive** to a single project.  
  * Tags, connection labels, and categories are **specific to the project** they are created in.  
    * *Future:* Option for global tags, labels, and categories across a user's projects.  
* **3.4. Initial User Experience:**  
  * Brand new user has a dashboard with empty list of projects.  
  * When a returning user logs in, dashboard with the list of available projects is open so user can open required project.  
* **3.5. Deleting Projects:**  
  * Users can delete projects. 
  * Deletion is permanent and will also permanently delete all snippets contained within that project (a confirmation prompt should be shown).  
  * *Future:* Soft delete for projects (recoverable for a period).

**4\. Snippet Management:**

* **4.1. Snippet Creation & Content:**  
  * Users can create new snippets (e.g., via a "New Snippet" button on the project canvas).  
  * Snippets contain two text fields with plain text. Each field can be empty.  There are no hard limits on length, but they are expected to be up to a page long.
  * Snippets do not require a title.  
  * *Future:* Snippets can have media associated with them (image, video or sound) not embedded within the text.
  * *Future:* Rich text formatting.  
* **4.2. Snippet Display on Canvas:**  
  * Snippets are displayed as distinct elements on a canvas-like interface within a project.  
  * Users can freely position (drag and drop) snippets on the canvas.  
  * The canvas supports zooming and panning.  
  * The size of a snippet element on the canvas initially adapts to its text content.  
  * **Large Snippet Handling:** If a snippet's content exceeds 100 words, it should be displayed in a minimized state on the canvas (showing the first 100 words). A button or control on the snippet element should allow the user to expand it into a pop-up modal for full viewing and editing.  
  * A unique alphanumeric **Snippet ID** must be clearly visible directly on each snippet element on the canvas (using a smaller font).  
* **4.3. Snippet Operations:**  
  * **Editing:** Snippets can be edited (text content). Editing of long snippets happens in the pop-up modal.  
  * **Deletion:** Snippets can be deleted. Deletion is permanent.  
    * *Future* Soft delete for individual snippets.  
  * **Version History:** Snippets will have a version history.  
    * Users can view previous versions.  
    * Each version should store the timestamp of its creation.  
    * A simple selector (e.g., "Latest," "Previous," "Version \-2") should allow users to navigate and view versions.  
    * Users should be able to revert a snippet to a previous version.

**5\. Connection Management:**

* **5.1. Nature of Connections:**  
  * Connections represent a logical relationship between two snippets.  
  * Connections are **many-to-many**.  
  * Connections are **directional** If A is connected to B, then the content of B depends on content of A but not vice versa.  
* **5.2. Creating Connections:**  
  * To create a connection, a user types the Snippet ID of one snippet into a designated field associated with another snippet.
  * Drag-and-drop interface to create connections between snippets on the canvas.  
* **5.3. Connection Labels:**  
  * Connections can have **tagss** (e.g., "explains," "supports," "related to").  
  * Connection tags are free-form text, defined by the user.  
  * The system should allow users to reuse previously created labels within the same project (similar to how tags work).  
  * Connection labels are **not** required to be displayed directly on the connecting lines on the canvas in the initial version but will be used for application logic.    
* **5.4. Visualizing Connections:**  
  * Direct connections between snippets are visualized on the canvas as lines drawn between the connected snippet elements.  
* **5.5. Managing Connections:**  
  * Users can delete existing connections.  
  * This is done via a pop-up modal that lists the connections for a selected snippet, allowing the user to choose which connection(s) to remove.

**6\. Tags and Categories:**

* **6.1. Tags:**  
  * Snippets can have multiple user-defined **tags**.  
  * Tags are free-form text.  
  * Tags are created and managed by the user within the scope of a single project.  
* **6.2. Categories:**  
  * Snippets can belong to multiple user-defined **categories**.  
  * Categories are free-form text.  
  * Categories are created and managed by the user within the scope of a single project.
  * *Future:* Search/filter/organize on canvas snippets by tags and categories.  
  * *Future:* Option for global tags/categories usable across all of a user's projects.

**7\. Non-Functional Requirements:**

* **7.1. User Interface & Experience (UI/UX):**  
  * The canvas interface should be intuitive, allowing easy manipulation (positioning, zooming, panning) of snippets.  
  * Responsiveness of the canvas during user interactions (pan, zoom, drag) is important.  
* **7.2. Performance:**  
  * Initial load time of the canvas is less critical than its interactive responsiveness.  
  * The application should comfortably handle thousands of users, with each user potentially having several hundred snippets per project. Snippets are typically a few sentences but can be up to a few pages long.  
* **7.3. Scalability:**  
  * The backend architecture should be designed with scalability in mind to accommodate the target number of users and data.  
* **7.4. Security:**  
  * Standard security practices for user authentication, password storage (hashing), and data privacy.  
  * Adherence to the admin privacy constraint (no access to snippet content).  
* **7.5. Database:**  
  * A vector database is preferred to organize connections between snippets.  
* **7.6. Frontend Framework:**  
  * **React**. Preference for libraries/tools that are well-supported by the community.
  **7.7. Backend:**  
  * AWS.  
* **7.7. Offline Access:**  
  * No offline access is required for the initial version.  
* **7.8. Search:**  
  * No search functionality is required for the initial MVP.  
  * *Future:* Search snippets by content, date, tags, and categories.

**8\. Future Considerations (Explicitly Out of Scope for Initial MVP):**

* Social media logins and email confirmation for user registration.  
* Multi-Factor Authentication (MFA).  
* Support for attaching rich media (images, sound, video) to snippets.  
* Rich text formatting within snippets.  
* Soft delete for individual snippets and projects.  
* Global tags, categories, and connection labels across a user's projects.  
* Advanced search functionality (content, date, tags, categories).  
* Drag-and-drop interface for creating snippet connections.  
* Defined application logic based on connection tags (e.g., for combining content).  
* More advanced admin analytics and user management features.

**9\. Guidance for LLM Interaction:**

* The user will act as the Product Manager.  
* The LLM is expected to assist with:  
  * Generating code for specific features.  
  * Suggesting database schemas (for the chosen NoSQL database).  
  * Helping design the UI/UX based on these requirements.  
  * Writing test cases.
  * Providing architectural recommendations for both frontend and backend.