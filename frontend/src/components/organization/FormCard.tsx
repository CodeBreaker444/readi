'use client';

import { ReactNode, useState } from 'react';

interface FormCardProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function FormCard({ title, children, defaultOpen = false }: FormCardProps) {
  const [isVisible, setIsVisible] = useState(defaultOpen);

  return (
    <div className="card mt-2">
      <div className="card-header">
        <div className="row align-items-center">
          <div className="col">
            <h4 className="card-title">{title}</h4>
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => setIsVisible(!isVisible)}
            >
              <i className="las la-compress-arrows-alt"></i> show/hide
            </button>
          </div>
        </div>
      </div>
      {isVisible && (
        <div className="card-body">
          {children}
        </div>
      )}
    </div>
  );
}