import { AnimatePresence, motion } from "motion/react";
import { useAppStore } from "../store/useAppStore";

/** Confirmation toast with Undo — aria-live so screen readers hear it. */

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const clearToast = useAppStore((s) => s.clearToast);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm shadow-xl"
          >
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  clearToast();
                }}
                className="font-semibold text-primary hover:underline"
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
