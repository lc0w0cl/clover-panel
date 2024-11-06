import { Shortcut } from "@/model/shortcut";

export interface ShortcutGroup {
    id: string,
    groupName: string;
    order: number;
    shortcuts: Shortcut[];
}