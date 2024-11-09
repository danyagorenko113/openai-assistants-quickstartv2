import "./globals.css";
import Warnings from "./components/warnings";
import { assistantId } from "./assistant-config";

export const metadata = {
  title: "Hospital for Special Surgery Virtual Assistant",
  description: "A virtual assistant for Hospital for Special Surgery using the OpenAI Assistants API",
  icons: {
    icon: "/HSS_logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <link rel="icon" href="/HSS_logo.png" />
      </head>
      <body>
        <div className="app-container">
          {assistantId ? children : <Warnings />}
        </div>
      </body>
    </html>
  );
}
