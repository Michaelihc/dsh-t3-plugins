# Porting notes: T3 Code Sidebar V2

Upstream: https://github.com/pingdotgg/t3code (MIT, Copyright (c) 2026 T3 Tools Inc.), commit `4c8eb1dfd5`.
Lucide icon geometry: lucide-static 0.564.0 (ISC), the version T3 pins.

Tailwind classes are transcribed by hand into CSS modules with the same values; T3 theme
variables (`apps/web/src/index.css`) map to dsh tokens at the top of `src/client/t3/Sidebar.module.css`.
No Tailwind build step is used.

## Lifted files

| dsh file | Upstream path | What changed |
|---|---|---|
| `src/logic.ts` | `packages/client-runtime/src/state/threadSettled.ts`, `packages/contracts/src/settings.ts` (`DEFAULT_SNOOZE_PRESETS`), `apps/server/src/orchestration-v2/ThreadSettlementService.ts` (`isAutoSettlementCandidate`, `resolveAutoSettlementAt`), `packages/client-runtime/src/state/models.ts` (`formatWorkingDurationLabel`), `apps/web/src/timestampFormat.ts` (compact relative time) | Plain `Date` instead of `effect` DateTime; thread shells become `InboxSessionFacts`; failure and guest-message wakes dropped; preset settings fixed to T3's defaults |
| `src/client/view.ts` | `apps/web/src/components/Sidebar.tsx` (`partitionSidebarThreads`), `Sidebar.logic.ts` (`resolveSidebarThreadSection`, `resolveSidebarThreadStatus`, `shouldRecedeSidebarThread`), `packages/client-runtime/src/state/threadInbox.ts` (`sortInboxThreadsByReturn`, `sortWorkingThreadsBySend`, `isThreadWorking`), `threadSort.ts` (`sortSettledThreads`) | Statuses reduced to approval, input, working, waiting, ready; `shouldRecedeSidebarThread` has no `isSelected` (dsh has no multi-select) |
| `src/client/t3/ThreadRow.tsx` | `apps/web/src/components/sidebar/SidebarThreadRow.tsx` (`SidebarThreadRow` card and slim variants, `SnoozeMenuButton`, `ThreadRenameInput`, `SidebarThreadTooltip`, `TopStatusIcon`, `RelativeTimeLabel`, `WorkingDuration`), `ThreadHoverCard.tsx` | Base UI Tooltip/Menu become dsh `Tooltip`, `Menu`, `HoverCard`; drag, drafts, PR badges, terminals, provider stack, jump hints removed; labels tick only when their text changes |
| `src/client/model.ts` | `Sidebar.logic.ts` (`resolveSidebarRowThreadId`), `packages/client-runtime/src/state/threadShell.ts` (`isShownUnderParent`) | Lineage comes from the orchestrator's `t3Threads` facts |
| `src/client/t3/Sidebar.tsx` | `apps/web/src/components/Sidebar.tsx` (thread list, shelves, show more, empty states, project scope), `sidebar/SidebarThreadHeader.tsx`, `sidebar/SidebarListMarkers.tsx` (`SidebarSectionHeader`), `ui/collapsible-section-header.tsx` | Combobox scope picker becomes a dsh `Menu` (single select); search results render as slim rows |
| `src/client/t3/Chrome.tsx` | `sidebar/SidebarChrome.tsx` (`SidebarBrandMark`, `SidebarChromeFooter`), `sidebar/SidebarThreadUndoNotice.tsx` | Brand reads "DSH Harness"; the undo button reads "Undo"; the footer row also links the dsh global panels; a plugin-scoped stylesheet hides dsh's New Session button and panel list and compacts the logo row (Web only), keyed on `data-window-drag`, `data-sidebar-toggle` and `data-sidebar-scrollport` |
| `src/client/actions.ts` | `apps/web/src/hooks/showThreadUndoNotice.ts` | Same grouping and 5s expiry; failures use the dsh menu toast |
| `src/client/menu.ts` | `apps/web/src/components/threadActionMenu.logic.ts` (`buildThreadActionMenuItems`) | Items below removed; checked sub-items show a check icon |
| `src/client/CustomSnoozeDialog.tsx` | `apps/web/src/components/CustomSnoozeDialog.tsx` | dsh `Modal`, `SegmentedControl`, native date/time/number/select inputs |
| `src/client/t3/RelatedThreads.tsx` | `apps/web/src/components/chat/ThreadRelationshipsControl.tsx` (parent-thread and subagent rows, status labels) | Opens as a menu from the Session header's actions band |
| `src/client/t3/icons.tsx` | lucide-static 0.564.0 `icons/*.svg` | Inline SVG components |

