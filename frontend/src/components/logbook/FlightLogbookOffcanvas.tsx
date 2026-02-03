'use client';

interface FlightLogbookOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  missionData?: any;
}

export default function FlightLogbookOffcanvas({
  isOpen,
  onClose,
  missionData,
}: FlightLogbookOffcanvasProps) {
  return (
    <div
      className={`offcanvas offcanvas-end ${isOpen ? 'show' : ''}`}
      tabIndex={-1}
      style={{ visibility: isOpen ? 'visible' : 'hidden' }}
    >
      <div className="offcanvas-header">
        <h5 className="m-0">Operation Logbook</h5>
        <button
          type="button"
          className="btn-close text-reset"
          onClick={onClose}
          aria-label="Close"
        />
      </div>
      <div className="offcanvas-body">
        {missionData ? (
          <div>
            {/* Mission details content */}
            <p>Mission details will be displayed here</p>
          </div>
        ) : (
          <p>Select a mission to view details</p>
        )}
      </div>
    </div>
  );
}