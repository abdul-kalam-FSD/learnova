import { useState } from "react";
export function useLeaveConfirmation(onConfirmedLeave) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return {
    confirmOpen,
    requestLeave: () => setConfirmOpen(true),
    cancelLeave: () => setConfirmOpen(false),
    confirmLeave: () => {
      setConfirmOpen(false);
      onConfirmedLeave();
    },
  };
}