## Forced deviations

- The dsh New Session button and panel list are hidden with plugin-scoped CSS rather than shadowed: they are not slots. Plugins and Automation tasks move to the footer utility row; the dsh Settings ("More") row stays at the foot.
- The collapse toggle stays at the right of the brand row, where the dsh shell places it.
- No back/forward history arrows: T3 shows them only in Electron, and the dsh brand row is itself a New Session button that cannot contain other controls.
- No Failed, Limited, Request, or Setting-up status: Harness Sessions do not report them. Waiting, and T3's subagent lineage, need the T3 orchestrator plugin: its `t3Threads` Host service reports each thread's `isListedThreadLineage`, parent, `blockedOnThreadWait` and whether background work holds it. Without that plugin no Session waits and none is hidden.
- The branch line reads the working directory's `.git/HEAD` through the Host (no worktree indicator or branch-mismatch warning). There is no environment machine line or remote-machine icon (one local Host), no handoff history, and no PR badges or PR-linked auto-settle (no PR data).
- The provider icon is the DeepSeek mark for DeepSeek routes and a generic sparkle otherwise; dsh has no per-provider icon set.
- Activity order and ages use the last prompt time and this browser's observed run completions (dsh lists no run timestamps).
- Project chip uses a folder glyph: Workspaces have no favicon.
- Working duration starts when this browser first sees the run (Sessions report no run start), so it restarts on reload.
- "Done" is T3's completed-after-last-visit rule over per-browser completion and visit marks (`localStorage`), plus the Client's own `completionUnread`.
- Woke visits are per browser (`localStorage`); Harness has no server-side last-visited marker.
- A pending question's time is when this browser first sees it, so "snoozed question stays snoozed" is judged from that.
- The Host sweep does not exclude pinned Sessions: pins live in the Workspace controller, which a plugin Host face cannot read.
- Menu: no "Find in thread", "New thread on branch", "Regenerate title", "Mark unread", "Share with guest", "Turn into project", "Copy > Branch / Thread", "Project settings", or "Delete": dsh has no equivalent operation.
- Custom snooze has no "Edit snooze options" button: snooze presets are not configurable.
- No drag and drop between sections, project folders ("boring" mode), drafts, or jump-hint badges.
- The hover card is the dsh dark `HoverCard` (500ms grace rules, 150ms open delay) instead of T3's glass tooltip.
- Undo uses Ctrl/Cmd+Z outside text fields with a plain "Undo" label; dsh has no `thread.undo` command binding.
- All browser copy is locale-owned: the `t3Inbox` dictionaries in `src/client/locales.ts` ship every dsh language, and `src/logic.ts` returns structured durations and preset names instead of English text. Relative times ("29m", "29分钟") and clock times come from `Intl` with each dictionary's `time.locale`. Terms follow dsh's vocabulary (Session, Workspace, subagent); settle is 已处理, while snooze and woke follow the community T3 zh-CN client. The brand mark stays "DSH Harness" in every language.
- Chinese and Japanese labels sit about 1px below the line-box centre that T3's flex centring uses, so `Sidebar.module.css` lowers the icon of a status pill, Woke button, wake label and the hover Settle control by 1px under `:lang(zh)` and `:lang(ja)`. Latin labels are unchanged.
- Related threads: T3 lists a thread's parent and subagents in its thread details panel and shows subagent cards in the timeline. dsh has neither surface for orchestrator threads, so the same rows open as a menu from the Session header's actions band; the parent breadcrumb is that menu's trigger in a subagent thread.
