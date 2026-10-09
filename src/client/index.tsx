import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { HeatmapView } from "./HeatmapView.js";
import { HeatmapModal } from "./HeatmapModal.js";

export const name = "dsh-plugin-token-heatmap-client";
export const inject = ["slots"];

export function apply(ctx: any) {
  // 1. Register under Settings -> "Token Heatmap"
  if (ctx.slots && typeof ctx.slots.inject === "function") {
    ctx.slots.inject("settings.section", () => {
      return ctx.slots.register(
        {
          name: "settings.section",
          id: "token-heatmap",
          order: 14,
          label: () => "Token Heatmap",
          icon: "chart",
        },
        HeatmapView
      );
    });
  }

  // 2. Global Modal Host & In-Session Token Meter Integration
  if (typeof document !== "undefined") {
    const modalContainer = document.createElement("div");
    modalContainer.id = "dsh-token-heatmap-modal-root";
    document.body.appendChild(modalContainer);

    const root = createRoot(modalContainer);

    function ModalController() {
      const [isOpen, setIsOpen] = useState(false);

      useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        const handleClose = () => setIsOpen(false);

        window.addEventListener("dsh:open-token-heatmap", handleOpen);
        window.addEventListener("keydown", (e) => {
          if (e.key === "Escape") handleClose();
        });

        return () => {
          window.removeEventListener("dsh:open-token-heatmap", handleOpen);
        };
      }, []);

      return <HeatmapModal open={isOpen} onClose={() => setIsOpen(false)} />;
    }

    root.render(<ModalController />);

    // 3. Observe DOM for in-session token usage dialog to attach "View Heatmap" button
    const observer = new MutationObserver(() => {
      // Find the open session stats dialog
      const statDialogs = document.querySelectorAll(
        'div[role="dialog"][aria-label*="usage" i], div[role="dialog"][aria-label*="Token" i], [data-session-stats-usage]'
      );

      statDialogs.forEach((dialog) => {
        if (dialog.querySelector(".dsh-heatmap-trigger-btn")) return;

        const button = document.createElement("button");
        button.className = "dsh-heatmap-trigger-btn";
        button.type = "button";
        button.innerHTML = "<span>View 12-Month Activity Heatmap →</span>";
        button.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: 12px;
          padding: 8px 12px;
          background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12));
          border: 1px solid var(--dsw-alias-border-l2, #494949);
          border-radius: 8px;
          color: var(--dsw-alias-brand-primary, #6366f1);
          font-size: 12px;
          font-weight: 550;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        `;
        button.onmouseenter = () => {
          button.style.background = "var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.2))";
          button.style.borderColor = "var(--dsw-alias-brand-primary, #6366f1)";
        };
        button.onmouseleave = () => {
          button.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12))";
          button.style.borderColor = "var(--dsw-alias-border-l2, #494949)";
        };
        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("dsh:open-token-heatmap"));
        };

        dialog.appendChild(button);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}
