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

    // 3. Observe DOM for in-session token usage dialog: strictly single button
    const observer = new MutationObserver(() => {
      // Find the dl with data-session-stats-usage
      const usageList = document.querySelector('[data-session-stats-usage]');
      if (!usageList) return;

      const dialogContainer = usageList.closest('div[role="dialog"]') || usageList.parentElement;
      if (!dialogContainer) return;

      // Strictly ensure only one button is ever attached
      if (dialogContainer.querySelector(".dsh-heatmap-trigger-btn") || document.querySelector(".dsh-heatmap-trigger-btn")) {
        return;
      }

      const button = document.createElement("button");
      button.className = "dsh-heatmap-trigger-btn";
      button.type = "button";
      button.innerHTML = "<span>View Token Usage Heatmap →</span>";
      button.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(51, 109, 250, 0.12);
        border: 1px solid rgba(51, 109, 250, 0.35);
        border-radius: 8px;
        color: #4f85ff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 0 14px rgba(51, 109, 250, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        transition: all 0.15s ease;
      `;
      button.onmouseenter = () => {
        button.style.background = "rgba(51, 109, 250, 0.22)";
        button.style.borderColor = "#336dfa";
        button.style.boxShadow = "0 0 20px rgba(79, 133, 255, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
      };
      button.onmouseleave = () => {
        button.style.background = "rgba(51, 109, 250, 0.12)";
        button.style.borderColor = "rgba(51, 109, 250, 0.35)";
        button.style.boxShadow = "0 0 14px rgba(51, 109, 250, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)";
      };
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Try navigating to Settings -> Token Heatmap
        const settingsTrigger = document.querySelector(
          'button[aria-label*="Setting" i], [data-sidebar-settings] button, button.settings'
        );

        if (settingsTrigger) {
          (settingsTrigger as HTMLElement).click();
          setTimeout(() => {
            const heatmapTab = Array.from(document.querySelectorAll("*")).find(
              (el) =>
                el.textContent?.trim() === "Token Heatmap" &&
                (el.tagName === "BUTTON" || el.tagName === "DIV" || el.getAttribute("role") === "tab" || el.classList.contains("ant-list-item"))
            );
            if (heatmapTab) {
              (heatmapTab as HTMLElement).click();
            } else {
              window.dispatchEvent(new CustomEvent("dsh:open-token-heatmap"));
            }
          }, 120);
        } else {
          // Open direct interactive modal
          window.dispatchEvent(new CustomEvent("dsh:open-token-heatmap"));
        }
      };

      dialogContainer.appendChild(button);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}
