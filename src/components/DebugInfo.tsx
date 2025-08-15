import React from 'react';

interface DebugInfoProps {
  title: string;
  data: any;
}

export function DebugInfo({ title, data }: DebugInfoProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-md">
      <h4 className="font-bold text-yellow-400">{title}</h4>
      <pre className="mt-2 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
