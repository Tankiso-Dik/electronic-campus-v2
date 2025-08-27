// app/layout.js
import './globals.css'; // Import your global CSS
import PdfDetoxWidget from './components/PdfDetoxWidget';

export const metadata = {
  title: 'Electronic Campus',
  description: 'Electronic Campus - Static Display with OpenRouter Chatbot',
};

export default function RootLayout({ children }) {
  return (
      <html lang="en">
      <head>
        {/* Your Google Analytics script - use dangerouslySetInnerHTML for raw script */}
        {/* Note: Your original HTML does not include the GA script. If you want it, add it here. */}
        {/*
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-1HSQYYM22K"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-1HSQYYM22K');
            `,
          }}
        />
        */}
      </head>
      <body className="Xbody" style={{ backgroundColor: '#4d73bf', color: '#ffffff' }}>
      {children} {/* This is where your page content will be rendered */}
      <PdfDetoxWidget />
      </body>
      </html>
  );
}
