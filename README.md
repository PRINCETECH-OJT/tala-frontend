## ⚡ Getting Started

### Prerequisites

- **Node.js**: v18 or higher recommended.
- **Package Manager**: This project uses [pnpm](https://pnpm.io/). If you don't have it installed:
  ```bash
  npm install -g pnpm
  ```

### Installation

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/BahadeJ/tala-transaction-accounting-ledger-assistant.git](https://github.com/BahadeJ/tala-transaction-accounting-ledger-assistant.git)
    cd tala-transaction-accounting-ledger-assistant
    ```

2.  **Install dependencies:**
    Since `pnpm-lock.yaml` is present, use pnpm to ensure consistent versions.

    ```bash
    pnpm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory to configure your API connections.

    ```bash
    # Create .env file (Mac/Linux)
    cp .env.example .env

    # Or manually create a .env file and add:
    VITE_API_BASE_URL=http://localhost:8000/api
    ```

### Running the App

Start the development server with hot-reload:

````bash
pnpm dev

## 📂 Project Structure

This project follows a scalable Vue 3 structure, separating views (pages) from reusable components and business logic.

```text
src/
├── 📂 assets/          # Static assets like images, fonts, and global styles
├── 📂 components/      # Reusable UI building blocks
│   ├── ui/             # Atomic components (Buttons, Inputs, Cards)
│   └── ...             # Feature-specific blocks (e.g., LoginForm)
├── 📂 composables/     # Shared logic hooks (e.g., usePermission.ts)
├── 📂 lib/             # Core utilities (e.g., Tailwind class merger)
├── 📂 routes/          # Vue Router configuration (Page navigation)
├── 📂 services/        # API integration and Axios configuration
├── 📂 stores/          # State management (Pinia stores like auth.ts)
├── 📂 types/           # TypeScript interfaces and type definitions
├── 📂 utils/           # Generic helper functions
├── 📂 views/           # Main page views (Login, Register, Dashboard)
├── 📄 App.vue          # Root component
└── 📄 main.ts          # Application entry point
````
