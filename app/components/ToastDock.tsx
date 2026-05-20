"use client";

import { AlertTriangle, X } from "lucide-react";
import type { ApiFailure } from "@/lib/client/api";

export function ToastDock({ errors, dismissError }: { errors: ApiFailure[]; dismissError: (requestId: string) => void }) {
  if (!errors.length) return null;
  return (
    <div className="toastDock">
      {errors.map((error, index) => (
        <div key={error.requestId} className="toast" style={{ animationDelay: `${index * 60}ms` }}>
          <div className="toastBody">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <strong>
                <AlertTriangle size={15} /> {error.code}
              </strong>
              <button
                className="button buttonSecondary iconButton"
                style={{ width: 28, height: 28 }}
                onClick={() => dismissError(error.requestId)}
              >
                <X size={14} />
              </button>
            </div>
            <p className="hint">{error.message}</p>
            <div className="rowWrap">
              {error.action === "configure" && <span className="badge">去修改配置</span>}
              {error.action === "retry" && <span className="badge badgeSuccess">可重试</span>}
              <span className="badge">HTTP {error.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
