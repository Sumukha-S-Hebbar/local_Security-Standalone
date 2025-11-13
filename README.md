# Security Module UI

This is a NextJS starter project for GlobalGuard, a security management application. It includes two user portals: Agency and TOWERCO/MNO.

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (version 20 or later) and a package manager like `npm` or `yarn` installed on your system.

### 1. Installation

First, install the project dependencies using `npm`:

```bash
npm install
```

### 2. Set Up Environment Variables

The project uses environment variables to manage configuration, such as API endpoints.

1.  Create a new file named `.env` in the root of the project.
2.  Copy the contents from `.env.example` into your new `.env` file.
3.  Replace the placeholder values with your actual API URLs. For example:

    ```env
    # Example for your Django API
    DJANGO_API_URL=http://127.0.0.1:8000/api
    ```

Any variables you add to this `.env` file will be automatically available within the application.

### 3. Running the Development Server

To start the Next.js development server, run the following command:

```bash
npm run dev
```

This will start the application, typically on `http://localhost:9002`. Open this URL in your web browser to see the application. The server will automatically reload when you make changes to the code.
