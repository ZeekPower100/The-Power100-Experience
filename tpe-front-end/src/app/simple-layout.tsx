import React from 'react';

interface SimpleLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function SimpleLayout({ children, title }: SimpleLayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>{title || 'Power100 Experience'}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{
          __html: `
            body { 
              margin: 0; 
              font-family: system-ui, -apple-system, sans-serif; 
              background-color: #f8f9fa;
            }
            * { 
              box-sizing: border-box; 
            }
          `
        }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}