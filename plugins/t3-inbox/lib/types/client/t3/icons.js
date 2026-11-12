import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
function icon(name, children) {
    function LucideIcon(props) {
        return (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": props['aria-label'] === undefined ? true : undefined, "data-lucide": name, ...props, children: children }));
    }
    LucideIcon.displayName = name;
    return LucideIcon;
}
export const BotIcon = icon('bot', _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 8V4H8" }), _jsx("rect", { width: "16", height: "12", x: "4", y: "8", rx: "2" }), _jsx("path", { d: "M2 14h2" }), _jsx("path", { d: "M20 14h2" }), _jsx("path", { d: "M15 13v2" }), _jsx("path", { d: "M9 13v2" })] }));
export const CornerLeftUpIcon = icon('corner-left-up', _jsxs(_Fragment, { children: [_jsx("path", { d: "M14 9 9 4 4 9" }), _jsx("path", { d: "M20 20h-7a4 4 0 0 1-4-4V4" })] }));
export const CircleDotDashedIcon = icon('circle-dot-dashed', _jsxs(_Fragment, { children: [_jsx("path", { d: "M10.1 2.18a9.93 9.93 0 0 1 3.8 0" }), _jsx("path", { d: "M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7" }), _jsx("path", { d: "M21.82 10.1a9.93 9.93 0 0 1 0 3.8" }), _jsx("path", { d: "M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69" }), _jsx("path", { d: "M13.9 21.82a9.94 9.94 0 0 1-3.8 0" }), _jsx("path", { d: "M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7" }), _jsx("path", { d: "M2.18 13.9a9.93 9.93 0 0 1 0-3.8" }), _jsx("path", { d: "M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69" }), _jsx("circle", { cx: "12", cy: "12", r: "1" })] }));
export const CircleDashedIcon = icon('circle-dashed', _jsxs(_Fragment, { children: [_jsx("path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0" }), _jsx("path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0" }), _jsx("path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7" }), _jsx("path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8" }), _jsx("path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69" }), _jsx("path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8" }), _jsx("path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69" }), _jsx("path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7" })] }));
export const MessageCircleQuestionIcon = icon('message-circle-question-mark', _jsxs(_Fragment, { children: [_jsx("path", { d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" }), _jsx("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }), _jsx("path", { d: "M12 17h.01" })] }));
export const ShieldQuestionIcon = icon('shield-question-mark', _jsxs(_Fragment, { children: [_jsx("path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }), _jsx("path", { d: "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" }), _jsx("path", { d: "M12 17h.01" })] }));
export const CircleCheckIcon = icon('circle-check', _jsxs(_Fragment, { children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "m9 12 2 2 4-4" })] }));
export const AlarmClockIcon = icon('alarm-clock', _jsxs(_Fragment, { children: [_jsx("circle", { cx: "12", cy: "13", r: "8" }), _jsx("path", { d: "M12 9v4l2 2" }), _jsx("path", { d: "M5 3 2 6" }), _jsx("path", { d: "m22 6-3-3" }), _jsx("path", { d: "M6.38 18.7 4 21" }), _jsx("path", { d: "M17.64 18.67 20 21" })] }));
export const AlarmClockOffIcon = icon('alarm-clock-off', _jsxs(_Fragment, { children: [_jsx("path", { d: "M6.87 6.87a8 8 0 1 0 11.26 11.26" }), _jsx("path", { d: "M19.9 14.25a8 8 0 0 0-9.15-9.15" }), _jsx("path", { d: "m22 6-3-3" }), _jsx("path", { d: "M6.26 18.67 4 21" }), _jsx("path", { d: "m2 2 20 20" }), _jsx("path", { d: "M4 4 2 6" })] }));
export const Undo2Icon = icon('undo-2', _jsxs(_Fragment, { children: [_jsx("path", { d: "M9 14 4 9l5-5" }), _jsx("path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" })] }));
export const CheckIcon = icon('check', _jsx("path", { d: "M20 6 9 17l-5-5" }));
export const ClockIcon = icon('clock', _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 6v6l4 2" }), _jsx("circle", { cx: "12", cy: "12", r: "10" })] }));
export const SquarePenIcon = icon('square-pen', _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" })] }));
export const FolderPlusIcon = icon('folder-plus', _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 10v6" }), _jsx("path", { d: "M9 13h6" }), _jsx("path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" })] }));
export const FolderIcon = icon('folder', _jsx("path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }));
export const SearchIcon = icon('search', _jsxs(_Fragment, { children: [_jsx("path", { d: "m21 21-4.34-4.34" }), _jsx("circle", { cx: "11", cy: "11", r: "8" })] }));
export const XIcon = icon('x', _jsxs(_Fragment, { children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
export const ListFilterIcon = icon('list-filter', _jsxs(_Fragment, { children: [_jsx("path", { d: "M2 5h20" }), _jsx("path", { d: "M6 12h12" }), _jsx("path", { d: "M9 19h6" })] }));
export const ChevronDownIcon = icon('chevron-down', _jsx("path", { d: "m6 9 6 6 6-6" }));
export const ArrowLeftIcon = icon('arrow-left', _jsxs(_Fragment, { children: [_jsx("path", { d: "m12 19-7-7 7-7" }), _jsx("path", { d: "M19 12H5" })] }));
export const ArrowRightIcon = icon('arrow-right', _jsxs(_Fragment, { children: [_jsx("path", { d: "M5 12h14" }), _jsx("path", { d: "m12 5 7 7-7 7" })] }));
export const PinIcon = icon('pin', _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 17v5" }), _jsx("path", { d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" })] }));
export const PinOffIcon = icon('pin-off', _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 17v5" }), _jsx("path", { d: "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" }), _jsx("path", { d: "m2 2 20 20" }), _jsx("path", { d: "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" })] }));
export const GitBranchIcon = icon('git-branch', _jsxs(_Fragment, { children: [_jsx("path", { d: "M15 6a9 9 0 0 0-9 9V3" }), _jsx("circle", { cx: "18", cy: "6", r: "3" }), _jsx("circle", { cx: "6", cy: "18", r: "3" })] }));
export const SparkleIcon = icon('sparkle', _jsx("path", { d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" }));
export const PencilIcon = icon('pencil', _jsxs(_Fragment, { children: [_jsx("path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }), _jsx("path", { d: "m15 5 4 4" })] }));
export const FolderTreeIcon = icon('folder-tree', _jsxs(_Fragment, { children: [_jsx("path", { d: "M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" }), _jsx("path", { d: "M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" }), _jsx("path", { d: "M3 5a2 2 0 0 0 2 2h3" }), _jsx("path", { d: "M3 3v13a2 2 0 0 0 2 2h3" })] }));
export const TimerIcon = icon('timer', _jsxs(_Fragment, { children: [_jsx("line", { x1: "10", x2: "14", y1: "2", y2: "2" }), _jsx("line", { x1: "12", x2: "15", y1: "14", y2: "11" }), _jsx("circle", { cx: "12", cy: "14", r: "8" })] }));
export const CopyIcon = icon('copy', _jsxs(_Fragment, { children: [_jsx("rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }), _jsx("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" })] }));
export const HashIcon = icon('hash', _jsxs(_Fragment, { children: [_jsx("line", { x1: "4", x2: "20", y1: "9", y2: "9" }), _jsx("line", { x1: "4", x2: "20", y1: "15", y2: "15" }), _jsx("line", { x1: "10", x2: "8", y1: "3", y2: "21" }), _jsx("line", { x1: "16", x2: "14", y1: "3", y2: "21" })] }));
export const ArchiveIcon = icon('archive', _jsxs(_Fragment, { children: [_jsx("rect", { width: "20", height: "5", x: "2", y: "3", rx: "1" }), _jsx("path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }), _jsx("path", { d: "M10 12h4" })] }));
/**
 * A context-menu glyph at the menu's 16px icon size.
 * @param Component - Lucide icon.
 * @returns component for the `contextMenu.icon` slot.
 */
export function menuIcon(Component) {
    return function MenuIcon() {
        return _jsx(Component, { width: 16, height: 16 });
    };
}
//# sourceMappingURL=icons.js.map