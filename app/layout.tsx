import { Inter } from "next/font/google";
import "./globals.css";
import Warnings from "./components/warnings";
import { assistantId } from "./assistant-config";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
});

export const metadata = {
  title: "Assistants API Quickstart",
  description: "A quickstart template using the Assistants API with OpenAI",
  icons: {
    icon: "/openai.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/openai.svg" />
      </head>
      <body className={inter.className}>
        <main>
          {assistantId ? children : <Warnings />}
        </main>
        <img className="logo" src="/openai.svg" alt="OpenAI Logo" />
      </body>
    </html>
  );
}
