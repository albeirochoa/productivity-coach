/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: "#0a0e27",
                card: "rgba(26, 31, 58, 0.8)",
                momentum: "#ff6b35",
                success: "#4ecdc4",
                alert: "#ffe66d",
            }
        },
    },
    plugins: [],
}
