import type { InboxActions } from '../actions.ts';
import { type InboxTranslate } from '../format.ts';
import { type InboxRow } from '../view.ts';
/** What a row needs from its sidebar. */
export interface ThreadRowProps {
    readonly row: InboxRow;
    readonly variant: 'card' | 'slim';
    readonly isActive: boolean;
    readonly isRenaming: boolean;
    readonly actions: InboxActions;
    readonly t: InboxTranslate;
    readonly onContextMenu: (row: InboxRow, point: {
        x: number;
        y: number;
    }) => void;
    readonly onStartRename: (row: InboxRow) => void;
    readonly onCancelRename: () => void;
    /** Search results render each row as a listbox option. */
    readonly option?: {
        readonly id: string;
        readonly selected: boolean;
        readonly onHighlight: () => void;
    };
}
/**
 * Render one thread row.
 * @param props - row data, variant, selection, and commands.
 * @returns the list item.
 */
export declare const ThreadRow: import("react").MemoExoticComponent<(props: ThreadRowProps) => import("react").JSX.Element>;
//# sourceMappingURL=ThreadRow.d.ts.map