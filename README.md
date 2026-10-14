# Gradex

Gradex is a student-focused academic intelligence demo designed to help learners and educators explore performance insights, study planning, and AI-assisted academic support.

## Features

- Dark, responsive interface with glassmorphism styling.
- Animated visual elements and scroll-based transitions.
- Interactive academic insight and planning demonstrations.
- Login/sign-up interface and role-oriented demo areas.
- Student and teacher-facing demo interactions.
- Gradex assistant interface.
- Separate HTML, CSS, and JavaScript files for easier editing.

> **Important:** This repository is a front-end demo. Do not treat displayed sample data or simulated assistant responses as real academic records or verified AI analysis. Review the authentication and data-handling code before using real student information.

## Project structure

```text
gradex/
├── index.html   # Page structure and content
├── style.css    # Styles, responsive layout, and animations
├── script.js    # UI interactions and demo logic
└── README.md    # Project documentation
```

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

For a more reliable local preview, use the **Live Server** extension in Visual Studio Code:
1. Open the project folder in VS Code.
2. Install **Live Server** if needed.
3. Right-click `index.html` and select **Open with Live Server**.

The page loads Google Fonts and third-party animation/3D libraries from their CDN URLs, so those features require an internet connection.

## Deploy on GitHub Pages

1. Create a GitHub repository, for example `gradex`.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. The published URL will appear in the Pages settings.

## Customization

- Edit the page content and structure in `index.html`.
- Change colors, spacing, layout, and animation styles in `style.css`.
- Update interactive behavior in `script.js`.

## Supabase integration

This project includes Supabase auth and storage hooks for the Gradex login flow. See [SUPABASE.md](./SUPABASE.md) for the setup steps, required tables, and row-level security rules.

## Security and production notes

- This is a static front-end project; client-side UI is not secure authentication by itself.
- Connect a trusted backend/auth provider before using real accounts.
- Never place service-role keys, database passwords, or other secrets in client-side JavaScript.
- Use fictional/sample records for demonstrations and obtain appropriate permission before handling student data.

## License

No license has been specified yet. Add a license file before granting others explicit reuse permissions.
