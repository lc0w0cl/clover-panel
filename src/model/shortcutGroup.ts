import Shortcut from "@/model/shortcut";

export interface ShortcutGroup {
    groupName: string;
    order: number;
    shortcuts: Shortcut[];
}