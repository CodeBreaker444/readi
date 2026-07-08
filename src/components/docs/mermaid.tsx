'use client';

import React from 'react';

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // Dynamically import mermaid only on client side
    const loadMermaid = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
        });
      } catch (e) {
        console.error('Failed to load mermaid:', e);
        setError(true);
      }
    };

    loadMermaid();
  }, []);

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded">
        <p className="text-red-600">Failed to load Mermaid diagram</p>
      </div>
    );
  }

  return (
    <div className="mermaid">
      {chart}
    </div>
  );
};
